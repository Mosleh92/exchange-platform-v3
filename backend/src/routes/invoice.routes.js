const express = require("express");
const InvoiceController = require("../controllers/invoice.controller");
const { auth, authorize } = require("../middleware/auth");

const router = express.Router();

// صدور فاکتور جدید (معمولاً توسط سیستم یا super_admin)
router.post(
  "/",
  auth,
  authorize("super_admin"),
  InvoiceController.createInvoice,
);
// مشاهده لیست فاکتورهای tenant
router.get("/", auth, InvoiceController.getInvoices);
// مشاهده یک فاکتور خاص
router.get("/:id", auth, InvoiceController.getInvoiceById);
// به‌روزرسانی وضعیت پرداخت (mark as paid)
router.post(
  "/mark-paid",
  auth,
  authorize("super_admin", "tenant_admin"),
  InvoiceController.markAsPaid,
);

module.exports = router;
