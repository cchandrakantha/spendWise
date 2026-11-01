
const { Op, fn, col } = require("sequelize");
const { randomBytes } = require("crypto");

const {
  Insight,
  Transaction,
  Category,
  Budget,
  RecurringSeries,
} = require("../models");

const getInsights = async (req, res) => {
  try {
    const userId = req.user.userId;

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;

    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const nextMonthStart = new Date(Date.UTC(year, month, 1));

    // 1. Fetch current month's categorized spending.
    const spending = await Transaction.findAll({
      attributes: [
        "categoryId",
        [fn("SUM", col("amount")), "totalSpent"],
      ],
      where: {
        userId,
        transactionType: "EXPENSE",
        status: "COMPLETED",
        categoryId: { [Op.ne]: null },
        transactionDate: {
          [Op.gte]: monthStart,
          [Op.lt]: nextMonthStart,
        },
      },
      include: [
        {
          model: Category,
          attributes: ["categoryName"],
          required: true,
        },
      ],
      group: ["categoryId", "Category.category_id"],
      raw: true,
    });

    const totalSpending = spending.reduce(
      (sum, item) => sum + Number(item.totalSpent || 0),
      0
    );

    // 2. Fetch active budgets for the current month.
    const budgets = await Budget.findAll({
      where: {
        userId,
        year,
        month,
        status: "ACTIVE",
      },
      include: [
        {
          model: Category,
          attributes: ["categoryName"],
          as: "category",
        },
      ],
    });

    const budgetWarnings = budgets
      .map((budget) => {
        const spent = spending.find(
          (item) => item.categoryId === budget.categoryId
        );

        const actualSpent = Number(spent?.totalSpent || 0);
        const budgetAmount = Number(budget.budgetAmount);

        return {
          categoryId: budget.categoryId,
          categoryName: budget.category?.categoryName,
          budgetAmount,
          actualSpent,
          remaining: budgetAmount - actualSpent,
          exceeded: actualSpent > budgetAmount,
        };
      })
      .filter((item) => item.exceeded);

    // 3. Fetch upcoming recurring payments.
    const nextSevenDays = new Date(
      now.getTime() + 7 * 24 * 60 * 60 * 1000
    );

    const upcomingPayments = await RecurringSeries.findAll({
      where: {
        userId,
        status: "ACTIVE",
        nextExpectedDate: {
          [Op.gte]: now,
          [Op.lte]: nextSevenDays,
        },
      },
      order: [["nextExpectedDate", "ASC"]],
      limit: 10,
    });

    // 4. Identify the highest-spending category.
    const highestSpendingCategory =
      spending
        .map((item) => ({
          categoryId: item.categoryId,
          categoryName: item["Category.categoryName"],
          totalSpent: Number(item.totalSpent || 0),
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)[0] || null;

    // 5. Build recommendations from actual financial data.
    const recommendations = [];

    for (const budget of budgets) {
      const spent = spending.find(
        (item) => item.categoryId === budget.categoryId
      );

      const actualSpent = Number(spent?.totalSpent || 0);
      const budgetAmount = Number(budget.budgetAmount);

      if (budgetAmount <= 0) continue;

      const utilization = (actualSpent / budgetAmount) * 100;
      const categoryName =
        budget.category?.categoryName || "your category";

      if (utilization >= 100) {
        recommendations.push({
          insightType: "BUDGET_WARNING",
          title: `${categoryName} budget exceeded`,
          description:
            `You have spent ₹${actualSpent.toFixed(2)} against ` +
            `your ₹${budgetAmount.toFixed(2)} budget for ${categoryName}. ` +
            `You are over budget by ₹${(actualSpent - budgetAmount).toFixed(2)}.`,
          severity: "HIGH",
        });
      } else if (utilization >= 80) {
        recommendations.push({
          insightType: "BUDGET_WARNING",
          title: `${categoryName} budget almost reached`,
          description:
            `You have used ${utilization.toFixed(1)}% of your ` +
            `${categoryName} budget. ₹${(budgetAmount - actualSpent).toFixed(2)} remains.`,
          severity: "MEDIUM",
        });
      }
    }

    // High spending concentration recommendation.
    if (
      highestSpendingCategory &&
      totalSpending > 0 &&
      highestSpendingCategory.totalSpent / totalSpending >= 0.4
    ) {
      recommendations.push({
        insightType: "HIGH_SPENDING",
        title: `High spending on ${highestSpendingCategory.categoryName}`,
        description:
          `${highestSpendingCategory.categoryName} accounts for ` +
          `${(
            (highestSpendingCategory.totalSpent / totalSpending) *
            100
          ).toFixed(1)}% of your categorized expenses this month. ` +
          `Review this category for possible savings.`,
        severity: "MEDIUM",
      });
    }

    // Upcoming payment recommendations.
    for (const payment of upcomingPayments) {
      recommendations.push({
        insightType: "RECURRING_PAYMENT",
        title: `Upcoming payment: ${payment.recurringName}`,
        description:
          `${payment.recurringName} is expected on ` +
          `${new Date(payment.nextExpectedDate).toLocaleDateString()}. ` +
          `Expected amount: ₹${Number(payment.expectedAmount).toFixed(2)}.`,
        severity: "LOW",
      });
    }

    // 6. Save recommendations without duplicating them.
    for (const recommendation of recommendations) {
      const existingInsight = await Insight.findOne({
        where: {
          userId,
          insightType: recommendation.insightType,
          title: recommendation.title,
          generatedAt: {
            [Op.gte]: monthStart,
            [Op.lt]: nextMonthStart,
          },
        },
      });

      if (!existingInsight) {
        await Insight.create({
          insightId: `INS-${Date.now()}-${randomBytes(3).toString("hex")}`,
          userId,
          ...recommendation,
          status: "NEW",
        });
      }
    }

    // 7. Fetch saved insights after generating new recommendations.
    const insights = await Insight.findAll({
      where: { userId },
      order: [["generatedAt", "DESC"]],
      limit: 20,
    });

    return res.status(200).json({
      success: true,
      insights,
      analysis: {
        year,
        month,
        totalSpending,
        highestSpendingCategory,
        budgetWarnings,
        upcomingPayments,
      },
    });
  } catch (error) {
    console.error("Insights error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate insights",
    });
  }
};

module.exports = { getInsights };
