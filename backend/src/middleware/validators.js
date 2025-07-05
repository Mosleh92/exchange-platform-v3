const { body, param, validationResult } = require('express-validator'); // Removed unused 'query'

// اعتبارسنجی کاربر
const userValidation = {
  create: [
    body('username').isString().trim().isLength({ min: 3, max: 50 }).withMessage('نام کاربری باید بین ۳ تا ۵۰ کاراکتر باشد'),
    body('email').isEmail().withMessage('ایمیل نامعتبر است'),
    body('password').isLength({ min: 8 }).withMessage('رمز عبور باید حداقل ۸ کاراکتر باشد'),
    body('role').isIn(['super_admin', 'tenant_admin', 'manager', 'staff', 'customer']).withMessage('نقش نامعتبر است')
  ],
  update: [
    param('userId').isMongoId().withMessage('شناسه کاربر نامعتبر است'),
    body('email').optional().isEmail().withMessage('ایمیل نامعتبر است'),
    body('password').optional().isLength({ min: 8 }).withMessage('رمز عبور باید حداقل ۸ کاراکتر باشد'),
    body('role').optional().isIn(['super_admin', 'tenant_admin', 'manager', 'staff', 'customer']).withMessage('نقش نامعتبر است')
  ]
};

// اعتبارسنجی تراکنش
const transactionValidation = {
  create: [
    body('amount').isFloat({ min: 0.01 }).withMessage('مبلغ باید عدد مثبت باشد'),
    body('currency').isIn(['USD', 'EUR', 'AED', 'IRR', 'GBP', 'BTC', 'ETH', 'USDT']).withMessage('ارز نامعتبر است'),
    body('type').isIn(['buy', 'sell', 'exchange', 'deposit', 'withdraw', 'crypto_buy', 'crypto_sell']).withMessage('نوع تراکنش نامعتبر است'),
    body('customerId').isMongoId().withMessage('شناسه مشتری نامعتبر است')
  ],
  update: [
    param('transactionId').isMongoId().withMessage('شناسه تراکنش نامعتبر است'),
    body('amount').optional().isFloat({ min: 0.01 }).withMessage('مبلغ باید عدد مثبت باشد'),
    body('currency').optional().isIn(['USD', 'EUR', 'AED', 'IRR', 'GBP', 'BTC', 'ETH', 'USDT']).withMessage('ارز نامعتبر است'),
    body('type').optional().isIn(['buy', 'sell', 'exchange', 'deposit', 'withdraw', 'crypto_buy', 'crypto_sell']).withMessage('نوع تراکنش نامعتبر است')
  ]
};

// اعتبارسنجی کیف پول دیجیتال
const cryptoWalletValidation = {
  create: [
    body('userId').isMongoId().withMessage('شناسه کاربر نامعتبر است'),
    body('currency').isIn(['BTC', 'ETH', 'USDT']).withMessage('ارز دیجیتال نامعتبر است'),
    body('address').isString().isLength({ min: 10 }).withMessage('آدرس کیف پول نامعتبر است')
  ]
};

// اعتبارسنجی حساب بانکی
const bankAccountValidation = {
  create: [
    body('accountNumber').isString().isLength({ min: 5, max: 50 }).withMessage('شماره حساب نامعتبر است'),
    body('bankName').isString().isLength({ min: 2, max: 100 }).withMessage('نام بانک نامعتبر است'),
    body('accountHolder').isString().isLength({ min: 2, max: 100 }).withMessage('نام صاحب حساب نامعتبر است')
  ]
};

// اعتبارسنجی بدهی
const validateDebt = [
  body('customerId').isMongoId().withMessage('شناسه مشتری نامعتبر است'),
  body('transactionId').isMongoId().withMessage('شناسه تراکنش نامعتبر است'),
  body('originalAmount').isFloat({ min: 0.01 }).withMessage('مبلغ اصلی باید عدد مثبت باشد'),
  body('currency').isIn(['IRR', 'USD', 'EUR', 'AED', 'GBP', 'TRY']).withMessage('ارز نامعتبر است'),
  body('dueDate').isISO8601().withMessage('تاریخ سررسید نامعتبر است'),
  body('interestRate').optional().isFloat({ min: 0, max: 100 }).withMessage('نرخ بهره باید بین 0 تا 100 باشد'),
  body('penaltyRate').optional().isFloat({ min: 0, max: 100 }).withMessage('نرخ جریمه باید بین 0 تا 100 باشد'),
  body('gracePeriod').optional().isInt({ min: 0 }).withMessage('دوره ارفاق باید عدد صحیح مثبت باشد')
];

// Middleware اعتبارسنجی
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'خطا در اعتبارسنجی داده‌ها',
      errors: errors.array(),
      code: 'VALIDATION_ERROR'
    });
  }
  next();
};

// Mock middleware for request validation (for testing)
function validateRequest(req, res, next) {
  return next();
}

module.exports = {
  userValidation,
  transactionValidation,
  cryptoWalletValidation,
  bankAccountValidation,
  validateDebt,
  validate,
  validateRequest
};
