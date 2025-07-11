// backend/src/routes/financial/index.js
const express = require('express');
const { body, param, query } = require('express-validator');
const FinancialController = require('../../controllers/financial.controller');
const authMiddleware = require('../../middleware/auth');
const tenantMiddleware = require('../../middleware/tenant');
const rateLimitMiddleware = require('../../middleware/rateLimit');

const router = express.Router();

// Validation rules
const currencyExchangeValidation = [
    body('fromCurrency')
        .isLength({ min: 3, max: 3 })
        .withMessage('ارز مبدأ باید کد سه حرفی باشد'),
    body('toCurrency')
        .isLength({ min: 3, max: 3 })
        .withMessage('ارز مقصد باید کد سه حرفی باشد'),
    body('sourceAmount')
        .isFloat({ min: 0.01 })
        .withMessage('مقدار مبدأ باید بیشتر از صفر باشد'),
    body('destinationAmount')
        .isFloat({ min: 0.01 })
        .withMessage('مقدار مقصد باید بیشتر از صفر باشد'),
    body('exchangeRate')
        .isFloat({ min: 0.0001 })
        .withMessage('نرخ ارز باید بیشتر از صفر باشد'),
    body('feeAmount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('مقدار کارمزد باید صفر یا مثبت باشد'),
    body('description')
        .isLength({ min: 1, max: 500 })
        .withMessage('توضیحات ضروری است'),
    body('reference')
        .optional()
        .isLength({ max: 100 })
        .withMessage('رفرنس نباید بیشتر از 100 کاراکتر باشد'),
    body('externalReference')
        .optional()
        .isLength({ max: 255 })
        .withMessage('رفرنس خارجی نباید بیشتر از 255 کاراکتر باشد')
];

const depositValidation = [
    body('currency')
        .isLength({ min: 3, max: 3 })
        .withMessage('ارز باید کد سه حرفی باشد'),
    body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('مقدار واریز باید بیشتر از صفر باشد'),
    body('description')
        .isLength({ min: 1, max: 500 })
        .withMessage('توضیحات ضروری است'),
    body('reference')
        .optional()
        .isLength({ max: 100 })
        .withMessage('رفرنس نباید بیشتر از 100 کاراکتر باشد')
];

const withdrawalValidation = [
    body('currency')
        .isLength({ min: 3, max: 3 })
        .withMessage('ارز باید کد سه حرفی باشد'),
    body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('مقدار برداشت باید بیشتر از صفر باشد'),
    body('description')
        .isLength({ min: 1, max: 500 })
        .withMessage('توضیحات ضروری است'),
    body('reference')
        .optional()
        .isLength({ max: 100 })
        .withMessage('رفرنس نباید بیشتر از 100 کاراکتر باشد')
];

const transactionIdValidation = [
    param('transactionId')
        .isUUID()
        .withMessage('شناسه تراکنش نامعتبر است')
];

const currencyValidation = [
    param('currency')
        .isLength({ min: 3, max: 3 })
        .withMessage('کد ارز باید سه حرفی باشد')
];

const dateRangeValidation = [
    query('startDate')
        .isISO8601()
        .withMessage('تاریخ شروع نامعتبر است'),
    query('endDate')
        .isISO8601()
        .withMessage('تاریخ پایان نامعتبر است')
];

const reportTypeValidation = [
    param('reportType')
        .isIn(['trial_balance', 'transaction_summary', 'account_reconciliation'])
        .withMessage('نوع گزارش نامعتبر است')
];

// Apply middleware to all routes
router.use(authMiddleware);
router.use(tenantMiddleware);

// Financial transaction routes
router.post('/exchange', 
    rateLimitMiddleware({ windowMs: 60000, max: 10 }), // 10 requests per minute
    currencyExchangeValidation,
    FinancialController.createCurrencyExchange
);

router.post('/deposit',
    rateLimitMiddleware({ windowMs: 60000, max: 5 }), // 5 requests per minute
    depositValidation,
    FinancialController.createDeposit
);

router.post('/withdrawal',
    rateLimitMiddleware({ windowMs: 60000, max: 5 }), // 5 requests per minute  
    withdrawalValidation,
    FinancialController.createWithdrawal
);

// Transaction management routes
router.get('/transaction/:transactionId',
    transactionIdValidation,
    FinancialController.getTransaction
);

router.post('/transaction/:transactionId/cancel',
    rateLimitMiddleware({ windowMs: 300000, max: 3 }), // 3 requests per 5 minutes
    transactionIdValidation,
    body('reason')
        .isLength({ min: 1, max: 500 })
        .withMessage('دلیل لغو ضروری است'),
    FinancialController.cancelTransaction
);

// Account and balance routes
router.get('/account/:currency/balance',
    currencyValidation,
    FinancialController.getAccountBalance
);

// Statistics and reporting routes
router.get('/stats',
    dateRangeValidation,
    FinancialController.getFinancialStats
);

router.get('/report/:reportType',
    reportTypeValidation,
    FinancialController.generateFinancialReport
);

// System health check
router.get('/health',
    FinancialController.healthCheck
);

module.exports = router;