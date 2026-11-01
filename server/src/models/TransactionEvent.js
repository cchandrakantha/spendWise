const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const TransactionEvent = sequelize.define(
  "TransactionEvent",
  {
    eventId: {
      type: DataTypes.STRING(40),
      primaryKey: true,
      field: "event_id",
    },
    transactionId: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: "transaction_id",
    },
    eventType: {
      type: DataTypes.ENUM(
        "CREATED",
        "UPDATED",
        "CATEGORIZED",
        "FLAGGED",
        "REVERSED",
        "RECONCILED"
      ),
      allowNull: false,
      field: "event_type",
    },
    previousValue: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "previous_value",
    },
    newValue: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "new_value",
    },
    eventTimestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "event_timestamp",
    },
    notes: DataTypes.TEXT,
  },
  {
    tableName: "transaction_events",
    timestamps: true,
    underscored: true,
  }
);

module.exports = TransactionEvent;