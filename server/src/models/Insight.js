  const { DataTypes } = require("sequelize");
  const sequelize = require("../config/database");

  const Insight = sequelize.define(
    "Insight",
    {
      insightId: {
        type: DataTypes.STRING(30),
        primaryKey: true,
        field: "insight_id",
      },
      userId: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: "user_id",
      },
      insightType: {
        type: DataTypes.ENUM(
          "HIGH_SPENDING",
          "BUDGET_WARNING",
          "RECURRING_PAYMENT",
          "UNUSUAL_TRANSACTION",
          "SAVING_OPPORTUNITY",
          "GENERAL"
        ),
        allowNull: false,
        field: "insight_type",
      },
      title: {
        type: DataTypes.STRING(180),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      severity: {
        type: DataTypes.ENUM("LOW", "MEDIUM", "HIGH"),
        defaultValue: "LOW",
      },
      generatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "generated_at",
      },
      status: {
        type: DataTypes.ENUM("NEW", "READ", "DISMISSED"),
        defaultValue: "NEW",
      },
    },
    {
      tableName: "insights",
      timestamps: true,
      underscored: true,
    }
  );

  module.exports = Insight;