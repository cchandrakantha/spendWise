const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Merchant = sequelize.define(
  "Merchant",
  {
    merchantId: {
      type: DataTypes.STRING(30),
      primaryKey: true,
      field: "merchant_id",
    },
    merchantName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: "merchant_name",
    },
    merchantType: {
      type: DataTypes.STRING(80),
      field: "merchant_type",
    },
    categoryId: {
  type: DataTypes.STRING(20),
  allowNull: true,
  field: "category_id",
},
    city: DataTypes.STRING(100),
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_active",
    },
  },
  {
    tableName: "merchants",
    timestamps: true,
    underscored: true,
  }
);

module.exports = Merchant;