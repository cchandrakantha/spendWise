
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  getCategories,
  getCategoryById,
  getCategoryTransactions,
  getCategorySummary,
} = require("../controllers/categoryController");

router.use(authMiddleware);

router.get("/", getCategories);
router.get("/summary", getCategorySummary);
router.get("/:id/transactions", getCategoryTransactions);
router.get("/:id", getCategoryById);

module.exports = router;
