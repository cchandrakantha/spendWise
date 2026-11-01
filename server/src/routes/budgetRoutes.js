
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  createBudget,
  getBudgets,
  getBudgetOverview,
} = require("../controllers/budgetController");

router.use(authMiddleware);

// POST /api/budgets
router.post("/", createBudget);

// GET /api/budgets
router.get("/", getBudgets);

// GET /api/budgets/overview?year=2026&month=11
router.get("/overview", getBudgetOverview);

module.exports = router;
