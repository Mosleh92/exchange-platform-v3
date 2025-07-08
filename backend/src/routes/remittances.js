const express = require("express");
const router = express.Router();
const remittanceController = require("../controllers/remittance.controller");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const rateLimit = require("express-rate-limit");

// Customer routes
router.post(
  "/create",
  authenticateToken,
  remittanceController.createRemittance,
);
router.get(
  "/my-remittances",
  authenticateToken,
  remittanceController.getCustomerRemittances,
);
router.get(
  "/:remittanceId",
  authenticateToken,
  remittanceController.getRemittance,
);
router.post(
  "/:remittanceId/payment",
  authenticateToken,
  remittanceController.addPayment,
);
router.post(
  "/:remittanceId/cancel",
  authenticateToken,
  remittanceController.cancelRemittance,
);

// Staff routes
router.post(
  "/:remittanceId/approve",
  authenticateToken,
  authorizeRoles(["staff", "manager", "admin"]),
  remittanceController.approveRemittance,
);

router.post(
  "/:remittanceId/process",
  authenticateToken,
  authorizeRoles(["staff", "manager", "admin"]),
  remittanceController.processRemittance,
);

router.post(
  "/:remittanceId/complete",
  authenticateToken,
  authorizeRoles(["staff", "manager", "admin"]),
  remittanceController.completeRemittance,
);

// Admin routes
router.get(
  "/stats/overview",
  authenticateToken,
  authorizeRoles(["manager", "admin"]),
  remittanceController.getRemittanceStats,
);

// Inter-branch remittance (رمزدار بین شعب)
router.post(
  "/inter-branch",
  authenticateToken,
  authorizeRoles(["staff", "manager", "admin"]),
  remittanceController.createInterBranchRemittance,
);

const redeemLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // هر ۱۰ دقیقه
  max: 5, // حداکثر ۵ تلاش
  message: { error: "تعداد تلاش بیش از حد مجاز است. لطفاً بعداً امتحان کنید." },
});

router.post(
  "/inter-branch/redeem",
  redeemLimiter,
  authenticateToken,
  authorizeRoles(["staff", "manager", "admin"]),
  remittanceController.redeemInterBranchRemittance,
);

// تایید دریافت حواله در شعبه مقصد
router.post(
  "/inter-branch/confirm-receipt",
  authenticateToken,
  authorizeRoles(["staff", "manager", "admin"]),
  remittanceController.confirmInterBranchRemittanceReceipt,
);

module.exports = router;
