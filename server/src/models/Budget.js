const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Budget = sequelize.define(
  "Budget",
  {
    budgetId: {
      type: DataTypes.STRING(60),
      primaryKey: true,
      field: "budget_id",
    },
    userId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "user_id",
    },
    categoryId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "category_id",
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    month: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 12 },
    },
    budgetAmount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      field: "budget_amount",
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "CLOSED"),
      defaultValue: "ACTIVE",
    },
  },
  {
    tableName: "budgets",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ["user_id", "category_id", "year", "month"],
      },
    ],
  }
);

module.exports = Budget;