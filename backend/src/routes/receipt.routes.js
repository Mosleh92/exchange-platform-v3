const express = require("express");
const router = express.Router();
const receiptController = require("../controllers/receipt.controller");
const auth = require("../middleware/auth");
const { body } = require("express-validator");
const i18n = require("../utils/i18n");

// Validation rules
const receiptValidation = [
  body("transactionId").isMongoId().withMessage("Invalid transaction ID"),
  body("channels")
    .optional()
    .isArray()
    .withMessage("Channels must be an array"),
  body("channels.*")
    .isIn(["email", "sms", "whatsapp"])
    .withMessage("Invalid channel type"),
];

// Staff routes (requires staff role)
router.use(auth.requireRole(["staff", "manager", "admin"]));

// Generate and send receipt
router.post(
  "/generate",
  receiptValidation,
  receiptController.generateAndSendReceipt,
);

// Get receipts list
router.get("/", receiptController.getReceipts);

// Get specific receipt
router.get("/:receiptId", receiptController.getReceiptById);

// Download receipt PDF
router.get("/:receiptId/download", receiptController.downloadReceiptPDF);

// Resend receipt
router.put("/:receiptId/resend", receiptController.resendReceipt);

// Get receipt statistics
router.get("/statistics/summary", receiptController.getReceiptStatistics);

// Delete receipt
router.delete("/:receiptId", receiptController.deleteReceipt);

// Generate receipts for existing transactions
router.post(
  "/bulk-generate",
  receiptController.generateReceiptsForExistingTransactions,
);

module.exports = router;
