
const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { getInsights } = require("../controllers/insightController");

router.use(authMiddleware);

router.get("/", getInsights);

module.exports = router;
