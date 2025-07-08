const express = require("express");
const router = express.Router();
const customerBankingController = require("../controllers/customerBanking.controller");
const auth = require("../middleware/auth");
const { body } = require("express-validator");
const i18n = require("../utils/i18n");

// Validation rules
const transferRequestValidation = [
  body("transferType")
    .isIn(["internal", "external", "bank", "cash", "crypto"])
    .withMessage("Invalid transfer type"),
  body("fromAccount").notEmpty().withMessage("From account is required"),
  body("currency")
    .isLength({ min: 3, max: 3 })
    .isUppercase()
    .withMessage("Currency must be 3 characters"),
  body("amount")
    .isFloat({ min: 0.01 })
    .withMessage("Amount must be greater than 0"),
  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Description too long"),
  body("priority")
    .optional()
    .isIn(["low", "normal", "high", "urgent"])
    .withMessage("Invalid priority"),
];

const createAccountValidation = [
  body("customerId").isMongoId().withMessage("Invalid customer ID"),
  body("accountType")
    .isIn(["savings", "current", "vip", "business"])
    .withMessage("Invalid account type"),
  body("balances")
    .optional()
    .isArray()
    .withMessage("Balances must be an array"),
  body("balances.*.currency")
    .isLength({ min: 3, max: 3 })
    .isUppercase()
    .withMessage("Invalid currency code"),
  body("balances.*.amount")
    .isFloat({ min: 0 })
    .withMessage("Invalid balance amount"),
];

// Customer routes (requires authentication)
router.use(auth.requireAuth);

// Get customer's own account
router.get("/account", customerBankingController.getCustomerAccount);

// Get customer's transactions
router.get("/transactions", customerBankingController.getCustomerTransactions);

// Create transfer request
router.post(
  "/transfer-requests",
  transferRequestValidation,
  customerBankingController.createTransferRequest,
);

// Get customer's transfer requests
router.get(
  "/transfer-requests",
  customerBankingController.getCustomerTransferRequests,
);

// Get specific transfer request
router.get(
  "/transfer-requests/:requestId",
  customerBankingController.getTransferRequestById,
);

// Cancel transfer request
router.put(
  "/transfer-requests/:requestId/cancel",
  customerBankingController.cancelTransferRequest,
);

// Get account statistics
router.get("/statistics", customerBankingController.getAccountStatistics);

// Staff routes (requires staff role)
router.use(auth.requireRole(["staff", "manager", "admin"]));

// Get all customer accounts
router.get("/admin/accounts", customerBankingController.getAllCustomerAccounts);

// Create customer account
router.post(
  "/admin/accounts",
  createAccountValidation,
  customerBankingController.createCustomerAccount,
);

// Process transfer request
router.put(
  "/admin/transfer-requests/:requestId/process",
  customerBankingController.processTransferRequest,
);

module.exports = router;
