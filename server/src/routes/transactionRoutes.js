const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  createTransaction,
  getTransactions,
  getTransactionById,
  getTransactionSummary,
} = require("../controllers/transactionController");

router.use(authMiddleware);

// Create a transaction
router.post("/", createTransaction);

// Get transaction summary
router.get("/summary", getTransactionSummary);

// List transactions
router.get("/", getTransactions);

// Get transaction by ID
router.get("/:id", getTransactionById);

module.exports = router;