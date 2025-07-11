// backend/src/controllers/twoFactorAuthController.js
const TwoFactorAuthService = require('../services/twoFactorAuthService');
const { validationResult } = require('express-validator');

class TwoFactorAuthController {
    /**
     * Generate 2FA secret and QR code
     */
    async generateSecret(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'اطلاعات ورودی نامعتبر است',
                    errors: errors.array()
                });
            }

            const userId = req.user.id;
            const result = await TwoFactorAuthService.generateSecret(userId);

            res.json({
                success: true,
                message: 'رمز 2FA با موفقیت تولید شد',
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Verify and enable 2FA
     */
    async verifyAndEnable(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'اطلاعات ورودی نامعتبر است',
                    errors: errors.array()
                });
            }

            const userId = req.user.id;
            const { token } = req.body;

            const result = await TwoFactorAuthService.verifyAndEnable(userId, token);

            // Log security event
            req.auditLog = {
                action: 'ENABLE_2FA',
                resource: 'Security',
                resourceId: userId,
                details: 'دو عاملی احراز هویت فعال شد'
            };

            res.json({
                success: true,
                message: 'دو عاملی احراز هویت با موفقیت فعال شد',
                data: result
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Verify 2FA token
     */
    async verifyToken(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'اطلاعات ورودی نامعتبر است',
                    errors: errors.array()
                });
            }

            const userId = req.user.id;
            const { token } = req.body;

            const isValid = await TwoFactorAuthService.verifyToken(userId, token);

            if (!isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'کد 2FA نامعتبر است'
                });
            }

            res.json({
                success: true,
                message: 'کد 2FA معتبر است',
                data: { valid: true }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Disable 2FA
     */
    async disable(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'اطلاعات ورودی نامعتبر است',
                    errors: errors.array()
                });
            }

            const userId = req.user.id;
            const { token } = req.body;

            const result = await TwoFactorAuthService.disable(userId, token);

            // Log security event
            req.auditLog = {
                action: 'DISABLE_2FA',
                resource: 'Security',
                resourceId: userId,
                details: 'دو عاملی احراز هویت غیرفعال شد'
            };

            res.json({
                success: true,
                message: 'دو عاملی احراز هویت با موفقیت غیرفعال شد',
                data: result
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get 2FA status
     */
    async getStatus(req, res) {
        try {
            const userId = req.user.id;
            const status = await TwoFactorAuthService.getStatus(userId);

            res.json({
                success: true,
                message: 'وضعیت 2FA با موفقیت دریافت شد',
                data: status
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Generate SMS 2FA code
     */
    async generateSMSCode(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'اطلاعات ورودی نامعتبر است',
                    errors: errors.array()
                });
            }

            const userId = req.user.id;
            const result = await TwoFactorAuthService.generateSMSCode(userId);

            res.json({
                success: true,
                message: 'کد SMS با موفقیت ارسال شد',
                data: result
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Verify SMS 2FA code
     */
    async verifySMSCode(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'اطلاعات ورودی نامعتبر است',
                    errors: errors.array()
                });
            }

            const userId = req.user.id;
            const { code } = req.body;

            const isValid = await TwoFactorAuthService.verifySMSCode(userId, code);

            if (!isValid) {
                return res.status(400).json({
                    success: false,
                    message: 'کد SMS نامعتبر است'
                });
            }

            res.json({
                success: true,
                message: 'کد SMS معتبر است',
                data: { valid: true }
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Regenerate backup codes
     */
    async regenerateBackupCodes(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'اطلاعات ورودی نامعتبر است',
                    errors: errors.array()
                });
            }

            const userId = req.user.id;
            const { token } = req.body;

            const result = await TwoFactorAuthService.regenerateBackupCodes(userId, token);

            // Log security event
            req.auditLog = {
                action: 'REGENERATE_BACKUP_CODES',
                resource: 'Security',
                resourceId: userId,
                details: 'کدهای بازیابی 2FA مجدداً تولید شدند'
            };

            res.json({
                success: true,
                message: 'کدهای بازیابی با موفقیت تولید شدند',
                data: result
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new TwoFactorAuthController();
