// backend/src/services/mfaService.js
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Multi-Factor Authentication Service
 * Provides TOTP-based MFA, backup codes, and recovery options
 */
class MFAService {
  constructor() {
    this.serviceName = process.env.MFA_SERVICE_NAME || 'Exchange Platform';
    this.backupCodeLength = 8;
    this.backupCodeCount = 10;
  }

  /**
   * Generate MFA secret and QR code for user setup
   */
  async generateMFASetup(user) {
    try {
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `${this.serviceName} (${user.email})`,
        issuer: this.serviceName,
        length: 32
      });

      // Generate QR code data URL
      const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      return {
        secret: secret.base32,
        qrCode: qrCodeDataURL,
        manualEntryKey: secret.base32,
        backupCodes: backupCodes.codes,
        backupCodesHashed: backupCodes.hashed
      };
    } catch (error) {
      logger.error('Failed to generate MFA setup:', error);
      throw new Error('MFA setup generation failed');
    }
  }

  /**
   * Verify TOTP token
   */
  verifyTOTP(token, secret, window = 2) {
    try {
      return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: window // Allow some time drift
      });
    } catch (error) {
      logger.error('TOTP verification failed:', error);
      return false;
    }
  }

  /**
   * Generate backup codes
   */
  generateBackupCodes() {
    const codes = [];
    const hashed = [];

    for (let i = 0; i < this.backupCodeCount; i++) {
      // Generate 8-character alphanumeric code
      const code = this.generateBackupCode();
      codes.push(code);
      
      // Hash the code for storage
      const hashedCode = crypto
        .createHash('sha256')
        .update(code + process.env.JWT_SECRET)
        .digest('hex');
      hashed.push(hashedCode);
    }

    return { codes, hashed };
  }

  /**
   * Generate single backup code
   */
  generateBackupCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    for (let i = 0; i < this.backupCodeLength; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Verify backup code
   */
  verifyBackupCode(code, hashedCodes) {
    try {
      const hashedInput = crypto
        .createHash('sha256')
        .update(code.toUpperCase() + process.env.JWT_SECRET)
        .digest('hex');

      return hashedCodes.includes(hashedInput);
    } catch (error) {
      logger.error('Backup code verification failed:', error);
      return false;
    }
  }

  /**
   * Invalidate used backup code
   */
  invalidateBackupCode(code, hashedCodes) {
    try {
      const hashedInput = crypto
        .createHash('sha256')
        .update(code.toUpperCase() + process.env.JWT_SECRET)
        .digest('hex');

      const index = hashedCodes.indexOf(hashedInput);
      if (index > -1) {
        hashedCodes.splice(index, 1);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to invalidate backup code:', error);
      return false;
    }
  }

  /**
   * Generate new backup codes
   */
  regenerateBackupCodes() {
    return this.generateBackupCodes();
  }

  /**
   * Validate MFA setup completion
   */
  async validateMFASetup(secret, verificationCode, backupCodeTest) {
    try {
      // Verify TOTP code
      const totpValid = this.verifyTOTP(verificationCode, secret);
      if (!totpValid) {
        return {
          valid: false,
          error: 'Invalid verification code'
        };
      }

      // Verify backup code format
      if (!this.isValidBackupCodeFormat(backupCodeTest)) {
        return {
          valid: false,
          error: 'Invalid backup code format'
        };
      }

      return {
        valid: true,
        message: 'MFA setup completed successfully'
      };
    } catch (error) {
      logger.error('MFA setup validation failed:', error);
      return {
        valid: false,
        error: 'MFA setup validation failed'
      };
    }
  }

  /**
   * Check if backup code format is valid
   */
  isValidBackupCodeFormat(code) {
    if (!code || typeof code !== 'string') {
      return false;
    }
    
    // Should be 8 characters, alphanumeric
    const regex = /^[A-Z0-9]{8}$/;
    return regex.test(code.toUpperCase());
  }

  /**
   * Generate MFA challenge for login
   */
  generateMFAChallenge(userId) {
    const challenge = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + (5 * 60 * 1000); // 5 minutes
    
    return {
      challenge,
      expiry,
      userId
    };
  }

  /**
   * Verify MFA challenge
   */
  verifyMFAChallenge(challenge, storedChallenge) {
    try {
      if (!storedChallenge || !challenge) {
        return false;
      }

      // Check if challenge matches and hasn't expired
      return (
        challenge === storedChallenge.challenge &&
        Date.now() < storedChallenge.expiry
      );
    } catch (error) {
      logger.error('MFA challenge verification failed:', error);
      return false;
    }
  }

  /**
   * Check if user should be prompted for MFA
   */
  shouldPromptMFA(user, req) {
    // Always require MFA if enabled
    if (user.twoFactorEnabled) {
      return true;
    }

    // Check for high-risk activities
    const highRiskPaths = [
      '/api/users/profile/security',
      '/api/accounts/withdraw',
      '/api/admin',
      '/api/settings/security'
    ];

    const isHighRisk = highRiskPaths.some(path => 
      req.path.startsWith(path)
    );

    // Check for suspicious login patterns
    const isSuspiciousActivity = this.detectSuspiciousActivity(user, req);

    return isHighRisk || isSuspiciousActivity;
  }

  /**
   * Detect suspicious activity patterns
   */
  detectSuspiciousActivity(user, req) {
    try {
      // Check for unusual IP address
      if (user.lastLoginIP && user.lastLoginIP !== req.ip) {
        return true;
      }

      // Check for unusual user agent
      const currentUserAgent = req.get('User-Agent') || '';
      if (user.lastLoginUserAgent && 
          !this.isSimilarUserAgent(user.lastLoginUserAgent, currentUserAgent)) {
        return true;
      }

      // Check for unusual time patterns (optional)
      const currentHour = new Date().getHours();
      if (user.usualLoginHours && user.usualLoginHours.length > 0) {
        if (!user.usualLoginHours.includes(currentHour)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Suspicious activity detection failed:', error);
      return false;
    }
  }

  /**
   * Check if user agents are similar
   */
  isSimilarUserAgent(stored, current) {
    if (!stored || !current) {
      return false;
    }

    // Extract browser and OS info
    const extractInfo = (ua) => {
      const browser = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)/i)?.[0] || '';
      const os = ua.match(/(Windows|Mac|Linux|Android|iOS)/i)?.[0] || '';
      return `${browser}-${os}`.toLowerCase();
    };

    return extractInfo(stored) === extractInfo(current);
  }

  /**
   * Generate emergency access codes
   */
  generateEmergencyAccessCodes() {
    const codes = [];
    const hashed = [];

    // Generate 5 one-time emergency codes
    for (let i = 0; i < 5; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
      
      const hashedCode = crypto
        .createHash('sha256')
        .update(code + process.env.JWT_SECRET + 'emergency')
        .digest('hex');
      hashed.push(hashedCode);
    }

    return { codes, hashed };
  }

  /**
   * Verify emergency access code
   */
  verifyEmergencyCode(code, hashedCodes) {
    try {
      const hashedInput = crypto
        .createHash('sha256')
        .update(code.toUpperCase() + process.env.JWT_SECRET + 'emergency')
        .digest('hex');

      return hashedCodes.includes(hashedInput);
    } catch (error) {
      logger.error('Emergency code verification failed:', error);
      return false;
    }
  }

  /**
   * Log MFA events for security monitoring
   */
  logMFAEvent(eventType, userId, details = {}) {
    const logData = {
      eventType,
      userId,
      timestamp: new Date().toISOString(),
      ...details
    };

    logger.info('MFA event', logData);
  }
}

module.exports = new MFAService();