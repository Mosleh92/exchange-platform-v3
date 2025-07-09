// backend/src/services/twoFactorAuthService.js
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const crypto = require('crypto');

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
