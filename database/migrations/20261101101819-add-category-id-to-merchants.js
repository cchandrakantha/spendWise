"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("merchants");

    if (!table.category_id) {
      await queryInterface.addColumn("merchants", "category_id", {
        type: Sequelize.STRING(20),
        allowNull: true,
        references: {
          model: "categories",
          key: "category_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("merchants");

    if (table.category_id) {
      await queryInterface.removeColumn("merchants", "category_id");
    }
  },
};