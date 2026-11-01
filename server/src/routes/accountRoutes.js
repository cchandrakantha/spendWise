
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
  createAccount,
  getAccounts,
} = require("../controllers/accountController");

router.use(authMiddleware);

router.post("/", createAccount);
router.get("/", getAccounts);

module.exports = router;
