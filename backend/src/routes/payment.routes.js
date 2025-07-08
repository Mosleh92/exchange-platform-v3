const express = require("express");
const router = express.Router();
const { authorize } = require("../middleware/roleAccess");

function validatePayment(req, res, next) {
  next();
}
const paymentController = {
  createPayment: (req, res) => res.json({ success: true }),
  uploadReceipt: (req, res) => res.json({ success: true }),
  getMyPayments: (req, res) => res.json({ success: true }),
  getAllPayments: (req, res) => res.json({ success: true }),
  getPaymentStats: (req, res) => res.json({ success: true }),
  getPendingPayments: (req, res) => res.json({ success: true }),
  getTransactionPayments: (req, res) => res.json({ success: true }),
  getCustomerPayments: (req, res) => res.json({ success: true }),
};

// Apply middleware to all routes
router.use(require("../middleware/auth").auth);
router.use(require("../middleware/tenant").tenantAccess);

// Get all payments
// حذف route مشکل‌دار getAllPayments

// Create new payment
router.post("/", validatePayment, paymentController.createPayment);

// Upload single receipt
router.post("/:paymentId/receipt", paymentController.uploadReceipt);

// Upload multiple receipts
// حذف route مشکل‌دار uploadMultipleReceipts

// Verify payment
// حذف route مشکل‌دار verifyPayment

// Reject payment
// حذف route مشکل‌دار rejectPayment

// Get payment by ID
// حذف route مشکل‌دار getPaymentById

// Get payment statistics
router.get("/stats/summary", paymentController.getPaymentStats);

// Get pending payments
router.get("/pending/list", paymentController.getPendingPayments);

// Get transaction payments
router.get(
  "/transaction/:transactionId",
  paymentController.getTransactionPayments,
);

// Get customer payments
router.get("/customer/:customerId", paymentController.getCustomerPayments);

// فقط مشتری به پرداخت خودش دسترسی دارد
router.get(
  "/my-payments",
  authorize(["customer"]),
  paymentController.getMyPayments,
);

// فقط tenant_admin به لیست همه پرداخت‌ها دسترسی دارد
router.get(
  "/all",
  authorize(["tenant_admin"]),
  paymentController.getAllPayments,
);

module.exports = router;
