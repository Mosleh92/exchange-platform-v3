const express = require('express');
const router = express.Router();
const { authorize } = require('../middleware/roleAccess');

function validatePayment(req, res, next) { next(); }
const paymentController = {
  createPayment: (req, res) => res.json({ success: true }),
  uploadReceipt: (req, res) => res.json({ success: true }),
  getMyPayments: (req, res) => res.json({ success: true }),
  getPaymentStats: (req, res) => res.json({ success: true }),
  getPendingPayments: (req, res) => res.json({ success: true }),
  getTransactionPayments: (req, res) => res.json({ success: true }),
  getCustomerPayments: (req, res) => res.json({ success: true })
};

// Apply middleware to all routes
router.use(require('../middleware/auth').auth);
router.use(require('../middleware/tenant').tenantAccess);

// Create new payment
router.post('/', validatePayment, paymentController.createPayment);

// Upload single receipt
router.post('/:paymentId/receipt', paymentController.uploadReceipt);

// Get payment statistics
router.get('/stats/summary', paymentController.getPaymentStats);

// Get pending payments
router.get('/pending/list', paymentController.getPendingPayments);

// Get transaction payments
router.get('/transaction/:transactionId', paymentController.getTransactionPayments);

// Get customer payments
router.get('/customer/:customerId', paymentController.getCustomerPayments);

// Only customers can access their own payments
router.get('/my-payments', authorize(['customer']), paymentController.getMyPayments);

module.exports = router;
