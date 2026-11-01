const sequelize = require("./database");
require("../models");

async function syncDatabase() {
  try {
    await sequelize.authenticate();

    await sequelize.sync();

    console.log("Database tables created successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Database synchronization failed:", error.message);
    process.exit(1);
  }
}

syncDatabase();