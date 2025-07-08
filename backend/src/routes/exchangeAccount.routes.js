const express = require("express");
const router = express.Router();
const exchangeAccountController = require("../controllers/exchangeAccount.controller");
const { auth } = require("../middleware/auth");
const { tenantAccess } = require("../middleware/tenant");
const { validateExchangeAccount } = require("../middleware/validators");
const { authorize } = require("../middleware/roleAccess");

// Apply middleware to all routes
router.use(auth);
router.use(tenantAccess);

// Get all accounts
router.get(
  "/",
  authorize(["tenant_admin", "branch_manager"]),
  exchangeAccountController.getAllAccounts,
);

// Create new account
router.post(
  "/",
  validateExchangeAccount,
  exchangeAccountController.createAccount,
);

// Get account by ID
router.get("/:accountId", exchangeAccountController.getAccountById);

// Get account by number
router.get(
  "/number/:accountNumber",
  exchangeAccountController.getAccountByNumber,
);

// Update account
router.put("/:accountId", exchangeAccountController.updateAccount);

// Deposit to account
router.post("/:accountId/deposit", exchangeAccountController.deposit);

// Withdraw from account
router.post("/:accountId/withdraw", exchangeAccountController.withdraw);

// Calculate interest
router.post(
  "/:accountId/calculate-interest",
  exchangeAccountController.calculateInterest,
);

// Close account
router.post("/:accountId/close", exchangeAccountController.closeAccount);

// Get customer accounts
router.get(
  "/customer/:customerId",
  exchangeAccountController.getCustomerAccounts,
);

// Get account statistics
router.get("/stats/summary", exchangeAccountController.getAccountStats);

// Get all accounts for the logged-in customer (customer portal)
router.get(
  "/my-accounts",
  authorize(["customer"]),
  exchangeAccountController.getMyAccounts,
);

// فقط tenant_admin و branch_manager به لیست همه حساب‌ها دسترسی دارند
router.get(
  "/all",
  authorize(["tenant_admin", "branch_manager"]),
  exchangeAccountController.getAllAccounts,
);

module.exports = router;
