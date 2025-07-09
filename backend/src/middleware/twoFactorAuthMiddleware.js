// backend/src/middleware/twoFactorAuthMiddleware.js
const TwoFactorAuthService = require('../services/twoFactorAuthService');
const User = require('../models/User');

/**
 * Middleware to require 2FA verification for sensitive actions
 */
const require2FA = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'کاربر یافت نشد'
            });
        }

        // If 2FA is not enabled, skip verification
        if (!user.twoFactorEnabled) {
            return next();
        }

        // Check if 2FA token is provided
        const twoFactorToken = req.headers['x-2fa-token'] || req.body.twoFactorToken;
        
        if (!twoFactorToken) {
            return res.status(400).json({
                success: false,
                message: 'کد 2FA الزامی است',
                code: 'REQUIRE_2FA'
            });
        }

        // Verify the token
        const isValid = await TwoFactorAuthService.verifyToken(req.user.id, twoFactorToken);
        
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'کد 2FA نامعتبر است'
            });
        }

        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'خطا در تایید 2FA'
        });
    }
};

/**
 * Middleware to enforce 2FA for specific actions
 */
const enforce2FA = (actions = []) => {
    return async (req, res, next) => {
        try {
            const user = await User.findById(req.user.id);
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'کاربر یافت نشد'
                });
            }

            // Check if current action requires 2FA
            const currentAction = req.route.path + ':' + req.method;
            const requires2FA = actions.includes(currentAction) || actions.includes('*');

            if (requires2FA && !user.twoFactorEnabled) {
                return res.status(403).json({
                    success: false,
                    message: 'این عملیات نیاز به فعال‌سازی 2FA دارد',
                    code: 'REQUIRE_2FA_SETUP'
                });
            }

            if (requires2FA && user.twoFactorEnabled) {
                return require2FA(req, res, next);
            }

            next();
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'خطا در بررسی 2FA'
            });
        }
    };
};

/**
 * Middleware to check 2FA status in login
 */
const check2FAOnLogin = async (req, res, next) => {
    try {
        const user = req.user; // User should be set by previous auth middleware
        
        if (!user.twoFactorEnabled) {
            return next();
        }

        const twoFactorToken = req.body.twoFactorToken;
        
        if (!twoFactorToken) {
            return res.status(200).json({
                success: false,
                message: 'کد 2FA الزامی است',
                code: 'REQUIRE_2FA',
                data: {
                    userId: user.id,
                    require2FA: true
                }
            });
        }

        const isValid = await TwoFactorAuthService.verifyToken(user.id, twoFactorToken);
        
        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: 'کد 2FA نامعتبر است'
            });
        }

        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'خطا در تایید 2FA'
        });
    }
};

/**
 * Middleware to log 2FA usage
 */
const log2FAUsage = async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
        // Log successful 2FA usage
        if (req.user && req.headers['x-2fa-token']) {
            req.auditLog = {
                action: 'USE_2FA',
                resource: 'Security',
                resourceId: req.user.id,
                details: `2FA استفاده شد برای ${req.method} ${req.originalUrl}`,
                metadata: {
                    ip: req.ip,
                    userAgent: req.headers['user-agent']
                }
            };
        }
        
        originalSend.call(this, data);
    };
    
    next();
};

module.exports = {
    require2FA,
    enforce2FA,
    check2FAOnLogin,
    log2FAUsage
};
