
const { Op, fn, col } = require("sequelize");

const {
  RecurringSeries,
  Merchant,
  Category,
  Transaction,
} = require("../models");

// Get recurring payments for the authenticated user
const getRecurringPayments = async (req, res) => {
  try {
    const { status, frequency } = req.query;

    const where = {
      userId: req.user.userId,
    };

    if (status) where.status = status.toUpperCase();
    if (frequency) where.frequency = frequency.toUpperCase();

    const recurringPayments = await RecurringSeries.findAll({
      where,
      include: [
        {
          model: Merchant,
          attributes: ["merchantId", "merchantName"],
        },
        {
          model: Category,
          attributes: ["categoryId", "categoryName"],
        },
      ],
      order: [["nextExpectedDate", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      count: recurringPayments.length,
      recurringPayments,
    });
  } catch (error) {
    console.error("Get recurring payments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch recurring payments",
    });
  }
};

// Get recurring payment summary
const getRecurringSummary = async (req, res) => {
  try {
    const userId = req.user.userId;

    const recurringPayments = await RecurringSeries.findAll({
      where: { userId },
      attributes: ["recurringId", "expectedAmount", "frequency", "status"],
      raw: true,
    });

    const activePayments = recurringPayments.filter(
      (item) => item.status === "ACTIVE"
    );

    const monthlyEquivalent = (amount, frequency) => {
      const value = Number(amount);

      switch (frequency) {
        case "WEEKLY":
          return (value * 52) / 12;
        case "BIWEEKLY":
          return (value * 26) / 12;
        case "MONTHLY":
          return value;
        case "QUARTERLY":
          return value / 3;
        case "YEARLY":
          return value / 12;
        default:
          return 0;
      }
    };

    const estimatedMonthlyCommitment = activePayments.reduce(
      (sum, item) =>
        sum + monthlyEquivalent(item.expectedAmount, item.frequency),
      0
    );

    const totalExpectedAmount = activePayments.reduce(
      (sum, item) => sum + Number(item.expectedAmount),
      0
    );

    return res.status(200).json({
      success: true,
      summary: {
        totalSeries: recurringPayments.length,
        activeSeries: activePayments.length,
        pausedSeries: recurringPayments.filter(
          (item) => item.status === "PAUSED"
        ).length,
        cancelledSeries: recurringPayments.filter(
          (item) => item.status === "CANCELLED"
        ).length,
        completedSeries: recurringPayments.filter(
          (item) => item.status === "COMPLETED"
        ).length,
        totalExpectedAmount: Number(totalExpectedAmount.toFixed(2)),
        estimatedMonthlyCommitment: Number(
          estimatedMonthlyCommitment.toFixed(2)
        ),
      },
    });
  } catch (error) {
    console.error("Recurring summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to calculate recurring summary",
    });
  }
};

// Get one recurring payment with its linked transactions
const getRecurringPaymentById = async (req, res) => {
  try {
    const recurringPayment = await RecurringSeries.findOne({
      where: {
        recurringId: req.params.id,
        userId: req.user.userId,
      },
      include: [
        {
          model: Merchant,
          attributes: ["merchantId", "merchantName"],
        },
        {
          model: Category,
          attributes: ["categoryId", "categoryName"],
        },
        {
          model: Transaction,
          as: "transactions",
          attributes: [
            "transactionId",
            "amount",
            "transactionDate",
            "transactionType",
            "status",
          ],
          separate: true,
          order: [["transactionDate", "DESC"]],
        },
      ],
    });

    if (!recurringPayment) {
      return res.status(404).json({
        success: false,
        message: "Recurring payment not found",
      });
    }

    return res.status(200).json({
      success: true,
      recurringPayment,
    });
  } catch (error) {
    console.error("Get recurring payment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch recurring payment details",
    });
  }
};

module.exports = {
  getRecurringPayments,
  getRecurringSummary,
  getRecurringPaymentById,
};
