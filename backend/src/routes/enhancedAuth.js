// routes/enhancedAuth.js - Enhanced Authentication Routes with JWT Refresh and 2FA
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const tokenManager = require('../services/tokenManager');
const twoFactorAuthService = require('../services/twoFactorAuth');
const advancedRateLimit = require('../middleware/advancedRateLimit');
const { enhancedAuth, authorize } = require('../middleware/enhancedAuth');
const encryptionService = require('../services/encryptionService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Enhanced Login with 2FA support and refresh tokens
 */
router.post('/login', 
  advancedRateLimit.authLimiter(),
  async (req, res) => {
    try {
      const { email, password, twoFactorToken } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_CREDENTIALS',
          message: 'Email and password are required'
        });
      }

      // Find user with 2FA secret included
      const user = await User.findOne({ email })
        .populate('tenantId')
        .select('+password +twoFactorSecret');

      if (!user) {
        logger.warn('Login attempt with non-existent email', {
          email: email.replace(/(.{2}).*@/, '$1***@'),
          ip: req.ip
        });
        return res.status(401).json({
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        });
      }

      // Check if account is locked
      if (user.lockoutUntil && user.lockoutUntil > new Date()) {
        return res.status(423).json({
          success: false,
          error: 'ACCOUNT_LOCKED',
          message: 'Account is temporarily locked due to multiple failed attempts'
        });
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        // Increment failed login attempts
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
        
        // Lock account after 5 failed attempts
        if (user.failedLoginAttempts >= 5) {
          user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
          logger.warn('Account locked due to failed login attempts', {
            userId: user._id,
            email: email.replace(/(.{2}).*@/, '$1***@'),
            attempts: user.failedLoginAttempts
          });
        }

        await user.save();

        return res.status(401).json({
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        });
      }

      // Check account status
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'ACCOUNT_DEACTIVATED',
          message: 'Account is deactivated'
        });
      }

      // Check tenant status
      if (user.role !== 'super_admin' && user.tenantId && !user.tenantId.isActive) {
        return res.status(401).json({
          success: false,
          error: 'TENANT_INACTIVE',
          message: 'Tenant is inactive'
        });
      }

      // 2FA verification
      if (user.twoFactorEnabled) {
        if (!twoFactorToken) {
          return res.status(200).json({
            success: true,
            requiresTwoFactor: true,
            message: 'Two-factor authentication required',
            tempToken: null // Could implement temporary token for 2FA flow
          });
        }

        const is2FAValid = await twoFactorAuthService.verifyFor2FA(user, twoFactorToken);
        if (!is2FAValid) {
          return res.status(401).json({
            success: false,
            error: 'INVALID_2FA_TOKEN',
            message: 'Invalid two-factor authentication code'
          });
        }
      }

      // Check if 2FA is required for admin users
      if (twoFactorAuthService.is2FARequired(user.role) && !user.twoFactorEnabled) {
        return res.status(403).json({
          success: false,
          error: 'TWO_FACTOR_REQUIRED',
          message: '2FA setup is required for admin users',
          requiresSetup: true
        });
      }

      // Reset failed login attempts on successful login
      user.failedLoginAttempts = 0;
      user.lockoutUntil = undefined;
      user.lastLoginAt = new Date();
      user.lastLoginIP = req.ip;
      await user.save();

      // Generate tokens
      const tokens = tokenManager.generateTokens(user);
      
      // Store refresh token
      await tokenManager.storeRefreshToken(tokens.refreshToken, user);

      // Set secure HTTP-only cookies
      const cookieOptions = tokenManager.getCookieOptions();
      res.cookie('refreshToken', tokens.refreshToken, cookieOptions);
      res.cookie('accessToken', tokens.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000 // 15 minutes for access token
      });

      logger.info('User logged in successfully', {
        userId: user._id,
        email: email.replace(/(.{2}).*@/, '$1***@'),
        role: user.role,
        tenantId: user.tenantId?._id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: 900, // 15 minutes in seconds
          user: {
            id: user._id,
            email: user.email,
            role: user.role,
            profile: {
              firstName: user.firstName,
              lastName: user.lastName,
              avatar: user.avatar
            },
            tenant: user.tenantId,
            twoFactorEnabled: user.twoFactorEnabled,
            lastLoginAt: user.lastLoginAt
          }
        },
        message: 'Login successful'
      });

    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'LOGIN_FAILED',
        message: 'Login failed due to server error'
      });
    }
  }
);

/**
 * Refresh Access Token
 */
router.post('/refresh',
  advancedRateLimit.authLimiter(),
  async (req, res) => {
    try {
      let refreshToken = req.body.refreshToken || req.cookies.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          error: 'REFRESH_TOKEN_REQUIRED',
          message: 'Refresh token is required'
        });
      }

      // Get user from refresh token
      const decoded = await tokenManager.verifyRefreshToken(refreshToken);
      const user = await User.findById(decoded.userId)
        .populate('tenantId')
        .select('-password -twoFactorSecret');

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'USER_NOT_FOUND',
          message: 'User not found or inactive'
        });
      }

      // Rotate refresh token
      const newTokens = await tokenManager.rotateRefreshToken(refreshToken, user);

      // Set new cookies
      const cookieOptions = tokenManager.getCookieOptions();
      res.cookie('refreshToken', newTokens.refreshToken, cookieOptions);
      res.cookie('accessToken', newTokens.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000 // 15 minutes
      });

      logger.info('Token refreshed successfully', {
        userId: user._id,
        ip: req.ip
      });

      res.json({
        success: true,
        data: {
          accessToken: newTokens.accessToken,
          refreshToken: newTokens.refreshToken,
          expiresIn: 900
        },
        message: 'Token refreshed successfully'
      });

    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(401).json({
        success: false,
        error: 'TOKEN_REFRESH_FAILED',
        message: 'Failed to refresh token'
      });
    }
  }
);

/**
 * Logout - Blacklist current token and remove refresh token
 */
router.post('/logout',
  enhancedAuth,
  async (req, res) => {
    try {
      const { token } = req.tokenInfo;
      const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

      // Blacklist access token
      await tokenManager.blacklistToken(token);

      // Remove refresh token from database
      if (refreshToken) {
        await tokenManager.rotateRefreshToken(refreshToken, req.user).catch(() => {
          // Ignore errors if refresh token is already invalid
        });
      }

      // Clear cookies
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      logger.info('User logged out successfully', {
        userId: req.user._id,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'LOGOUT_FAILED',
        message: 'Logout failed'
      });
    }
  }
);

/**
 * Logout from all devices
 */
router.post('/logout-all',
  enhancedAuth,
  async (req, res) => {
    try {
      // Revoke all refresh tokens for user
      await tokenManager.revokeAllRefreshTokens(req.user._id);

      // Blacklist current access token
      await tokenManager.blacklistToken(req.tokenInfo.token);

      // Clear cookies
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      logger.info('User logged out from all devices', {
        userId: req.user._id,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Logged out from all devices successfully'
      });

    } catch (error) {
      logger.error('Logout all error:', error);
      res.status(500).json({
        success: false,
        error: 'LOGOUT_ALL_FAILED',
        message: 'Failed to logout from all devices'
      });
    }
  }
);

/**
 * Setup 2FA - Generate QR Code
 */
router.post('/2fa/setup',
  enhancedAuth,
  advancedRateLimit.twoFactorLimiter(),
  async (req, res) => {
    try {
      if (req.user.twoFactorEnabled) {
        return res.status(400).json({
          success: false,
          error: 'TWO_FACTOR_ALREADY_ENABLED',
          message: '2FA is already enabled'
        });
      }

      const secretData = await twoFactorAuthService.generateSecret(
        req.user.email,
        req.user._id
      );

      res.json({
        success: true,
        data: {
          qrCode: secretData.qrCode,
          manualEntryKey: secretData.manualEntryKey,
          secret: secretData.secret // Temporarily return for verification
        },
        message: 'Scan the QR code with your authenticator app'
      });

    } catch (error) {
      logger.error('2FA setup error:', error);
      res.status(500).json({
        success: false,
        error: 'TWO_FACTOR_SETUP_FAILED',
        message: 'Failed to setup 2FA'
      });
    }
  }
);

/**
 * Enable 2FA - Verify setup and enable
 */
router.post('/2fa/enable',
  enhancedAuth,
  advancedRateLimit.twoFactorLimiter(),
  async (req, res) => {
    try {
      const { secret, verificationToken } = req.body;

      if (!secret || !verificationToken) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_VERIFICATION_DATA',
          message: 'Secret and verification token are required'
        });
      }

      const result = await twoFactorAuthService.enable2FA(
        req.user._id,
        secret,
        verificationToken
      );

      logger.info('2FA enabled for user', {
        userId: req.user._id,
        ip: req.ip
      });

      res.json({
        success: true,
        data: {
          backupCodes: result.backupCodes
        },
        message: '2FA enabled successfully. Save your backup codes!'
      });

    } catch (error) {
      logger.error('2FA enable error:', error);
      res.status(400).json({
        success: false,
        error: 'TWO_FACTOR_ENABLE_FAILED',
        message: error.message || 'Failed to enable 2FA'
      });
    }
  }
);

/**
 * Disable 2FA
 */
router.post('/2fa/disable',
  enhancedAuth,
  advancedRateLimit.twoFactorLimiter(),
  async (req, res) => {
    try {
      const { currentPassword } = req.body;

      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          error: 'PASSWORD_REQUIRED',
          message: 'Current password is required to disable 2FA'
        });
      }

      await twoFactorAuthService.disable2FA(req.user._id, currentPassword);

      logger.info('2FA disabled for user', {
        userId: req.user._id,
        ip: req.ip
      });

      res.json({
        success: true,
        message: '2FA disabled successfully'
      });

    } catch (error) {
      logger.error('2FA disable error:', error);
      res.status(400).json({
        success: false,
        error: 'TWO_FACTOR_DISABLE_FAILED',
        message: error.message || 'Failed to disable 2FA'
      });
    }
  }
);

/**
 * Regenerate 2FA backup codes
 */
router.post('/2fa/regenerate-backup-codes',
  enhancedAuth,
  advancedRateLimit.twoFactorLimiter(),
  async (req, res) => {
    try {
      const { verificationToken } = req.body;

      if (!verificationToken) {
        return res.status(400).json({
          success: false,
          error: 'VERIFICATION_TOKEN_REQUIRED',
          message: 'TOTP verification token is required'
        });
      }

      const result = await twoFactorAuthService.regenerateBackupCodes(
        req.user._id,
        verificationToken
      );

      logger.info('2FA backup codes regenerated', {
        userId: req.user._id,
        ip: req.ip
      });

      res.json({
        success: true,
        data: {
          backupCodes: result.backupCodes
        },
        message: 'New backup codes generated successfully'
      });

    } catch (error) {
      logger.error('2FA backup codes regeneration error:', error);
      res.status(400).json({
        success: false,
        error: 'BACKUP_CODES_REGENERATION_FAILED',
        message: error.message || 'Failed to regenerate backup codes'
      });
    }
  }
);

/**
 * Get 2FA status
 */
router.get('/2fa/status',
  enhancedAuth,
  async (req, res) => {
    try {
      const status = await twoFactorAuthService.get2FAStatus(req.user._id);
      
      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      logger.error('2FA status error:', error);
      res.status(500).json({
        success: false,
        error: 'TWO_FACTOR_STATUS_FAILED',
        message: 'Failed to get 2FA status'
      });
    }
  }
);

/**
 * Verify current session
 */
router.get('/verify',
  enhancedAuth,
  async (req, res) => {
    res.json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          email: req.user.email,
          role: req.user.role,
          profile: {
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            avatar: req.user.avatar
          },
          tenant: req.user.tenantId,
          twoFactorEnabled: req.user.twoFactorEnabled,
          lastLoginAt: req.user.lastLoginAt
        },
        tokenInfo: {
          issuedAt: req.tokenInfo.issuedAt,
          expiresAt: req.tokenInfo.expiresAt
        }
      }
    });
  }
);

module.exports = router;