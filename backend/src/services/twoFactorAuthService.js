// backend/src/services/twoFactorAuthService.js
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const crypto = require('crypto');
const { sendSMS } = require('./external/smsService');

class TwoFactorAuthService {
    /**
     * Generate 2FA secret for user
     */
    async generateSecret(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('کاربر یافت نشد');
            }

            const secret = speakeasy.generateSecret({
                name: `${user.email}`,
                service: 'Exchange Platform',
                length: 32
            });

            // Save secret to user (temporary until verified)
            user.twoFactorSecret = secret.base32;
            user.twoFactorEnabled = false;
            await user.save();

            return {
                secret: secret.base32,
                qrCode: await QRCode.toDataURL(secret.otpauth_url),
                manualEntryKey: secret.base32
            };
        } catch (error) {
            throw new Error(`خطا در تولید رمز 2FA: ${error.message}`);
        }
    }

    /**
     * Verify and enable 2FA
     */
    async verifyAndEnable(userId, token) {
        try {
            const user = await User.findById(userId);
            if (!user || !user.twoFactorSecret) {
                throw new Error('رمز 2FA یافت نشد');
            }

            const verified = speakeasy.verify({
                secret: user.twoFactorSecret,
                token: token,
                window: 2,
                time: 30
            });

            if (!verified) {
                throw new Error('کد 2FA نامعتبر است');
            }

            // Generate backup codes
            const backupCodes = this.generateBackupCodes();
            
            user.twoFactorEnabled = true;
            user.twoFactorBackupCodes = backupCodes.map(code => ({
                code: this.hashBackupCode(code),
                used: false
            }));
            await user.save();

            return {
                success: true,
                backupCodes: backupCodes
            };
        } catch (error) {
            throw new Error(`خطا در تایید 2FA: ${error.message}`);
        }
    }

    /**
     * Verify 2FA token
     */
    async verifyToken(userId, token) {
        try {
            const user = await User.findById(userId);
            if (!user || !user.twoFactorEnabled) {
                return false;
            }

            // Check if it's a backup code
            if (token.length === 8) {
                return this.verifyBackupCode(user, token);
            }

            // Verify TOTP token
            const verified = speakeasy.verify({
                secret: user.twoFactorSecret,
                token: token,
                window: 2,
                time: 30
            });

            if (verified) {
                // Update last used time
                user.twoFactorLastUsed = new Date();
                await user.save();
            }

            return verified;
        } catch (error) {
            throw new Error(`خطا در تایید توکن 2FA: ${error.message}`);
        }
    }

    /**
     * Disable 2FA
     */
    async disable(userId, token) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('کاربر یافت نشد');
            }

            // Verify current token before disabling
            const verified = await this.verifyToken(userId, token);
            if (!verified) {
                throw new Error('کد 2FA نامعتبر است');
            }

            user.twoFactorEnabled = false;
            user.twoFactorSecret = null;
            user.twoFactorBackupCodes = [];
            await user.save();

            return { success: true };
        } catch (error) {
            throw new Error(`خطا در غیرفعال کردن 2FA: ${error.message}`);
        }
    }

    /**
     * Generate backup codes
     */
    generateBackupCodes() {
        const codes = [];
        for (let i = 0; i < 10; i++) {
            codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
        }
        return codes;
    }

    /**
     * Hash backup code
     */
    hashBackupCode(code) {
        return crypto.createHash('sha256').update(code).digest('hex');
    }

    /**
     * Verify backup code
     */
    async verifyBackupCode(user, inputCode) {
        const hashedInput = this.hashBackupCode(inputCode);
        
        const backupCode = user.twoFactorBackupCodes.find(
            code => code.code === hashedInput && !code.used
        );

        if (!backupCode) {
            return false;
        }

        // Mark backup code as used
        backupCode.used = true;
        await user.save();

        return true;
    }

    /**
     * Get user 2FA status
     */
    async getStatus(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('کاربر یافت نشد');
            }

            return {
                enabled: user.twoFactorEnabled || false,
                lastUsed: user.twoFactorLastUsed,
                backupCodesCount: user.twoFactorBackupCodes 
                    ? user.twoFactorBackupCodes.filter(code => !code.used).length 
                    : 0
            };
        } catch (error) {
            throw new Error(`خطا در دریافت وضعیت 2FA: ${error.message}`);
        }
    }

    /**
     * Generate SMS 2FA code and send to user's phone
     */
    async generateSMSCode(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('کاربر یافت نشد');
            }

            if (!user.phone) {
                throw new Error('شماره تلفن کاربر یافت نشد');
            }

            // Generate 6-digit code
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

            // Store code temporarily (you might want to use Redis for this)
            user.smsCode = this.hashSMSCode(code);
            user.smsCodeExpiry = expiry;
            await user.save();

            // Send SMS
            const smsConfig = {
                provider: process.env.SMS_PROVIDER || 'kavenegar',
                apiKey: process.env.SMS_API_KEY,
                apiSecret: process.env.SMS_API_SECRET,
                fromNumber: process.env.SMS_FROM_NUMBER
            };

            const message = `کد تایید صرافی: ${code}\nاین کد تا 5 دقیقه معتبر است.`;
            
            await sendSMS({
                to: user.phone,
                text: message,
                provider: smsConfig.provider,
                config: smsConfig
            });

            return {
                success: true,
                message: 'کد تایید به شماره شما ارسال شد',
                expiresAt: expiry
            };
        } catch (error) {
            throw new Error(`خطا در ارسال کد SMS: ${error.message}`);
        }
    }

    /**
     * Verify SMS 2FA code
     */
    async verifySMSCode(userId, code) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('کاربر یافت نشد');
            }

            if (!user.smsCode || !user.smsCodeExpiry) {
                throw new Error('کد SMS یافت نشد');
            }

            if (new Date() > user.smsCodeExpiry) {
                throw new Error('کد SMS منقضی شده است');
            }

            const hashedInput = this.hashSMSCode(code);
            if (hashedInput !== user.smsCode) {
                throw new Error('کد SMS نامعتبر است');
            }

            // Clear used code
            user.smsCode = null;
            user.smsCodeExpiry = null;
            await user.save();

            return true;
        } catch (error) {
            throw new Error(`خطا در تایید کد SMS: ${error.message}`);
        }
    }

    /**
     * Hash SMS code
     */
    hashSMSCode(code) {
        return crypto.createHash('sha256').update(code + process.env.SMS_SALT).digest('hex');
    }

    /**
     * Check if 2FA is required for user role
     */
    is2FARequired(userRole) {
        const requiredRoles = ['super_admin', 'tenant_admin'];
        return requiredRoles.includes(userRole);
    }

    /**
     * Enforce 2FA for admin users
     */
    async enforce2FAForUser(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('کاربر یافت نشد');
            }

            if (this.is2FARequired(user.role) && !user.twoFactorEnabled) {
                throw new Error('کاربران مدیر باید 2FA را فعال کنند');
            }

            return true;
        } catch (error) {
            throw new Error(`خطا در بررسی الزام 2FA: ${error.message}`);
        }
    }

    /**
     * Regenerate backup codes
     */
    async regenerateBackupCodes(userId, token) {
        try {
            const user = await User.findById(userId);
            if (!user || !user.twoFactorEnabled) {
                throw new Error('2FA فعال نیست');
            }

            // Verify current token
            const verified = await this.verifyToken(userId, token);
            if (!verified) {
                throw new Error('کد 2FA نامعتبر است');
            }

            // Generate new backup codes
            const backupCodes = this.generateBackupCodes();
            user.twoFactorBackupCodes = backupCodes.map(code => ({
                code: this.hashBackupCode(code),
                used: false
            }));
            await user.save();

            return { backupCodes };
        } catch (error) {
            throw new Error(`خطا در تولید مجدد کدهای بازیابی: ${error.message}`);
        }
    }
}

module.exports = new TwoFactorAuthService();
