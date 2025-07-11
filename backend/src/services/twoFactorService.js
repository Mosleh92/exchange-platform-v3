const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const crypto = require('crypto');

class TwoFactorAuthService {
  constructor() {
    this.serviceName = 'Exchange Platform V3';
  }

  /**
   * Generate a new 2FA secret for a user
   */
  generateSecret(userEmail) {
    const secret = speakeasy.generateSecret({
      name: userEmail,
      issuer: this.serviceName,
      length: 32
    });

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
      manualEntryKey: secret.base32
    };
  }

  /**
   * Generate QR code for 2FA setup
   */
  async generateQRCode(otpauthUrl) {
    try {
      const qrCodeDataURL = await qrcode.toDataURL(otpauthUrl);
      return qrCodeDataURL;
    } catch (error) {
      throw new Error('Failed to generate QR code: ' + error.message);
    }
  }

  /**
   * Verify TOTP token
   */
  verifyToken(secret, token, window = 1) {
    if (!secret || !token) {
      return false;
    }

    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: window // Allow 1 step before and after for clock drift
    });
  }

  /**
   * Generate backup codes
   */
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push({
        code: code,
        used: false,
        usedAt: null
      });
    }
    return codes;
  }

  /**
   * Verify backup code
   */
  verifyBackupCode(backupCodes, inputCode) {
    const code = backupCodes.find(
      c => c.code === inputCode.toUpperCase() && !c.used
    );

    if (code) {
      code.used = true;
      code.usedAt = new Date();
      return true;
    }

    return false;
  }

  /**
   * Check if 2FA is required for user
   */
  is2FARequired(user) {
    return user.twoFactorEnabled === true;
  }

  /**
   * Generate time-based one-time password for testing
   */
  generateTOTP(secret) {
    return speakeasy.totp({
      secret: secret,
      encoding: 'base32'
    });
  }
}

module.exports = new TwoFactorAuthService();