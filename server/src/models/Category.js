const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Category = sequelize.define(
  "Category",
  {
    categoryId: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      field: "category_id",
    },
    categoryName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: "category_name",
    },
    categoryType: {
      type: DataTypes.ENUM("INCOME", "EXPENSE", "TRANSFER"),
      allowNull: false,
      field: "category_type",
    },
    description: DataTypes.TEXT,
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_active",
    },
  },
  {
    tableName: "categories",
    timestamps: true,
    underscored: true,
  }
);

module.exports = Category;