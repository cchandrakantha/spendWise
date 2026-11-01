const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const CategoryRule = sequelize.define(
  "CategoryRule",
  {
    ruleId: {
      type: DataTypes.STRING(30),
      primaryKey: true,
      field: "rule_id",
    },
    ruleName: {
      type: DataTypes.STRING(120),
      allowNull: false,
      field: "rule_name",
    },
    merchantPattern: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: "merchant_pattern",
    },
    descriptionPattern: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: "description_pattern",
    },
    categoryId: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "category_id",
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    effectiveFrom: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "effective_from",
    },
    effectiveTo: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "effective_to",
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
      defaultValue: "ACTIVE",
    },
  },
  {
    tableName: "category_rules",
    timestamps: true,
    underscored: true,
  }
);

module.exports = CategoryRule;