const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const RecurringSeries = sequelize.define(
  "RecurringSeries",
  {
    recurringId: {
      type: DataTypes.STRING(30),
      primaryKey: true,
      field: "recurring_id",
    },
    userId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "user_id",
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
    recurringName: {
      type: DataTypes.STRING(120),
      allowNull: false,
      field: "recurring_name",
    },
    expectedAmount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      field: "expected_amount",
    },
    frequency: {
      type: DataTypes.ENUM(
        "WEEKLY",
        "BIWEEKLY",
        "MONTHLY",
        "QUARTERLY",
        "YEARLY"
      ),
      allowNull: false,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "start_date",
    },
    nextExpectedDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "next_expected_date",
    },
    status: {
      type: DataTypes.ENUM(
        "ACTIVE",
        "PAUSED",
        "CANCELLED",
        "COMPLETED"
      ),
      defaultValue: "ACTIVE",
    },
  },
  {
    tableName: "recurring_series",
    timestamps: true,
    underscored: true,
  }
);

module.exports = RecurringSeries;