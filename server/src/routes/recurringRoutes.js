
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  getRecurringPayments,
  getRecurringSummary,
  getRecurringPaymentById,
} = require("../controllers/recurringController");

router.use(authMiddleware);

router.get("/", getRecurringPayments);
router.get("/summary", getRecurringSummary);
router.get("/:id", getRecurringPaymentById);

module.exports = router;
