// backend/src/routes/security.js
const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const SecurityController = require('../controllers/securityController');
const TwoFactorAuthController = require('../controllers/twoFactorAuthController');
const { authenticate, authorize } = require('../middleware/auth');
const { require2FA, enforce2FA } = require('../middleware/twoFactorAuthMiddleware');
const { checkIPWhitelist, enforceIPWhitelist } = require('../middleware/ipWhitelistMiddleware');
const RateLimiterService = require('../services/rateLimiterService');
const SecurityMiddleware = require('../middleware/securityMiddleware');

// Apply authentication to all routes
router.use(authenticate);

// Apply comprehensive security stack
router.use(SecurityMiddleware.createSecurityStack({
    timeout: 30000,
    geolocation: {
        requireVerification: false,
        blockedCountries: ['CN', 'RU'], // Example blocked countries
        allowedCountries: [] // Empty means allow all except blocked
    }
}));

// Apply audit logging middleware
const AuditLogService = require('../services/auditLogService');
router.use(AuditLogService.createMiddleware());

/**
 * Security Dashboard
 */
router.get('/dashboard',
    RateLimiterService.createMiddleware({ rule: 'api' }),
    SecurityController.getSecurityDashboard
);

/**
 * Two-Factor Authentication Routes
 */
router.post('/2fa/generate-secret',
    RateLimiterService.createMiddleware({ rule: 'sensitive' }),
    TwoFactorAuthController.generateSecret
);

router.post('/2fa/verify-enable',
    RateLimiterService.createMiddleware({ rule: 'sensitive' }),
    [
        body('token')
            .isLength({ min: 6, max: 8 })
            .withMessage('کد 2FA باید 6 یا 8 کاراکتر باشد')
            .isAlphanumeric()
            .withMessage('کد 2FA باید شامل حروف و اعداد باشد')
    ],
    TwoFactorAuthController.verifyAndEnable
);

router.post('/2fa/verify',
    RateLimiterService.createMiddleware({ rule: 'auth' }),
    [
        body('token')
            .isLength({ min: 6, max: 8 })
            .withMessage('کد 2FA باید 6 یا 8 کاراکتر باشد')
    ],
    TwoFactorAuthController.verifyToken
);

router.post('/2fa/disable',
    RateLimiterService.createMiddleware({ rule: 'sensitive' }),
    require2FA,
    [
        body('token')
            .isLength({ min: 6, max: 8 })
            .withMessage('کد 2FA باید 6 یا 8 کاراکتر باشد')
    ],
    TwoFactorAuthController.disable
);

router.get('/2fa/status',
    TwoFactorAuthController.getStatus
);

router.post('/2fa/regenerate-backup-codes',
    RateLimiterService.createMiddleware({ rule: 'sensitive' }),
    require2FA,
    [
        body('token')
            .isLength({ min: 6, max: 8 })
            .withMessage('کد 2FA باید 6 یا 8 کاراکتر باشد')
    ],
    TwoFactorAuthController.regenerateBackupCodes
);

/**
 * IP Whitelist Management
 */
router.get('/ip-whitelist',
    SecurityController.getIPWhitelist
);

router.post('/ip-whitelist',
    RateLimiterService.createMiddleware({ rule: 'sensitive' }),
    enforce2FA(['*']),
    [
        body('ip')
            .custom((value) => {
                const { isIPv4, isIPv6 } = require('net');
                // Support CIDR notation
                if (value.includes('/')) {
                    const [ip, prefix] = value.split('/');
                    if (!isIPv4(ip) && !isIPv6(ip)) {
                        throw new Error('آدرس IP نامعتبر است');
                    }
                    const prefixNum = parseInt(prefix);
                    if (isIPv4(ip) && (prefixNum < 0 || prefixNum > 32)) {
                        throw new Error('پیشوند CIDR برای IPv4 نامعتبر است');
                    }
                    if (isIPv6(ip) && (prefixNum < 0 || prefixNum > 128)) {
                        throw new Error('پیشوند CIDR برای IPv6 نامعتبر است');
                    }
                    return true;
                }
                if (!isIPv4(value) && !isIPv6(value)) {
                    throw new Error('آدرس IP نامعتبر است');
                }
                return true;
            }),
        body('description')
            .optional()
            .isLength({ max: 200 })
            .withMessage('توضیحات نباید از 200 کاراکتر بیشتر باشد')
    ],
    SecurityController.addIPToWhitelist
);

router.delete('/ip-whitelist/:ip',
    RateLimiterService.createMiddleware({ rule: 'sensitive' }),
    enforce2FA(['*']),
    [
        param('ip').custom((value) => {
            const { isIPv4, isIPv6 } = require('net');
            if (!isIPv4(value) && !isIPv6(value)) {
                throw new Error('آدرس IP نامعتبر است');
            }
            return true;
        })
    ],
    SecurityController.removeIPFromWhitelist
);

/**
 * API Key Management
 */
router.get('/api-keys',
    SecurityController.getAPIKeys
);

router.post('/api-keys',
    RateLimiterService.createMiddleware({ rule: 'sensitive' }),
    enforce2FA(['*']),
    [
        body('name')
            .isLength({ min: 3, max: 50 })
            .withMessage('نام کلید باید بین 3 تا 50 کاراکتر باشد')
            .matches(/^[a-zA-Z0-9\s\-_]+$/)
            .withMessage('نام کلید شامل کاراکترهای نامعتبر است'),
        body('permissions')
            .isArray()
            .withMessage('مجوزها باید آرایه باشند')
            .custom((permissions) => {
                const validPermissions = [
                    'api.read', 'api.write', 'api.delete',
                    'trade.read', 'trade.create', 'trade.cancel',
                    'wallet.read', 'wallet.deposit', 'wallet.withdraw',
                    'profile.read', 'profile.update'
                ];
                
                for (const perm of permissions) {
                    if (!validPermissions.includes(perm)) {
                        throw new Error(`مجوز نامعتبر: ${perm}`);
                    }
                }
                return true;
            })
    ],
    SecurityController.generateAPIKey
);

router.delete('/api-keys/:keyId',
    RateLimiterService.createMiddleware({ rule: 'sensitive' }),
    enforce2FA(['*']),
    [
        param('keyId').isMongoId().withMessage('شناسه کلید نامعتبر است')
    ],
    SecurityController.deleteAPIKey
);

/**
 * Digital Signature Management
 */
const DigitalSignatureService = require('../services/digitalSignatureService');

router.get('/digital-signature/status',
    async (req, res) => {
        try {
            const status = await DigitalSignatureService.getUserSignatureStatus(req.user.id);
            res.json({ success: true, data: status });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
);

router.post('/digital-signature/generate-keys',
    RateLimiterService.createMiddleware({ rule: 'sensitive' }),
    enforce2FA(['*']),
    async (req, res) => {
        try {
            const keys = await DigitalSignatureService.generateKeyPair(req.user.id);
            res.json({
                success: true,
                message: 'کلیدهای امضای دیجیتال تولید شدند',
                data: {
                    publicKey: keys.publicKey,
                    privateKey: keys.privateKey // فقط یک بار نمایش داده می‌شود
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
);

router.post('/digital-signature/revoke',
    RateLimiterService.createMiddleware({ rule: 'sensitive' }),
    enforce2FA(['*']),
    [
        body('reason')
            .optional()
            .isLength({ max: 200 })
            .withMessage('دلیل نباید از 200 کاراکتر بیشتر باشد')
    ],
    async (req, res) => {
        try {
            await DigitalSignatureService.revokeKeys(req.user.id, req.body.reason);
            res.json({
                success: true,
                message: 'کلیدهای امضای دیجیتال باطل شدند'
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
);

/**
 * Security Events and Audit Logs
 */
router.get('/events',
    [
        query('days').optional().isInt({ min: 1, max: 365 }).withMessage('روزها باید بین 1 تا 365 باشد'),
        query('page').optional().isInt({ min: 1 }).withMessage('شماره صفحه نامعتبر'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('محدودیت باید بین 1 تا 100 باشد')
    ],
    SecurityController.getSecurityEvents
);

router.get('/audit-logs',
    authorize(['super_admin', 'tenant_admin', 'manager']),
    [
        query('page').optional().isInt({ min: 1 }).withMessage('شماره صفحه نامعتبر'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('محدودیت باید بین 1 تا 100 باشد'),
        query('startDate').optional().isISO8601().withMessage('تاریخ شروع نامعتبر'),
        query('endDate').optional().isISO8601().withMessage('تاریخ پایان نامعتبر'),
        query('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('سطح خطر نامعتبر')
    ],
    SecurityController.getAuditLogs
);

router.get('/reports/security',
    authorize(['super_admin', 'tenant_admin', 'manager']),
    RateLimiterService.createMiddleware({ rule: 'sensitive' }),
    [
        query('startDate').optional().isISO8601().withMessage('تاریخ شروع نامعتبر'),
        query('endDate').optional().isISO8601().withMessage('تاریخ پایان نامعتبر'),
        query('format').optional().isIn(['json', 'csv']).withMessage('فرمت نامعتبر')
    ],
    SecurityController.generateSecurityReport
);

/**
 * Device Management
 */
router.get('/devices',
    SecurityController.getTrustedDevices
);

router.delete('/devices/:deviceId',
    RateLimiterService.createMiddleware({ rule: 'sensitive' }),
    [
        param('deviceId').isMongoId().withMessage('شناسه دستگاه نامعتبر')
    ],
    SecurityController.removeTrustedDevice
);

/**
 * Security Settings
 */
router.put('/settings',
    RateLimiterService.createMiddleware({ rule: 'sensitive' }),
    [
        body('ipWhitelistEnabled').optional().isBoolean().withMessage('وضعیت لیست سفید IP باید boolean باشد'),
        body('deviceTrackingEnabled').optional().isBoolean().withMessage('وضعیت ردیابی دستگاه باید boolean باشد'),
        body('loginNotifications.email').optional().isBoolean(),
        body('loginNotifications.sms').optional().isBoolean(),
        body('securityAlerts.email').optional().isBoolean(),
        body('securityAlerts.sms').optional().isBoolean()
    ],
    SecurityController.updateSecuritySettings
);

/**
 * Emergency Actions
 */
router.post('/emergency/lock-account',
    RateLimiterService.createMiddleware({ rule: 'sensitive' }),
    enforce2FA(['*']),
    SecurityController.emergencyLockAccount
);

router.post('/emergency/revoke-sessions',
    RateLimiterService.createMiddleware({ rule: 'sensitive' }),
    enforce2FA(['*']),
    SecurityController.revokeAllSessions
);

/**
 * Security Analysis and Recommendations
 */
router.get('/recommendations',
    SecurityController.getSecurityRecommendations
);

router.get('/test',
    authorize(['super_admin', 'tenant_admin']),
    SecurityController.testSecurityFeatures
);

/**
 * Bulk Operations (Admin only)
 */
router.post('/bulk-operations',
    authorize(['super_admin', 'tenant_admin']),
    RateLimiterService.createMiddleware({ rule: 'sensitive' }),
    enforce2FA(['*']),
    [
        body('operation')
            .isIn(['force_2fa', 'reset_api_keys', 'clear_trusted_devices', 'lock_account'])
            .withMessage('عملیات نامعتبر'),
        body('userIds')
            .isArray({ min: 1, max: 50 })
            .withMessage('لیست کاربران باید آرایه‌ای بین 1 تا 50 عضو باشد'),
        body('userIds.*')
            .isMongoId()
            .withMessage('شناسه کاربر نامعتبر'),
        body('parameters').optional().isObject()
    ],
    SecurityController.bulkSecurityOperations
);

/**
 * Security Health Check
 */
router.get('/health',
    authorize(['super_admin']),
    RateLimiterService.createMiddleware({ rule: 'default' }),
    async (req, res) => {
        try {
            const health = {
                timestamp: new Date(),
                services: {
                    redis: 'unknown',
                    mongodb: 'unknown',
                    rateLimiter: 'unknown',
                    auditLog: 'unknown'
                }
            };

            // Test Redis connection
            try {
                await RateLimiterService.redis.ping();
                health.services.redis = 'healthy';
            } catch (error) {
                health.services.redis = 'unhealthy';
            }

            // Test MongoDB connection
            try {
                const mongoose = require('mongoose');
                if (mongoose.connection.readyState === 1) {
                    health.services.mongodb = 'healthy';
                } else {
                    health.services.mongodb = 'unhealthy';
                }
            } catch (error) {
                health.services.mongodb = 'unhealthy';
            }

            // Test rate limiter
            try {
                await RateLimiterService.checkLimit('health-check', 'api');
                health.services.rateLimiter = 'healthy';
            } catch (error) {
                health.services.rateLimiter = 'unhealthy';
            }

            // Test audit log
            try {
                await AuditLogService.getStatistics(null, 1);
                health.services.auditLog = 'healthy';
            } catch (error) {
                health.services.auditLog = 'unhealthy';
            }

            const allHealthy = Object.values(health.services).every(status => status === 'healthy');
            
            res.status(allHealthy ? 200 : 503).json({
                success: allHealthy,
                data: health
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'خطا در بررسی سلامت سیستم امنیتی'
            });
        }
    }
);

module.exports = router;
