
const { Account } = require("../models");

const createAccount = async (req, res) => {
  try {
    const { accountName, accountType, openingBalance, currency } = req.body;

    if (!accountName || !accountType || openingBalance === undefined) {
      return res.status(400).json({
        success: false,
        message: "Account name, account type and opening balance are required.",
      });
    }

    const validTypes = [
      "SAVINGS",
      "CURRENT",
      "CREDIT_CARD",
      "WALLET",
      "CASH",
    ];

    if (!validTypes.includes(accountType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account type.",
      });
    }

    const amount = Number(openingBalance);

    if (!Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({
        success: false,
        message: "Opening balance must be a valid non-negative number.",
      });
    }

    const account = await Account.create({
      accountId: `ACC-${req.user.userId}-${Date.now()}`,
      userId: req.user.userId,
      accountName: accountName.trim(),
      accountType,
      openingBalance: amount,
      balance: amount,
      currency: currency || "INR",
      status: "ACTIVE",
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      account,
    });
  } catch (error) {
    console.error("Create account error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create account.",
    });
  }
};

const getAccounts = async (req, res) => {
  try {
    const accounts = await Account.findAll({
      where: {
        userId: req.user.userId,
        status: "ACTIVE",
      },
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      count: accounts.length,
      accounts,
    });
  } catch (error) {
    console.error("Get accounts error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch accounts.",
    });
  }
};

module.exports = {
  createAccount,
  getAccounts,
};
