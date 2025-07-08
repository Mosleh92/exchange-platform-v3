const express = require("express");
const router = express.Router();
const exchangeRateController = require("../controllers/exchangeRate.controller");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const rateController = require("../controllers/rate.controller");

// Public routes (for customers)
router.get("/current", exchangeRateController.getCurrentRates);
router.get("/history", exchangeRateController.getRateHistory);
router.get("/calculate", exchangeRateController.calculateConversion);
router.get("/pairs", exchangeRateController.getCurrencyPairs);
router.get("/dynamic", rateController.getRate);

// Staff routes
router.post(
  "/update",
  authenticateToken,
  authorizeRoles(["staff", "manager", "admin"]),
  exchangeRateController.updateRate,
);

router.post(
  "/update-from-api",
  authenticateToken,
  authorizeRoles(["manager", "admin"]),
  exchangeRateController.updateFromAPI,
);

router.post(
  "/toggle-status",
  authenticateToken,
  authorizeRoles(["manager", "admin"]),
  exchangeRateController.toggleRateStatus,
);

// Admin routes
router.get(
  "/stats",
  authenticateToken,
  authorizeRoles(["manager", "admin"]),
  exchangeRateController.getRateStats,
);

module.exports = router;
