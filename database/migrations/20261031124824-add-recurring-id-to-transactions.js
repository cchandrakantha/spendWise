
"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("transactions", "recurring_id", {
      type: Sequelize.STRING(30),
      allowNull: true,
    });

    await queryInterface.addConstraint("transactions", {
      fields: ["recurring_id"],
      type: "foreign key",
      name: "fk_transactions_recurring_series",
      references: {
        table: "recurring_series",
        field: "recurring_id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addIndex("transactions", ["recurring_id"], {
      name: "idx_transactions_recurring_id",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      "transactions",
      "idx_transactions_recurring_id"
    );

    await queryInterface.removeConstraint(
      "transactions",
      "fk_transactions_recurring_series"
    );

    await queryInterface.removeColumn("transactions", "recurring_id");
  },
};
