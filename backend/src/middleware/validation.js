const { body, param, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');
// const i18n = require('../utils/i18n'); // Unused

// Common validation rules
const commonRules = {
    email: body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('ایمیل نامعتبر است'),
    
    password: body('password')
        .isLength({ min: 8 })
        .withMessage('رمز عبور باید حداقل 8 کاراکتر باشد')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        .withMessage('رمز عبور باید شامل حروف بزرگ، حروف کوچک، اعداد و کاراکترهای خاص باشد'),
    
    phone: body('phone')
        .matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/)
        .withMessage('شماره تلفن نامعتبر است'),
    
    amount: body('amount')
        .isFloat({ min: 0 })
        .withMessage('مبلغ باید عدد مثبت باشد'),
    
    currency: body('currency')
        .isIn(['USD', 'EUR', 'AED', 'IRR', 'GBP'])
        .withMessage('ارز نامعتبر است'),
    
    date: body('date')
        .isISO8601()
        .withMessage('تاریخ نامعتبر است'),
    
    id: param('id')
        .isMongoId()
        .withMessage('شناسه نامعتبر است')
};

// Transaction validation rules
const transactionRules = {
    create: [
        commonRules.amount,
        commonRules.currency,
        commonRules.date,
        body('type')
            .isIn(['buy', 'sell', 'transfer', 'exchange'])
            .withMessage('نوع تراکنش نامعتبر است'),
        body('customerId')
            .isMongoId()
            .withMessage('شناسه مشتری نامعتبر است'),
        body('description')
            .optional()
            .isString()
            .trim()
            .isLength({ max: 500 })
            .withMessage('توضیحات نباید بیشتر از 500 کاراکتر باشد')
    ],
    
    update: [
        param('transactionId').isMongoId().withMessage('شناسه تراکنش نامعتبر است'),
        commonRules.amount.optional(),
        commonRules.currency.optional(),
        commonRules.date.optional(),
        body('type')
            .optional()
            .isIn(['buy', 'sell', 'transfer', 'exchange'])
            .withMessage('نوع تراکنش نامعتبر است'),
        body('description')
            .optional()
            .isString()
            .trim()
            .isLength({ max: 500 })
            .withMessage('توضیحات نباید بیشتر از 500 کاراکتر باشد')
    ]
};

// Customer validation rules
const customerRules = {
    create: [
        body('name')
            .isString()
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('نام باید بین 2 تا 100 کاراکتر باشد'),
        commonRules.email,
        commonRules.phone,
        body('nationalId')
            .optional()
            .isString()
            .matches(/^[0-9]{10}$/)
            .withMessage('کد ملی نامعتبر است'),
        body('address')
            .optional()
            .isString()
            .trim()
            .isLength({ max: 500 })
            .withMessage('آدرس نباید بیشتر از 500 کاراکتر باشد')
    ],
    
    update: [
        param('customerId').isMongoId().withMessage('شناسه مشتری نامعتبر است'),
        body('name')
            .optional()
            .isString()
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('نام باید بین 2 تا 100 کاراکتر باشد'),
        commonRules.email.optional(),
        commonRules.phone.optional(),
        body('nationalId')
            .optional()
            .isString()
            .matches(/^[0-9]{10}$/)
            .withMessage('کد ملی نامعتبر است'),
        body('address')
            .optional()
            .isString()
            .trim()
            .isLength({ max: 500 })
            .withMessage('آدرس نباید بیشتر از 500 کاراکتر باشد')
    ]
};

// User validation rules
const userRules = {
    create: [
        body('name')
            .isString()
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('نام باید بین 2 تا 100 کاراکتر باشد'),
        commonRules.email,
        commonRules.password,
        body('role')
            .isIn(['admin', 'manager', 'operator', 'viewer'])
            .withMessage('نقش نامعتبر است'),
        body('permissions')
            .isArray()
            .withMessage('دسترسی‌ها باید به صورت آرایه باشند'),
        body('permissions.*')
            .isString()
            .withMessage('هر دسترسی باید رشته باشد')
    ],
    
    update: [
        param('userId').isMongoId().withMessage('شناسه کاربر نامعتبر است'),
        body('name')
            .optional()
            .isString()
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage('نام باید بین 2 تا 100 کاراکتر باشد'),
        commonRules.email.optional(),
        commonRules.password.optional(),
        body('role')
            .optional()
            .isIn(['admin', 'manager', 'operator', 'viewer'])
            .withMessage('نقش نامعتبر است'),
        body('permissions')
            .optional()
            .isArray()
            .withMessage('دسترسی‌ها باید به صورت آرایه باشند'),
        body('permissions.*')
            .optional()
            .isString()
            .withMessage('هر دسترسی باید رشته باشد')
    ]
};

// Validation middleware
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn('Validation error', {
            path: req.path,
            method: req.method,
            errors: errors.array()
        });
        
        return res.status(400).json({
            success: false,
            message: 'خطا در اعتبارسنجی داده‌ها',
            errors: errors.array(),
            code: 'VALIDATION_ERROR'
        });
    }
    next();
};

// Validation for currency transactions
exports.validateCurrencyTransaction = [
  body('customerId')
    .isMongoId()
    .withMessage('customerId must be a valid MongoDB ID'),
  
  body('type')
    .isIn(['buy', 'sell', 'exchange', 'remittance'])
    .withMessage('type must be one of: buy, sell, exchange, remittance'),
  
  body('currencyFrom')
    .isLength({ min: 3, max: 3 })
    .isUppercase()
    .withMessage('currencyFrom must be a 3-letter currency code'),
  
  body('amountFrom')
    .isFloat({ min: 0.01 })
    .withMessage('amountFrom must be a positive number'),
  
  body('currencyTo')
    .isLength({ min: 3, max: 3 })
    .isUppercase()
    .withMessage('currencyTo must be a 3-letter currency code'),
  
  body('amountTo')
    .isFloat({ min: 0.01 })
    .withMessage('amountTo must be a positive number'),
  
  body('exchangeRate')
    .isFloat({ min: 0.000001 })
    .withMessage('exchangeRate must be a positive number'),
  
  body('rateType')
    .isIn(['buy', 'sell'])
    .withMessage('rateType must be either buy or sell'),
  
  body('counterparty.tenantId')
    .optional()
    .isMongoId()
    .withMessage('counterparty.tenantId must be a valid MongoDB ID'),
  
  body('counterparty.name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('counterparty.name must be between 2 and 100 characters'),
  
  body('counterparty.country')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('counterparty.country must be between 2 and 50 characters'),
  
  body('fees.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('fees.amount must be a non-negative number'),
  
  body('fees.currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .isUppercase()
    .withMessage('fees.currency must be a 3-letter currency code'),
  
  body('discount.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('discount.amount must be a non-negative number'),
  
  body('discount.currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .isUppercase()
    .withMessage('discount.currency must be a 3-letter currency code'),
  
  body('paymentSplit.totalAmount')
    .isFloat({ min: 0.01 })
    .withMessage('paymentSplit.totalAmount must be a positive number'),
  
  body('paymentSplit.accounts')
    .isArray({ min: 1 })
    .withMessage('paymentSplit.accounts must be a non-empty array'),
  
  body('paymentSplit.accounts.*.accountNumber')
    .isLength({ min: 5, max: 50 })
    .withMessage('accountNumber must be between 5 and 50 characters'),
  
  body('paymentSplit.accounts.*.accountName')
    .isLength({ min: 2, max: 100 })
    .withMessage('accountName must be between 2 and 100 characters'),
  
  body('paymentSplit.accounts.*.bankName')
    .isLength({ min: 2, max: 100 })
    .withMessage('bankName must be between 2 and 100 characters'),
  
  body('paymentSplit.accounts.*.amount')
    .isFloat({ min: 0.01 })
    .withMessage('account amount must be a positive number'),
  
  body('delivery.method')
    .isIn(['bank_transfer', 'cash_pickup', 'account_credit'])
    .withMessage('delivery.method must be one of: bank_transfer, cash_pickup, account_credit'),
  
  body('delivery.recipient.name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('recipient.name must be between 2 and 100 characters'),
  
  body('delivery.recipient.idNumber')
    .optional()
    .isLength({ min: 5, max: 20 })
    .withMessage('recipient.idNumber must be between 5 and 20 characters'),
  
  body('delivery.bankAccount.bankName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('bankAccount.bankName must be between 2 and 100 characters'),
  
  body('delivery.bankAccount.accountNumber')
    .optional()
    .isLength({ min: 5, max: 50 })
    .withMessage('bankAccount.accountNumber must be between 5 and 50 characters'),
  
  body('delivery.bankAccount.accountHolder')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('bankAccount.accountHolder must be between 2 and 100 characters'),
  
  body('delivery.pickupLocation.address')
    .optional()
    .isLength({ min: 10, max: 200 })
    .withMessage('pickupLocation.address must be between 10 and 200 characters'),
  
  body('delivery.pickupLocation.city')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('pickupLocation.city must be between 2 and 50 characters'),
  
  body('delivery.pickupLocation.country')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('pickupLocation.country must be between 2 and 50 characters')
];

// Validation for transaction ID parameter
exports.validateTransactionId = [
  param('transactionId')
    .isMongoId()
    .withMessage('transactionId must be a valid MongoDB ID')
];

// Validation for account index parameter
exports.validateAccountIndex = [
  param('accountIndex')
    .isInt({ min: 0 })
    .withMessage('accountIndex must be a non-negative integer')
];

// Validation for status update
exports.validateStatusUpdate = [
  body('status')
    .isIn(['pending_payment', 'partial_paid', 'payment_complete', 'processing', 'completed', 'cancelled', 'failed'])
    .withMessage('status must be a valid transaction status'),
  
  body('reason')
    .optional()
    .isLength({ min: 5, max: 500 })
    .withMessage('reason must be between 5 and 500 characters')
];

// Validation for receipt verification
exports.validateReceiptVerification = [
  body('verified')
    .isBoolean()
    .withMessage('verified must be a boolean value')
];

// Validation for VIP customer
exports.validateVIPCustomer = [
  body('customerId')
    .isMongoId()
    .withMessage('customerId must be a valid MongoDB ID'),
  
  body('vipLevel')
    .isIn(['regular', 'loyal', 'vip', 'premium'])
    .withMessage('vipLevel must be one of: regular, loyal, vip, premium'),
  
  body('bankAccount.accountNumber')
    .optional()
    .isLength({ min: 5, max: 50 })
    .withMessage('bankAccount.accountNumber must be between 5 and 50 characters'),
  
  body('bankAccount.accountHolder')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('bankAccount.accountHolder must be between 2 and 100 characters'),
  
  body('bankAccount.bankName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('bankAccount.bankName must be between 2 and 100 characters'),
  
  body('limits.daily')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('limits.daily must be a non-negative number'),
  
  body('limits.monthly')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('limits.monthly must be a non-negative number'),
  
  body('limits.singleTransaction')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('limits.singleTransaction must be a non-negative number'),
  
  body('discounts.commission')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('discounts.commission must be between 0 and 100'),
  
  body('discounts.exchangeRate')
    .optional()
    .isFloat({ min: 0, max: 5 })
    .withMessage('discounts.exchangeRate must be between 0 and 5')
];

// Validation for exchange rate
exports.validateExchangeRate = [
  body('currencyPair.from')
    .isLength({ min: 3, max: 3 })
    .isUppercase()
    .withMessage('currencyPair.from must be a 3-letter currency code'),
  
  body('currencyPair.to')
    .isLength({ min: 3, max: 3 })
    .isUppercase()
    .withMessage('currencyPair.to must be a 3-letter currency code'),
  
  body('rates.buy')
    .isFloat({ min: 0.000001 })
    .withMessage('rates.buy must be a positive number'),
  
  body('rates.sell')
    .isFloat({ min: 0.000001 })
    .withMessage('rates.sell must be a positive number'),
  
  body('vipRates.buy')
    .optional()
    .isFloat({ min: 0.000001 })
    .withMessage('vipRates.buy must be a positive number'),
  
  body('vipRates.sell')
    .optional()
    .isFloat({ min: 0.000001 })
    .withMessage('vipRates.sell must be a positive number'),
  
  body('vipRates.discount')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('vipRates.discount must be between 0 and 100'),
  
  body('limits.minAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('limits.minAmount must be a non-negative number'),
  
  body('limits.maxAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('limits.maxAmount must be a non-negative number'),
  
  body('limits.dailyLimit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('limits.dailyLimit must be a non-negative number'),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('status must be one of: active, inactive, suspended'),
  
  body('source')
    .optional()
    .isIn(['manual', 'api', 'bank', 'market'])
    .withMessage('source must be one of: manual, api, bank, market'),
  
  body('validity.from')
    .optional()
    .isISO8601()
    .withMessage('validity.from must be a valid date'),
  
  body('validity.to')
    .optional()
    .isISO8601()
    .withMessage('validity.to must be a valid date')
];

// Validation for query parameters
exports.validateQueryParams = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
  
  query('status')
    .optional()
    .isIn(['pending_payment', 'partial_paid', 'payment_complete', 'processing', 'completed', 'cancelled', 'failed'])
    .withMessage('status must be a valid transaction status'),
  
  query('type')
    .optional()
    .isIn(['buy', 'sell', 'exchange', 'remittance'])
    .withMessage('type must be a valid transaction type'),
  
  query('period')
    .optional()
    .isIn(['day', 'week', 'month', 'year'])
    .withMessage('period must be one of: day, week, month, year')
];

// Export validation rules and middleware
module.exports = {
    commonRules,
    transactionRules,
    customerRules,
    userRules,
    validate,
    validateCurrencyTransaction: exports.validateCurrencyTransaction,
    validateTransactionId: exports.validateTransactionId,
    validateAccountIndex: exports.validateAccountIndex,
    validateStatusUpdate: exports.validateStatusUpdate,
    validateReceiptVerification: exports.validateReceiptVerification,
    validateVIPCustomer: exports.validateVIPCustomer,
    validateExchangeRate: exports.validateExchangeRate,
    validateQueryParams: exports.validateQueryParams
}; 