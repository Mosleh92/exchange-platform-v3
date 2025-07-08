const express = require("express");
const router = express.Router();
const currencyTransactionController = require("../controllers/currencyTransaction.controller");
const { auth, authorize } = require("../middleware/auth");
const { tenantAccess } = require("../middleware/tenant");
const { validateCurrencyTransaction } = require("../middleware/validation");

// Apply authentication and tenant middleware to all routes
router.use(auth);
router.use(tenantAccess);

// Get all currency transactions
router.get(
  "/",
  authorize(["admin", "manager", "staff"]),
  currencyTransactionController.getAllTransactions,
);

// Get transaction statistics
router.get(
  "/statistics",
  authorize(["admin", "manager"]),
  currencyTransactionController.getStatistics,
);

// Get transaction by ID
router.get(
  "/:transactionId",
  authorize(["admin", "manager", "staff"]),
  currencyTransactionController.getTransactionById,
);

// Create new currency transaction
router.post(
  "/",
  authorize(["admin", "manager", "staff"]),
  validateCurrencyTransaction,
  currencyTransactionController.createTransaction,
);

// Upload receipt for payment account
router.post(
  "/:transactionId/receipt/:accountIndex",
  authorize(["admin", "manager", "staff"]),
  currencyTransactionController.uploadReceipt,
);

// Verify payment receipt
router.put(
  "/:transactionId/receipt/:accountIndex/verify",
  authorize(["admin", "manager"]),
  currencyTransactionController.verifyReceipt,
);

// Update transaction status
router.put(
  "/:transactionId/status",
  authorize(["admin", "manager"]),
  currencyTransactionController.updateStatus,
);

module.exports = router;
