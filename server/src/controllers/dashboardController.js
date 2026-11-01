
const { Op, fn, col } = require("sequelize");
const { Account, Transaction, Category, Merchant } = require("../models");

const getDashboard = async (req, res) => {
  try {
    const userId = req.user.userId;

    // 1. Calculate total account balance
    const totalBalance = await Account.sum("balance", {
      where: {
        userId,
        status: "ACTIVE",
      },
    });

    // 2. Get completed transactions
    const transactions = await Transaction.findAll({
      where: {
        userId,
        status: "COMPLETED",
      },
      attributes: ["transactionType", "amount", "transactionDate"],
      raw: true,
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

    // 3. Calculate net cash flow
    const netCashFlow = totalIncome + totalRefunds - totalExpenses;

    // 4. Get recent transactions
    const recentTransactions = await Transaction.findAll({
      where: { userId },
      include: [
        { model: Category, attributes: ["categoryName"] },
        { model: Merchant, attributes: ["merchantName"] },
      ],
      order: [["transactionDate", "DESC"]],
      limit: 5,
    });

    // 5. Calculate monthly income and expenses for the last 6 months
    const now = new Date();
    const sixMonthsAgo = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1)
    );

    const monthlyTransactions = await Transaction.findAll({
      where: {
        userId,
        status: "COMPLETED",
        transactionDate: {
          [Op.gte]: sixMonthsAgo,
        },
        transactionType: {
          [Op.in]: ["INCOME", "EXPENSE"],
        },
      },
      attributes: ["transactionType", "amount", "transactionDate"],
      raw: true,
    });

    const monthlyMap = {};

    for (let i = 0; i < 6; i++) {
      const date = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + i, 1)
      );

      const key = `${date.getUTCFullYear()}-${String(
        date.getUTCMonth() + 1
      ).padStart(2, "0")}`;

      monthlyMap[key] = {
        month: key,
        income: 0,
        expenses: 0,
      };
    }

    monthlyTransactions.forEach((transaction) => {
      const date = new Date(transaction.transactionDate);
      const key = `${date.getUTCFullYear()}-${String(
        date.getUTCMonth() + 1
      ).padStart(2, "0")}`;

      if (monthlyMap[key]) {
        if (transaction.transactionType === "INCOME") {
          monthlyMap[key].income += Number(transaction.amount);
        } else {
          monthlyMap[key].expenses += Number(transaction.amount);
        }
      }
    });

    return res.status(200).json({
      success: true,
      dashboard: {
        totalBalance: Number(totalBalance || 0),
        totalIncome,
        totalExpenses,
        totalRefunds,
        totalTransfers,
        netCashFlow,
        totalTransactions: transactions.length,
        monthlyTrends: Object.values(monthlyMap),
        recentTransactions,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard",
    });
  }
};

module.exports = { getDashboard };
