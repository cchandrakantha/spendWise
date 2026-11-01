
const { Op, fn, col } = require("sequelize");
const {
  Budget,
  Category,
  Transaction,
} = require("../models");

// Create a budget for the authenticated user
const createBudget = async (req, res) => {
  try {
    const { categoryId, year, month, budgetAmount } = req.body;

    // Validate required fields
    if (
      !categoryId ||
      year === undefined ||
      month === undefined ||
      budgetAmount === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Category, year, month and budget amount are required",
      });
    }

    const parsedYear = Number(year);
    const parsedMonth = Number(month);
    const parsedAmount = Number(budgetAmount);

    if (
      !Number.isInteger(parsedYear) ||
      parsedYear < 2000 ||
      parsedYear > 2100 ||
      !Number.isInteger(parsedMonth) ||
      parsedMonth < 1 ||
      parsedMonth > 12 ||
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0 ||
      Math.round(parsedAmount * 100) !== parsedAmount * 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid year, month and positive budget amount with at most two decimal places",
      });
    }

    // Verify active expense category
    const category = await Category.findOne({
      where: {
        categoryId,
        categoryType: "EXPENSE",
        isActive: true,
      },
    });

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid active expense category",
      });
    }

    // Check for an existing budget
    const existingBudget = await Budget.findOne({
      where: {
        userId: req.user.userId,
        categoryId,
        year: parsedYear,
        month: parsedMonth,
      },
    });

    if (existingBudget) {
      return res.status(409).json({
        success: false,
        message: "A budget already exists for this category and month",
      });
    }

    const budget = await Budget.create({
      budgetId: `BUD-${req.user.userId}-${parsedYear}-${String(parsedMonth).padStart(2, "0")}-${categoryId}`,
      userId: req.user.userId,
      categoryId,
      year: parsedYear,
      month: parsedMonth,
      budgetAmount: parsedAmount,
      status: "ACTIVE",
    });

    return res.status(201).json({
      success: true,
      message: "Budget created successfully",
      budget,
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "A budget already exists for this category and month",
      });
    }

    console.error("Create budget error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create budget",
    });
  }
};

// Get all budgets for the authenticated user
const getBudgets = async (req, res) => {
  try {
    const { year, month } = req.query;

    const where = { userId: req.user.userId };

    if (year) where.year = Number(year);
    if (month) where.month = Number(month);

    const budgets = await Budget.findAll({
      where,
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["categoryId", "categoryName", "categoryType"],
        },
      ],
      order: [["year", "DESC"], ["month", "DESC"]],
    });

    res.status(200).json({
      success: true,
      count: budgets.length,
      budgets,
    });
  } catch (error) {
    console.error("Get budgets error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch budgets",
    });
  }
};

// Get budget vs actual spending for a month
const getBudgetOverview = async (req, res) => {
  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month);

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid year and month are required",
      });
    }

    const budgets = await Budget.findAll({
      where: {
        userId: req.user.userId,
        year,
        month,
      },
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["categoryId", "categoryName", "categoryType"],
        },
      ],
    });

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    const spending = await Transaction.findAll({
      attributes: [
        "categoryId",
        [fn("SUM", col("amount")), "actualSpent"],
      ],
      where: {
        userId: req.user.userId,
        transactionType: "EXPENSE",
        status: "COMPLETED",
        transactionDate: {
          [Op.gte]: startDate,
          [Op.lt]: endDate,
        },
      },
      group: ["categoryId"],
      raw: true,
    });

    const spendingMap = new Map(
      spending.map((item) => [
        item.categoryId,
        Number(item.actualSpent),
      ])
    );

    const overview = budgets.map((budget) => {
      const actualSpent = spendingMap.get(budget.categoryId) || 0;
      const budgetAmount = Number(budget.budgetAmount);
      const remaining = budgetAmount - actualSpent;

      return {
        budgetId: budget.budgetId,
        categoryId: budget.categoryId,
        categoryName: budget.category?.categoryName || "Unknown",
        budgetAmount,
        actualSpent,
        remaining,
        utilizationPercentage:
          budgetAmount > 0
            ? Number(((actualSpent / budgetAmount) * 100).toFixed(2))
            : 0,
        status: remaining < 0 ? "OVER_BUDGET" : "WITHIN_BUDGET",
      };
    });

    const totalBudget = overview.reduce(
      (sum, item) => sum + item.budgetAmount,
      0
    );

    const totalSpent = overview.reduce(
      (sum, item) => sum + item.actualSpent,
      0
    );

    res.status(200).json({
      success: true,
      period: { year, month },
      summary: {
        totalBudget,
        totalSpent,
        remaining: totalBudget - totalSpent,
      },
      overview,
    });
  } catch (error) {
    console.error("Budget overview error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to calculate budget overview",
    });
  }
};

module.exports = {
  createBudget,
  getBudgets,
  getBudgetOverview,
};
