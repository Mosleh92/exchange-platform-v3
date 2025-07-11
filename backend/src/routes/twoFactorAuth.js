// backend/src/routes/twoFactorAuth.js
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const TwoFactorAuthController = require('../controllers/twoFactorAuthController');
const { authenticate, authorize } = require('../middleware/auth');
const { require2FA, log2FAUsage } = require('../middleware/twoFactorAuthMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

// Apply authentication to all routes
router.use(authenticate);
router.use(log2FAUsage);

// Generate 2FA secret
router.post('/generate-secret',
    rateLimiter('2fa_generate', 5, 15 * 60 * 1000), // 5 requests per 15 minutes
    TwoFactorAuthController.generateSecret
);

// Verify and enable 2FA
router.post('/verify-enable',
    rateLimiter('2fa_verify', 10, 15 * 60 * 1000), // 10 requests per 15 minutes
    [
        body('token')
            .isLength({ min: 6, max: 8 })
            .withMessage('کد 2FA باید 6 یا 8 کاراکتر باشد')
            .isAlphanumeric()
            .withMessage('کد 2FA باید شامل حروف و اعداد باشد')
    ],
    TwoFactorAuthController.verifyAndEnable
);

// Verify 2FA token
router.post('/verify',
    rateLimiter('2fa_verify', 20, 15 * 60 * 1000), // 20 requests per 15 minutes
    [
        body('token')
            .isLength({ min: 6, max: 8 })
            .withMessage('کد 2FA باید 6 یا 8 کاراکتر باشد')
            .isAlphanumeric()
            .withMessage('کد 2FA باید شامل حروف و اعداد باشد')
    ],
    TwoFactorAuthController.verifyToken
);

// Disable 2FA
router.post('/disable',
    rateLimiter('2fa_disable', 5, 60 * 60 * 1000), // 5 requests per hour
    [
        body('token')
            .isLength({ min: 6, max: 8 })
            .withMessage('کد 2FA باید 6 یا 8 کاراکتر باشد')
            .isAlphanumeric()
            .withMessage('کد 2FA باید شامل حروف و اعداد باشد')
    ],
    TwoFactorAuthController.disable
);

// Get 2FA status
router.get('/status',
    TwoFactorAuthController.getStatus
);

// Regenerate backup codes
router.post('/regenerate-backup-codes',
    rateLimiter('2fa_regenerate', 3, 60 * 60 * 1000), // 3 requests per hour
    [
        body('token')
            .isLength({ min: 6, max: 8 })
            .withMessage('کد 2FA باید 6 یا 8 کاراکتر باشد')
            .isAlphanumeric()
            .withMessage('کد 2FA باید شامل حروف و اعداد باشد')
    ],
    TwoFactorAuthController.regenerateBackupCodes
);

// Generate SMS 2FA code
router.post('/generate-sms',
    rateLimiter('2fa_sms_generate', 5, 15 * 60 * 1000), // 5 requests per 15 minutes
    TwoFactorAuthController.generateSMSCode
);

// Verify SMS 2FA code
router.post('/verify-sms',
    rateLimiter('2fa_sms_verify', 10, 15 * 60 * 1000), // 10 requests per 15 minutes
    [
        body('code')
            .isLength({ min: 6, max: 6 })
            .withMessage('کد SMS باید 6 رقم باشد')
            .isNumeric()
            .withMessage('کد SMS باید عددی باشد')
    ],
    TwoFactorAuthController.verifySMSCode
);

module.exports = router;
