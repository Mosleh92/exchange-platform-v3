const express = require('express');
const SubscriptionController = require('../controllers/subscription.controller');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// خرید اشتراک جدید
router.post('/', auth, authorize('super_admin', 'tenant_admin'), SubscriptionController.createSubscription);
// تمدید اشتراک
router.post('/renew', auth, authorize('super_admin', 'tenant_admin'), SubscriptionController.renewSubscription);
// مشاهده اشتراک فعال
router.get('/active', auth, SubscriptionController.getActiveSubscription);
// تاریخچه اشتراک‌ها
router.get('/history', auth, SubscriptionController.getSubscriptionHistory);

module.exports = router; 