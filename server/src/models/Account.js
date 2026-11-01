const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Account = sequelize.define(
  "Account",
  {
    accountId: {
      type: DataTypes.STRING(40),
      primaryKey: true,
      field: "account_id",
    },
    userId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "user_id",
    },
    accountName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "account_name",
    },
    accountType: {
      type: DataTypes.ENUM(
        "SAVINGS",
        "CURRENT",
        "CREDIT_CARD",
        "WALLET",
        "CASH"
      ),
      allowNull: false,
      field: "account_type",
    },
    openingBalance: {
  type: DataTypes.DECIMAL(14, 2),
  allowNull: false,
  defaultValue: 0,
  field: "opening_balance",
},
balance: {
  type: DataTypes.DECIMAL(14, 2),
  defaultValue: 0,
},
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: "INR",
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "CLOSED"),
      defaultValue: "ACTIVE",
    },
  },
  {
    tableName: "accounts",
    timestamps: true,
    underscored: true,
  }
);

module.exports = Account;