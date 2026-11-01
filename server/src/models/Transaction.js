
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Transaction = sequelize.define(
  "Transaction",
  {
    transactionId: {
      type: DataTypes.STRING(30),
      primaryKey: true,
      field: "transaction_id",
    },
    userId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "user_id",
    },
    accountId: {
      type: DataTypes.STRING(40),
      allowNull: false,
      field: "account_id",
    },
    merchantId: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: "merchant_id",
    },
    categoryId: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "category_id",
    },
    amount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
    },
    transactionType: {
      type: DataTypes.ENUM("INCOME", "EXPENSE", "TRANSFER", "REFUND"),
      allowNull: false,
      field: "transaction_type",
    },
    description: DataTypes.TEXT,
    transactionDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "transaction_date",
    },
    status: {
      type: DataTypes.ENUM("COMPLETED", "PENDING", "FAILED", "REVERSED"),
      defaultValue: "COMPLETED",
    },
    transferGroupId: {
      type: DataTypes.STRING(40),
      allowNull: true,
      field: "transfer_group_id",
    },
    counterpartyAccountId: {
      type: DataTypes.STRING(40),
      allowNull: true,
      field: "counterparty_account_id",
    },
    transferDirection: {
      type: DataTypes.ENUM("IN", "OUT"),
      allowNull: true,
      field: "transfer_direction",
    },
    relatedTransactionId: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: "related_transaction_id",
    },
    timezone: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },
    recurringId: {
  type: DataTypes.STRING(30),
  allowNull: true,
  field: "recurring_id",
},
    isAnomaly: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_anomaly",
    },
    anomalyType: {
      type: DataTypes.STRING(80),
      allowNull: true,
      field: "anomaly_type",
    },
  },
  {
    tableName: "transactions",
    timestamps: true,
    underscored: true,
    indexes: [
  { fields: ["user_id", "transaction_date"] },
  { fields: ["category_id"] },
  { fields: ["merchant_id"] },
  { fields: ["transfer_group_id"] },
  { fields: ["related_transaction_id"] },
  { fields: ["recurring_id"] },
],
  }
);

module.exports = Transaction;
