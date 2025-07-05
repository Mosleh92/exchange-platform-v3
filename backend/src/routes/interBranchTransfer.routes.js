const express = require('express');
const router = express.Router();
const interBranchTransferController = require('../controllers/interBranchTransfer.controller');
const { auth } = require('../middleware/auth');
const { tenantAccess } = require('../middleware/tenant');
const { validateInterBranchTransfer } = require('../middleware/validators');

// Apply middleware to all routes
router.use(auth);
router.use(tenantAccess);

// Get all transfers
router.get('/', interBranchTransferController.getAllTransfers);

// Create new transfer
router.post('/', validateInterBranchTransfer, interBranchTransferController.createTransfer);

// Get transfer by ID
router.get('/:transferId', interBranchTransferController.getTransferById);

// Approve transfer
router.post('/:transferId/approve', interBranchTransferController.approveTransfer);

// Reject transfer
router.post('/:transferId/reject', interBranchTransferController.rejectTransfer);

// Verify transfer
router.post('/:transferId/verify', interBranchTransferController.verifyTransfer);

// Complete transfer
router.post('/:transferId/complete', interBranchTransferController.completeTransfer);

// Cancel transfer
router.post('/:transferId/cancel', interBranchTransferController.cancelTransfer);

// Get pending transfers
router.get('/pending/list', interBranchTransferController.getPendingTransfers);

// Get transfers by status
router.get('/status/:status', interBranchTransferController.getTransfersByStatus);

// Get transfer statistics
router.get('/stats/summary', interBranchTransferController.getTransferStats);

module.exports = router; 