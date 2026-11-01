const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const UserProfile = sequelize.define(
  "UserProfile",
  {
    userId: {
      type: DataTypes.STRING(20),
      primaryKey: true,
      field: "user_id",
    },
    fullName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: "full_name",
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
    },
    passwordHash: {
  type: DataTypes.STRING(255),
  allowNull: true,
  field: "password_hash",
},
    city: DataTypes.STRING(100),
    householdSize: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: "household_size",
    },
    monthlyIncome: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      field: "monthly_income",
    },
    profileStatus: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
      defaultValue: "ACTIVE",
      field: "profile_status",
    },
  },
  {
    tableName: "user_profiles",
    timestamps: true,
    underscored: true,
  }
);

module.exports = UserProfile;