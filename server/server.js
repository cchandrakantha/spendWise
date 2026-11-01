const app = require("./src/app");
const sequelize = require("./src/config/database");

require("dotenv").config();

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await sequelize.authenticate();

    console.log("================================");
    console.log("MySQL Connected Successfully!");
    console.log("Database: spendwise");
    console.log("================================");

    app.listen(PORT, () => {
      console.log(`SpendWise API running at http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error("Database connection failed:");
    console.error(error.message);

    process.exit(1);
  }
}

startServer();