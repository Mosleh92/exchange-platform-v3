const express = require('express');
const router = express.Router();
const debtController = require('../controllers/debt.controller');
const { auth } = require('../middleware/auth');
const { tenantAccess } = require('../middleware/tenant');
const { validateDebt } = require('../middleware/validators');
const { authorize } = require('../middleware/roleAccess');

// Apply middleware to all routes
router.use(auth);
router.use(tenantAccess);

// Get all debts
router.get('/all', authorize(['tenant_admin', 'branch_manager']), debtController.getAllDebts);

// Create new debt
router.post('/', validateDebt, debtController.createDebt);

// Get debt by ID
router.get('/:debtId', debtController.getDebtById);

// Update debt
router.put('/:debtId', debtController.updateDebt);

// Add payment to debt
router.post('/:debtId/payment', debtController.addPayment);

// Send notification
router.post('/:debtId/notification', debtController.sendNotification);

// Settle debt
router.post('/:debtId/settle', debtController.settleDebt);

// Write off debt
router.post('/:debtId/write-off', debtController.writeOffDebt);

// Get overdue debts
router.get('/overdue/list', debtController.getOverdueDebts);

// Get debt statistics
router.get('/stats/summary', debtController.getDebtStats);

module.exports = router; 