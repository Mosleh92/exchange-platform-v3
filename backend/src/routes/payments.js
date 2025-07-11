const express = require('express');
const router = express.Router();
const multiStagePaymentService = require('../services/multiStagePayment');
const { validateCSRFToken } = require('../middleware/csrf');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * Multi-stage Payment Routes
 * Handles complex payment workflows with multiple receipts
 */

/**
 * @route POST /api/payments
 * @desc Create new multi-stage payment
 * @access Private
 */
router.post('/', authMiddleware, validateCSRFToken, async (req, res) => {
    try {
        const { dealId } = req.body;

        if (!dealId) {
            return res.status(400).json({
                success: false,
                message: 'شناسه معامله الزامی است'
            });
        }

        const payment = await multiStagePaymentService.createPayment(
            { dealId },
            req.user.id
        );

        res.status(201).json({
            success: true,
            message: 'پرداخت چندمرحله‌ای ایجاد شد',
            data: payment
        });

    } catch (error) {
        logger.error('Error creating multi-stage payment', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'خطا در ایجاد پرداخت',
            error: error.message
        });
    }
});

/**
 * @route POST /api/payments/:id/receipts
 * @desc Add payment receipt to existing payment
 * @access Private
 */
router.post('/:id/receipts', authMiddleware, validateCSRFToken, async (req, res) => {
    try {
        const paymentId = req.params.id;
        const receiptData = req.body;

        // Validate required fields
        const requiredFields = ['receiverName', 'amount', 'receiptUrl'];
        for (const field of requiredFields) {
            if (!receiptData[field]) {
                return res.status(400).json({
                    success: false,
                    message: `فیلد ${field} الزامی است`
                });
            }
        }

        const result = await multiStagePaymentService.addPaymentReceipt(
            paymentId,
            receiptData,
            req.user.id
        );

        res.status(201).json({
            success: true,
            message: result.message,
            data: {
                payment: {
                    id: result.payment._id,
                    status: result.payment.status,
                    paidAmount: result.payment.paidAmount,
                    remainingAmount: result.payment.remainingAmount,
                    totalAmount: result.payment.totalAmount
                },
                receipt: result.receipt
            }
        });

    } catch (error) {
        logger.error('Error adding payment receipt', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'خطا در افزودن رسید پرداخت',
            error: error.message
        });
    }
});

/**
 * @route PUT /api/payments/:id/receipts/:receiptId/verify
 * @desc Verify payment receipt
 * @access Private (Admin roles only)
 */
router.put('/:id/receipts/:receiptId/verify', authMiddleware, validateCSRFToken, async (req, res) => {
    try {
        // Check permissions
        if (!['SuperAdmin', 'TenantAdmin', 'BranchAdmin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'دسترسی به تایید رسید ندارید'
            });
        }

        const { id: paymentId, receiptId } = req.params;
        const { approved, notes } = req.body;

        if (typeof approved !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'وضعیت تایید الزامی است'
            });
        }

        const result = await multiStagePaymentService.verifyReceipt(
            paymentId,
            receiptId,
            { approved, notes },
            req.user.id
        );

        res.json({
            success: true,
            message: result.message,
            data: {
                payment: {
                    id: result.payment._id,
                    status: result.payment.status,
                    paidAmount: result.payment.paidAmount,
                    remainingAmount: result.payment.remainingAmount
                },
                receipt: result.receipt
            }
        });

    } catch (error) {
        logger.error('Error verifying payment receipt', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'خطا در تایید رسید',
            error: error.message
        });
    }
});

/**
 * @route GET /api/payments/:id
 * @desc Get payment details with all receipts and stages
 * @access Private
 */
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const paymentId = req.params.id;

        const paymentDetails = await multiStagePaymentService.getPaymentDetails(
            paymentId,
            req.user.id
        );

        res.json({
            success: true,
            data: paymentDetails
        });

    } catch (error) {
        logger.error('Error fetching payment details', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'خطا در دریافت جزئیات پرداخت',
            error: error.message
        });
    }
});

/**
 * @route GET /api/payments
 * @desc Get list of payments with filtering
 * @access Private
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const {
            status,
            dealId,
            startDate,
            endDate,
            page = 1,
            limit = 20
        } = req.query;

        const mongoose = require('mongoose');
        const Payment = mongoose.model('Payment');

        // Build query based on user role
        const query = {};
        
        if (req.user.role !== 'SuperAdmin') {
            query.tenantId = req.user.tenantId;
            
            if (req.user.role === 'BranchAdmin') {
                query.branchId = req.user.branchId;
            }
        }

        // Add filters
        if (status) query.status = status;
        if (dealId) query.dealId = dealId;
        
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        // Execute query with pagination
        const skip = (page - 1) * limit;
        
        const [payments, total] = await Promise.all([
            Payment.find(query)
                .populate('dealId', 'amount currency type customerInfo')
                .populate('createdBy', 'name username')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Payment.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: payments,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total,
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        logger.error('Error fetching payments list', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'خطا در دریافت لیست پرداخت‌ها',
            error: error.message
        });
    }
});

/**
 * @route GET /api/payments/statistics
 * @desc Get payment statistics
 * @access Private
 */
router.get('/statistics/overview', authMiddleware, async (req, res) => {
    try {
        const { timeframe = '30d' } = req.query;
        
        // Determine tenant based on user role
        let tenantId = null;
        if (req.user.role !== 'SuperAdmin') {
            tenantId = req.user.tenantId;
        }

        const statistics = await multiStagePaymentService.getPaymentStatistics(tenantId, timeframe);

        res.json({
            success: true,
            data: statistics
        });

    } catch (error) {
        logger.error('Error generating payment statistics', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'خطا در تولید آمار پرداخت‌ها',
            error: error.message
        });
    }
});

/**
 * @route POST /api/payments/bulk-upload
 * @desc Upload multiple payment receipts at once
 * @access Private
 */
router.post('/bulk-upload', authMiddleware, validateCSRFToken, async (req, res) => {
    try {
        const { paymentId, receipts } = req.body;

        if (!paymentId || !receipts || !Array.isArray(receipts)) {
            return res.status(400).json({
                success: false,
                message: 'شناسه پرداخت و لیست رسیدها الزامی است'
            });
        }

        const results = [];
        const errors = [];

        // Process each receipt
        for (let i = 0; i < receipts.length; i++) {
            try {
                const result = await multiStagePaymentService.addPaymentReceipt(
                    paymentId,
                    receipts[i],
                    req.user.id
                );
                results.push({
                    index: i,
                    success: true,
                    receipt: result.receipt
                });
            } catch (error) {
                errors.push({
                    index: i,
                    error: error.message,
                    receipt: receipts[i]
                });
            }
        }

        res.json({
            success: errors.length === 0,
            message: `${results.length} رسید با موفقیت آپلود شد، ${errors.length} خطا`,
            data: {
                successful: results,
                failed: errors,
                summary: {
                    total: receipts.length,
                    successful: results.length,
                    failed: errors.length
                }
            }
        });

    } catch (error) {
        logger.error('Error in bulk receipt upload', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'خطا در آپلود دسته‌ای رسیدها',
            error: error.message
        });
    }
});

/**
 * @route DELETE /api/payments/:id/receipts/:receiptId
 * @desc Delete payment receipt (Admin only)
 * @access Private (Admin roles only)
 */
router.delete('/:id/receipts/:receiptId', authMiddleware, validateCSRFToken, async (req, res) => {
    try {
        // Check permissions
        if (!['SuperAdmin', 'TenantAdmin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'دسترسی به حذف رسید ندارید'
            });
        }

        const { id: paymentId, receiptId } = req.params;

        const mongoose = require('mongoose');
        const Payment = mongoose.model('Payment');
        
        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'پرداخت یافت نشد'
            });
        }

        const receipt = payment.receipts.id(receiptId);
        if (!receipt) {
            return res.status(404).json({
                success: false,
                message: 'رسید یافت نشد'
            });
        }

        // Update payment amounts
        payment.paidAmount -= receipt.amount;
        payment.remainingAmount += receipt.amount;
        
        // Remove receipt
        payment.receipts.pull(receiptId);
        
        // Update status
        payment.status = multiStagePaymentService.calculatePaymentStatus(payment);
        payment.updatedAt = new Date();

        await payment.save();

        res.json({
            success: true,
            message: 'رسید حذف شد',
            data: {
                paymentId: payment._id,
                paidAmount: payment.paidAmount,
                remainingAmount: payment.remainingAmount,
                status: payment.status
            }
        });

    } catch (error) {
        logger.error('Error deleting payment receipt', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'خطا در حذف رسید',
            error: error.message
        });
    }
});

module.exports = router;