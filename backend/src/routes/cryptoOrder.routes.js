const express = require('express');
const router = express.Router();
const cryptoOrderController = require('../controllers/cryptoOrder.controller');
const { auth, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validators');

// ایجاد سفارش
router.post('/', auth, validate, cryptoOrderController.createOrder);
// دریافت لیست سفارش‌های کاربر
router.get('/', auth, cryptoOrderController.getOrders);
// دریافت جزئیات سفارش
router.get('/:id', auth, cryptoOrderController.getOrderById);
// آپلود رسید یا هش
router.put('/:id/receipt', auth, validate, cryptoOrderController.uploadReceipt);
// لغو سفارش
router.put('/:id/cancel', auth, cryptoOrderController.cancelOrder);
// تایید یا رد سفارش توسط اپراتور (فقط نقش اپراتور/ادمین)
router.put('/:id/verify', auth, authorize('manager', 'staff', 'tenant_admin', 'super_admin'), validate, cryptoOrderController.verifyOrder);
// تسویه سفارش (فقط نقش اپراتور/ادمین)
router.put('/:id/settle', auth, authorize('manager', 'staff', 'tenant_admin', 'super_admin'), validate, cryptoOrderController.settleOrder);
// ثبت معامله حضوری توسط اپراتور
router.post('/inperson', auth, authorize('manager', 'staff', 'tenant_admin', 'super_admin'), validate, cryptoOrderController.createInPersonOrder);
// علامت‌گذاری پرداخت نقدی (برای خرید)
router.put('/:id/mark-cash-paid', auth, authorize('manager', 'staff', 'tenant_admin', 'super_admin'), cryptoOrderController.markCashPaid);
// علامت‌گذاری دریافت نقدی (برای فروش)
router.put('/:id/mark-cash-received', auth, authorize('manager', 'staff', 'tenant_admin', 'super_admin'), cryptoOrderController.markCashReceived);
// تایید نهایی معامله توسط مدیر شعبه
router.put('/:id/mark-verified', auth, authorize('tenant_admin', 'super_admin'), cryptoOrderController.markVerified);
// گزارش معاملات دیجیتال (دسترسی مدیر و سوپرادمین)
router.get('/report/orders', auth, authorize('tenant_admin', 'super_admin'), cryptoOrderController.reportOrders);
// هشدار معاملات ناقص (دسترسی مدیر و سوپرادمین)
router.get('/alerts/pending', auth, authorize('tenant_admin', 'super_admin'), cryptoOrderController.pendingAlerts);

module.exports = router; 