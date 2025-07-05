const express = require('express');
const router = express.Router();
const AccountingService = require('../services/accounting');
const TransactionService = require('../services/TransactionService');
const AccountService = require('../services/AccountService');
const { validate } = require('../middleware/validation');
const { auth, authorize, tenantAccess } = require('../middleware/auth'); // Added tenantAccess
const logger = require('../utils/logger');
const { body, param } = require('express-validator');

// Apply authentication and tenant isolation middleware to all accounting routes
router.use(auth);
router.use(tenantAccess);

/**
 * @route POST /api/accounting/validate
 * @desc Validate a transaction payload (before saving)
 * @access Private
 */
router.post('/validate', async (req, res) => {
    try {
        const validation = AccountingService.validateTransaction(req.body);
        
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'خطا در اعتبارسنجی تراکنش',
                errors: validation.errors
            });
        }

        res.json({
            success: true,
            message: 'تراکنش معتبر است'
        });
    } catch (error) {
        logger.error('Transaction validation error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'خطا در اعتبارسنجی تراکنش'
        });
    }
});

/**
 * @route POST /api/accounting/calculate
 * @desc Calculate transaction amounts (before saving)
 * @access Private
 */
router.post('/calculate', async (req, res) => {
    try {
        const amounts = AccountingService.calculateTransactionAmounts(req.body);
        res.json(amounts);
    } catch (error) {
        logger.error('Transaction calculation error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'خطا در محاسبه مقادیر'
        });
    }
});

/**
 * @route GET /api/accounting/transactions
 * @desc Get all transactions for the authenticated tenant
 * @access Private
 */
router.get('/transactions', async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const transactions = await TransactionService.getTransactions(tenantId, req.query);
        res.json({
            success: true,
            data: transactions
        });
    } catch (error) {
        logger.error('Error fetching transactions for tenant:', { error: error.message, tenantId: req.user.tenantId });
        res.status(500).json({
            success: false,
            message: error.message || 'خطا در دریافت لیست تراکنش‌ها'
        });
    }
});

/**
 * @route POST /api/accounting/transactions
 * @desc Create a new transaction for the authenticated tenant
 * @access Private
 */
router.post('/transactions',
    [
        body('customer_id').notEmpty().withMessage('شناسه مشتری الزامی است'),
        body('type').notEmpty().withMessage('نوع تراکنش الزامی است'),
        validate
    ],
    async (req, res) => {
        try {
            const tenantId = req.user.tenantId;
            const userId = req.user.userId;
            const userName = req.user.userName;
            const customerId = req.body.customer_id;

            const customerAccounts = await AccountService.getAccounts(tenantId, { customer_id: customerId });
            if (customerAccounts.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'حساب مشتری یافت نشد.'
                });
            }
            const accountId = customerAccounts[0].id;

            const validation = AccountingService.validateTransaction(req.body);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'خطا در اعتبارسنجی داده‌های تراکنش',
                    errors: validation.errors
                });
            }

            const newTransaction = await TransactionService.createTransaction(tenantId, userId, userName, req.body, accountId);
            res.status(201).json({
                success: true,
                message: 'تراکنش با موفقیت ثبت شد',
                data: newTransaction
            });
        } catch (error) {
            logger.error('Error creating transaction:', { error: error.message, tenantId: req.user.tenantId, body: req.body });
            res.status(500).json({
                success: false,
                message: error.message || 'خطا در ثبت تراکنش جدید'
            });
        }
    }
);

/**
 * @route GET /api/accounting/balances/:accountId
 * @desc Get account balances for a specific account and authenticated tenant
 * @access Private
 */
router.get('/balances/:accountId',
    [
        param('accountId').isMongoId().withMessage('شناسه حساب نامعتبر است'),
        validate
    ],
    async (req, res) => {
        try {
            const tenantId = req.user.tenantId;
            const accountId = req.params.accountId;
            const account = await AccountService.getAccount(tenantId, accountId);

            const balances = {
                aedBalance: account.balances.get('AED')?.available || 0,
                irrBalance: account.balances.get('IRR')?.available || 0,
                aedUnconverted: account.balances.get('AED')?.unconverted || 0,
                irrUnconverted: account.balances.get('IRR')?.unconverted || 0,
                receivedIRR: 0,
                receivedAED: 0,
                amountAED: 0,
                amountIRR: 0,
                withdrawalAED: 0,
                withdrawalIRR: 0,
            };

            balances.aedStatus = AccountingService.determineAccountStatus(balances.aedBalance);
            balances.irrStatus = AccountingService.determineAccountStatus(balances.irrBalance);

            res.json({
                success: true,
                data: balances
            });
        } catch (error) {
            logger.error('Balance calculation error:', { error: error.message, tenantId: req.user.tenantId, accountId: req.params.accountId });
            res.status(500).json({
                success: false,
                message: error.message || 'خطا در محاسبه موجودی‌ها'
            });
        }
    }
);

module.exports = router; 
