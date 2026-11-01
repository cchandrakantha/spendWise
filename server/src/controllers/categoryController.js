
const { Op, fn, col } = require("sequelize");

const {
  Category,
  Transaction,
  Budget,
} = require("../models");

// Get all active categories
const getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: { isActive: true },
      order: [["categoryType", "ASC"], ["categoryName", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error("Get categories error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};

// Get one category with the authenticated user's transaction totals
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category || !category.isActive) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const transactions = await Transaction.findAll({
      where: {
        userId: req.user.userId,
        categoryId: category.categoryId,
        status: "COMPLETED",
      },
      attributes: [
        [fn("COUNT", col("transaction_id")), "transactionCount"],
        [fn("SUM", col("amount")), "totalAmount"],
      ],
      raw: true,
    });

    return res.status(200).json({
      success: true,
      category,
      summary: {
        transactionCount: Number(transactions[0].transactionCount || 0),
        totalAmount: Number(transactions[0].totalAmount || 0),
      },
    });
  } catch (error) {
    console.error("Get category error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch category details",
    });
  }
};

// Get transactions belonging to one category
const getCategoryTransactions = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category || !category.isActive) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);

    const { count, rows } = await Transaction.findAndCountAll({
      where: {
        userId: req.user.userId,
        categoryId: category.categoryId,
      },
      limit,
      offset: (page - 1) * limit,
      order: [["transactionDate", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      category: category.categoryName,
      pagination: {
        totalRecords: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        limit,
      },
      transactions: rows,
    });
  } catch (error) {
    console.error("Get category transactions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch category transactions",
    });
  }
};

// Get category-wise spending summary
const getCategorySummary = async (req, res) => {
  try {
    const spending = await Transaction.findAll({
      attributes: [
        "categoryId",
        [fn("COUNT", col("transaction_id")), "transactionCount"],
        [fn("SUM", col("amount")), "totalAmount"],
      ],
      where: {
        userId: req.user.userId,
        transactionType: "EXPENSE",
        status: "COMPLETED",
        categoryId: { [Op.ne]: null },
      },
      include: [
        {
          model: Category,
          attributes: ["categoryName", "categoryType"],
          where: { isActive: true },
        },
      ],
      group: ["categoryId", "Category.category_id"],
      raw: true,
    });

    const summary = spending.map((item) => ({
      categoryId: item.categoryId,
      categoryName: item["Category.categoryName"],
      transactionCount: Number(item.transactionCount),
      totalAmount: Number(item.totalAmount || 0),
    }));

    const totalSpending = summary.reduce(
      (sum, item) => sum + item.totalAmount,
      0
    );

    return res.status(200).json({
      success: true,
      totalSpending,
      categories: summary.sort(
        (a, b) => b.totalAmount - a.totalAmount
      ),
    });
  } catch (error) {
    console.error("Category summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to calculate category summary",
    });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  getCategoryTransactions,
  getCategorySummary,
};
