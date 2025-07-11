const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const logger = require('../utils/logger');

/**
 * Two-Factor Authentication Service
 * Implements TOTP-based 2FA using speakeasy and qrcode
 */
class TwoFactorAuthService {
  constructor() {
    this.serviceName = process.env.APP_NAME || 'Exchange Platform';
    this.issuer = process.env.TOTP_ISSUER || 'Exchange Platform v3';
  }

  /**
   * Generate 2FA secret for a user
   * @param {string} userId - User ID
   * @param {string} userEmail - User email
   * @returns {Object} Secret and QR code data
   */
  async generateSecret(userId, userEmail) {
    try {
      const secret = speakeasy.generateSecret({
        name: `${this.serviceName} (${userEmail})`,
        issuer: this.issuer,
        length: 32
      });

      // Generate QR code
      const qrCodeDataURL = await qrcode.toDataURL(secret.otpauth_url);

      logger.info('2FA secret generated', {
        userId,
        userEmail,
        timestamp: Date.now()
      });

      return {
        secret: secret.base32,
        qrCode: qrCodeDataURL,
        manualEntryKey: secret.base32,
        otpauthUrl: secret.otpauth_url
      };
    } catch (error) {
      logger.error('Failed to generate 2FA secret', {
        userId,
        userEmail,
        error: error.message
      });
      throw new Error('Failed to generate 2FA secret');
    }
  }

  /**
   * Verify 2FA token
   * @param {string} token - 6-digit token from authenticator app
   * @param {string} secret - User's 2FA secret
   * @param {number} window - Time window for verification (default: 2)
   * @returns {boolean} Verification result
   */
  verifyToken(token, secret, window = 2) {
    try {
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: window, // Allow for time drift
        time: Math.floor(Date.now() / 1000)
      });

      logger.info('2FA token verification', {
        verified,
        timestamp: Date.now()
      });

      return verified;
    } catch (error) {
      logger.error('2FA token verification failed', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Generate backup codes for 2FA
   * @param {number} count - Number of backup codes to generate
   * @returns {Array} Array of backup codes
   */
  generateBackupCodes(count = 10) {
    try {
      const codes = [];
      for (let i = 0; i < count; i++) {
        // Generate 8-character backup code
        const code = Math.random().toString(36).substr(2, 8).toUpperCase();
        codes.push(code);
      }

      logger.info('2FA backup codes generated', {
        count,
        timestamp: Date.now()
      });

      return codes;
    } catch (error) {
      logger.error('Failed to generate backup codes', {
        error: error.message
      });
      throw new Error('Failed to generate backup codes');
    }
  }

  /**
   * Middleware to enforce 2FA for protected routes
   * @param {boolean} required - Whether 2FA is required
   * @returns {Function} Express middleware
   */
  enforce2FA(required = true) {
    return async (req, res, next) => {
      try {
        // Skip 2FA for certain endpoints
        const skipPaths = ['/api/auth/2fa/setup', '/api/auth/2fa/verify'];
        if (skipPaths.includes(req.path)) {
          return next();
        }

        // Check if user is authenticated
        if (!req.user) {
          return res.status(401).json({
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
          });
        }

        // Check if 2FA is enabled for user
        if (!req.user.twoFactorEnabled) {
          if (required) {
            return res.status(403).json({
              error: '2FA setup required',
              code: '2FA_SETUP_REQUIRED',
              setupUrl: '/api/auth/2fa/setup'
            });
          } else {
            return next();
          }
        }

        // Check if 2FA is verified in current session
        if (!req.session.twoFactorVerified) {
          return res.status(403).json({
            error: '2FA verification required',
            code: '2FA_VERIFICATION_REQUIRED',
            verifyUrl: '/api/auth/2fa/verify'
          });
        }

        next();
      } catch (error) {
        logger.error('2FA enforcement failed', {
          userId: req.user?.id,
          path: req.path,
          error: error.message
        });
        res.status(500).json({
          error: '2FA enforcement failed'
        });
      }
    };
  }

  /**
   * Setup 2FA for user endpoint
   */
  setupEndpoint() {
    return async (req, res) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            error: 'Authentication required'
          });
        }

        const { secret, qrCode, manualEntryKey } = await this.generateSecret(
          req.user.id,
          req.user.email
        );

        // Store secret temporarily (should be confirmed before permanent storage)
        req.session.pendingTwoFactorSecret = secret;

        res.json({
          success: true,
          qrCode,
          manualEntryKey,
          message: 'Scan the QR code with your authenticator app and verify with a token'
        });
      } catch (error) {
        logger.error('2FA setup failed', {
          userId: req.user?.id,
          error: error.message
        });
        res.status(500).json({
          error: 'Failed to setup 2FA'
        });
      }
    };
  }

  /**
   * Verify 2FA setup endpoint
   */
  verifySetupEndpoint() {
    return async (req, res) => {
      try {
        const { token } = req.body;

        if (!req.user) {
          return res.status(401).json({
            error: 'Authentication required'
          });
        }

        if (!req.session.pendingTwoFactorSecret) {
          return res.status(400).json({
            error: 'No pending 2FA setup found'
          });
        }

        if (!token || token.length !== 6) {
          return res.status(400).json({
            error: 'Valid 6-digit token required'
          });
        }

        const verified = this.verifyToken(token, req.session.pendingTwoFactorSecret);

        if (!verified) {
          return res.status(400).json({
            error: 'Invalid token'
          });
        }

        // Generate backup codes
        const backupCodes = this.generateBackupCodes();

        // Here you would save the secret and backup codes to the user's record
        // This is a placeholder - implement based on your user model
        // await User.updateOne(
        //   { _id: req.user.id },
        //   {
        //     twoFactorSecret: req.session.pendingTwoFactorSecret,
        //     twoFactorEnabled: true,
        //     twoFactorBackupCodes: backupCodes
        //   }
        // );

        // Clear pending secret
        delete req.session.pendingTwoFactorSecret;

        logger.info('2FA setup completed', {
          userId: req.user.id,
          timestamp: Date.now()
        });

        res.json({
          success: true,
          backupCodes,
          message: '2FA has been successfully enabled'
        });
      } catch (error) {
        logger.error('2FA setup verification failed', {
          userId: req.user?.id,
          error: error.message
        });
        res.status(500).json({
          error: 'Failed to verify 2FA setup'
        });
      }
    };
  }

  /**
   * Verify 2FA for login endpoint
   */
  verifyLoginEndpoint() {
    return async (req, res) => {
      try {
        const { token, backupCode } = req.body;

        if (!req.user) {
          return res.status(401).json({
            error: 'Authentication required'
          });
        }

        if (!req.user.twoFactorEnabled) {
          return res.status(400).json({
            error: '2FA not enabled for this user'
          });
        }

        let verified = false;

        if (token) {
          // Verify TOTP token
          if (token.length !== 6) {
            return res.status(400).json({
              error: 'Valid 6-digit token required'
            });
          }
          verified = this.verifyToken(token, req.user.twoFactorSecret);
        } else if (backupCode) {
          // Verify backup code (implement based on your storage)
          // verified = req.user.twoFactorBackupCodes.includes(backupCode);
          // if (verified) {
          //   // Remove used backup code
          //   req.user.twoFactorBackupCodes = req.user.twoFactorBackupCodes.filter(code => code !== backupCode);
          //   await req.user.save();
          // }
        } else {
          return res.status(400).json({
            error: 'Token or backup code required'
          });
        }

        if (!verified) {
          logger.warn('Invalid 2FA attempt', {
            userId: req.user.id,
            ip: req.ip,
            timestamp: Date.now()
          });
          return res.status(400).json({
            error: 'Invalid token or backup code'
          });
        }

        // Mark 2FA as verified in session
        req.session.twoFactorVerified = true;

        logger.info('2FA verification successful', {
          userId: req.user.id,
          timestamp: Date.now()
        });

        res.json({
          success: true,
          message: '2FA verification successful'
        });
      } catch (error) {
        logger.error('2FA login verification failed', {
          userId: req.user?.id,
          error: error.message
        });
        res.status(500).json({
          error: 'Failed to verify 2FA'
        });
      }
    };
  }

  /**
   * Disable 2FA endpoint
   */
  disableEndpoint() {
    return async (req, res) => {
      try {
        const { token, password } = req.body;

        if (!req.user) {
          return res.status(401).json({
            error: 'Authentication required'
          });
        }

        if (!req.user.twoFactorEnabled) {
          return res.status(400).json({
            error: '2FA is not enabled'
          });
        }

        // Verify password (implement based on your auth system)
        // const validPassword = await bcrypt.compare(password, req.user.password);
        // if (!validPassword) {
        //   return res.status(400).json({
        //     error: 'Invalid password'
        //   });
        // }

        // Verify current 2FA token
        if (!token || !this.verifyToken(token, req.user.twoFactorSecret)) {
          return res.status(400).json({
            error: 'Invalid 2FA token'
          });
        }

        // Disable 2FA (implement based on your user model)
        // await User.updateOne(
        //   { _id: req.user.id },
        //   {
        //     $unset: {
        //       twoFactorSecret: 1,
        //       twoFactorBackupCodes: 1
        //     },
        //     twoFactorEnabled: false
        //   }
        // );

        logger.info('2FA disabled', {
          userId: req.user.id,
          timestamp: Date.now()
        });

        res.json({
          success: true,
          message: '2FA has been disabled'
        });
      } catch (error) {
        logger.error('2FA disable failed', {
          userId: req.user?.id,
          error: error.message
        });
        res.status(500).json({
          error: 'Failed to disable 2FA'
        });
      }
    };
  }
}

module.exports = new TwoFactorAuthService();