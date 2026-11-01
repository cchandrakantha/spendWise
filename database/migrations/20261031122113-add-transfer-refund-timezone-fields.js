
"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("transactions", "transfer_group_id", {
      type: Sequelize.STRING(40),
      allowNull: true,
    });

    await queryInterface.addColumn("transactions", "counterparty_account_id", {
      type: Sequelize.STRING(40),
      allowNull: true,
    });

    await queryInterface.addColumn("transactions", "transfer_direction", {
      type: Sequelize.ENUM("IN", "OUT"),
      allowNull: true,
    });

    await queryInterface.addColumn("transactions", "related_transaction_id", {
      type: Sequelize.STRING(30),
      allowNull: true,
    });

    await queryInterface.addColumn("transactions", "timezone", {
      type: Sequelize.STRING(60),
      allowNull: true,
    });

    await queryInterface.addConstraint("transactions", {
      fields: ["counterparty_account_id"],
      type: "foreign key",
      name: "fk_transactions_counterparty_account",
      references: {
        table: "accounts",
        field: "account_id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addConstraint("transactions", {
      fields: ["related_transaction_id"],
      type: "foreign key",
      name: "fk_transactions_related_transaction",
      references: {
        table: "transactions",
        field: "transaction_id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addIndex("transactions", ["transfer_group_id"], {
      name: "idx_transactions_transfer_group",
    });

    await queryInterface.addIndex("transactions", ["related_transaction_id"], {
      name: "idx_transactions_related_transaction",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      "transactions",
      "idx_transactions_related_transaction"
    );

    await queryInterface.removeIndex(
      "transactions",
      "idx_transactions_transfer_group"
    );

    await queryInterface.removeConstraint(
      "transactions",
      "fk_transactions_related_transaction"
    );

    await queryInterface.removeConstraint(
      "transactions",
      "fk_transactions_counterparty_account"
    );

    await queryInterface.removeColumn("transactions", "timezone");
    await queryInterface.removeColumn("transactions", "related_transaction_id");
    await queryInterface.removeColumn("transactions", "transfer_direction");
    await queryInterface.removeColumn("transactions", "counterparty_account_id");
    await queryInterface.removeColumn("transactions", "transfer_group_id");
  },
};
