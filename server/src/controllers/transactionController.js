const { Op } = require("sequelize");
const { randomBytes } = require("crypto");

const sequelize = require("../config/database");

const {
  Transaction,
  Account,
  Category,
  Merchant,
} = require("../models");


// GET /api/transactions/summary
// Calculate income, expenses, refunds and net cash flow
const getTransactionSummary = async (req, res, next) => {
  try {
    const transactions = await Transaction.findAll({
      where: {
        userId: req.user.userId,
        status: "COMPLETED",
      },
      attributes: ["transactionType", "amount"],
    });

    let totalIncome = 0;
    let totalExpenses = 0;
    let totalRefunds = 0;
    let totalTransfers = 0;

    transactions.forEach((transaction) => {
      const amount = Number(transaction.amount);

      switch (transaction.transactionType) {
        case "INCOME":
          totalIncome += amount;
          break;
        case "EXPENSE":
          totalExpenses += amount;
          break;
        case "REFUND":
          totalRefunds += amount;
          break;
        case "TRANSFER":
          totalTransfers += amount;
          break;
      }
    });

    const netCashFlow = totalIncome + totalRefunds - totalExpenses;

    return res.status(200).json({
      success: true,
      summary: {
        totalTransactions: transactions.length,
        totalIncome,
        totalExpenses,
        totalRefunds,
        totalTransfers,
        netCashFlow,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/transactions

// POST /api/transactions
// Create an income or expense transaction
const createTransaction = async (req, res, next) => {
  const dbTransaction = await sequelize.transaction();

  try {
    const {
      accountId,
      categoryId,
      merchantId,
      amount,
      transactionType,
      description,
      transactionDate,
    } = req.body;

    const userId = req.user.userId;
    const type = String(transactionType || "").toUpperCase();
    const numericAmount = Number(amount);

    // Validate required fields
    if (!accountId || !transactionType || amount === undefined) {
      await dbTransaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Account, transaction type and amount are required.",
      });
    }

    if (!["INCOME", "EXPENSE"].includes(type)) {
      await dbTransaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Only INCOME and EXPENSE transactions are supported.",
      });
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0 ||
      Math.round(numericAmount * 100) !== numericAmount * 100
    ) {
      await dbTransaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Amount must be a positive number with at most 2 decimal places.",
      });
    }

    const date = transactionDate
      ? new Date(transactionDate)
      : new Date();

    if (Number.isNaN(date.getTime())) {
      await dbTransaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Invalid transaction date.",
      });
    }

    // Verify account ownership and lock the row
    const account = await Account.findOne({
      where: {
        accountId,
        userId,
        status: "ACTIVE",
      },
      transaction: dbTransaction,
      lock: dbTransaction.LOCK.UPDATE,
    });

    if (!account) {
      await dbTransaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Active account not found.",
      });
    }

    // Validate category if provided
    if (categoryId) {
      const category = await Category.findOne({
        where: {
          categoryId,
          isActive: true,
          categoryType: type,
        },
        transaction: dbTransaction,
      });

      if (!category) {
        await dbTransaction.rollback();

        return res.status(400).json({
          success: false,
          message: "Invalid category for this transaction type.",
        });
      }
    }

    // Validate merchant if provided
    if (merchantId) {
      const merchant = await Merchant.findByPk(merchantId, {
        transaction: dbTransaction,
      });

      if (!merchant) {
        await dbTransaction.rollback();

        return res.status(400).json({
          success: false,
          message: "Merchant not found.",
        });
      }
    }

    // Calculate the updated balance using integer paise
    const currentBalance = Number(account.balance || 0);
    const currentPaise = Math.round(currentBalance * 100);
    const amountPaise = Math.round(numericAmount * 100);

    const updatedPaise =
      type === "INCOME"
        ? currentPaise + amountPaise
        : currentPaise - amountPaise;

    const updatedBalance = (updatedPaise / 100).toFixed(2);

    // Generate a unique transaction ID
    const transactionId = `TXN-${Date.now()}-${randomBytes(3).toString("hex")}`;

    // Create transaction record
    const newTransaction = await Transaction.create(
      {
        transactionId,
        userId,
        accountId,
        categoryId: categoryId || null,
        merchantId: merchantId || null,
        amount: numericAmount.toFixed(2),
        transactionType: type,
        description: description?.trim() || null,
        transactionDate: date,
        status: "COMPLETED",
      },
      { transaction: dbTransaction }
    );

    // Update account balance
    await account.update(
      { balance: updatedBalance },
      { transaction: dbTransaction }
    );

    await dbTransaction.commit();

    return res.status(201).json({
      success: true,
      message: "Transaction created successfully.",
      transaction: newTransaction,
      updatedBalance,
    });
  } catch (error) {
    if (!dbTransaction.finished) {
      await dbTransaction.rollback();
    }

    next(error);
  }
};


// GET /api/transactions/summary
// Calculate income, expenses, refunds and net cash flow
const getTransactions = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      status,
      categoryId,
      accountId,
      dateFrom,
      dateTo,
      search,
    } = req.query;

    const where = {
      userId: req.user.userId,
    };

    if (type) where.transactionType = type;
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (accountId) where.accountId = accountId;

    if (dateFrom || dateTo) {
      where.transactionDate = {};

      if (dateFrom) where.transactionDate[Op.gte] = new Date(dateFrom);
      if (dateTo) where.transactionDate[Op.lte] = new Date(dateTo);
    }

    if (search) {
      where.description = {
        [Op.like]: `%${search}%`,
      };
    }

    const result = await Transaction.findAndCountAll({
      where,
      include: [
        { model: Account },
        { model: Category },
        { model: Merchant },
      ],
      order: [["transactionDate", "DESC"]],
      limit: Math.min(Number(limit) || 10, 100),
      offset: (Math.max(Number(page) || 1, 1) - 1) *
        Math.min(Number(limit) || 10, 100),
    });

    res.status(200).json({
      success: true,
      totalRecords: result.count,
      currentPage: Number(page) || 1,
      totalPages: Math.ceil(
        result.count / (Math.min(Number(limit) || 10, 100))
      ),
      transactions: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/transactions/:id
// Get a single transaction belonging to the logged-in user
const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      where: {
        transactionId: req.params.id,
        userId: req.user.userId,
      },
      include: [
        { model: Account },
        { model: Category },
        { model: Merchant },
        {
          model: Transaction,
          as: "originalTransaction",
        },
        {
          model: Transaction,
          as: "refundTransactions",
        },
        {
          model: require("../models").RecurringSeries,
          as: "recurringSeries",
        },
      ],
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    return res.status(200).json({
      success: true,
      transaction,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  getTransactionSummary,
};