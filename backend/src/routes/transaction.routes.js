const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const { auth } = require('../middleware/auth');
const { tenantAccess } = require('../middleware/tenant');
const { validateTransaction } = require('../middleware/validators');

// Get all transactions for a tenant
router.get('/tenants/:tenantId/transactions', 
    auth,
    tenantAccess,
    transactionController.getTransactions
);

// Create new transaction
router.post('/tenants/:tenantId/transactions', 
    auth,
    tenantAccess,
    validateTransaction,
    transactionController.createTransaction
);

// Get transaction by ID
router.get('/tenants/:tenantId/transactions/:transactionId',
    auth,
    tenantAccess,
    transactionController.getTransactionById
);

// Update transaction status
router.patch('/tenants/:tenantId/transactions/:transactionId/status',
    auth,
    tenantAccess,
    transactionController.updateTransactionStatus
);

// Get transaction statistics
router.get('/tenants/:tenantId/transactions/stats',
    auth,
    tenantAccess,
    transactionController.getTransactionStats
);

// Export transactions
router.get('/tenants/:tenantId/transactions/export',
    auth,
    tenantAccess,
    transactionController.exportTransactions
);

// Get all transactions for the logged-in customer (customer portal)
router.get('/my-transactions', auth, tenantAccess, (req, res, next) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ success: false, message: 'دسترسی غیرمجاز' });
  }
  next();
}, (req, res) => transactionController.getMyTransactions(req, res));

// Get all pending deposits for the logged-in customer (customer portal)
router.get('/my-pending-deposits', auth, tenantAccess, (req, res, next) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ success: false, message: 'دسترسی غیرمجاز' });
  }
  next();
}, (req, res) => transactionController.getMyPendingDeposits(req, res));

// Create a new buy/sell order for the logged-in customer (customer portal)
router.post('/my-orders', auth, tenantAccess, (req, res, next) => {
  if (req.user.role !== 'customer') {
    return res.status(403).json({ success: false, message: 'دسترسی غیرمجاز' });
  }
  next();
}, (req, res) => transactionController.createMyOrder(req, res));

// ویرایش تراکنش
router.put('/tenants/:tenantId/transactions/:transactionId',
    auth,
    tenantAccess,
    transactionController.updateTransaction
);

// حذف تراکنش
router.delete('/tenants/:tenantId/transactions/:transactionId',
    auth,
    tenantAccess,
    transactionController.deleteTransaction
);

module.exports = router; 