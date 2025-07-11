// backend/src/routes/auth.enhanced.js
const express = require('express');
const bcrypt = require('bcryptjs');
const authTokenService = require('../services/authTokenService');
const mfaService = require('../services/mfaService');
const securityMonitoringService = require('../services/securityMonitoringService');
const enhancedAuth = require('../middleware/enhancedAuth');
const inputValidation = require('../middleware/inputValidation');
const User = require('../models/User');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Enhanced Authentication Routes
 * Demonstrates integration of all security features
 */

// Login with enhanced security
router.post('/login', 
  inputValidation.validate('login'),
  async (req, res) => {
    try {
      const { email, password, mfaCode, rememberMe } = req.body;
      
      // Find user
      const user = await User.findOne({ email }).populate('tenantId');
      if (!user) {
        securityMonitoringService.logSecurityEvent('auth_failure', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          email,
          reason: 'user_not_found'
        });
        
        return res.status(401).json({
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        securityMonitoringService.logSecurityEvent('auth_failure', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          email,
          userId: user.id,
          reason: 'invalid_password'
        });
        
        return res.status(401).json({
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        });
      }

      // Check if MFA is required
      const requiresMFA = user.twoFactorEnabled || mfaService.shouldPromptMFA(user, req);
      
      if (requiresMFA && !mfaCode) {
        // Generate MFA challenge
        const challenge = mfaService.generateMFAChallenge(user.id);
        
        return res.status(200).json({
          success: false,
          requiresMFA: true,
          challenge: challenge.challenge,
          message: 'Multi-factor authentication required'
        });
      }

      // Verify MFA if provided
      if (requiresMFA && mfaCode) {
        let mfaValid = false;
        
        if (user.twoFactorSecret) {
          // Verify TOTP
          mfaValid = mfaService.verifyTOTP(mfaCode, user.twoFactorSecret);
        }
        
        if (!mfaValid && user.backupCodes) {
          // Try backup codes
          mfaValid = mfaService.verifyBackupCode(mfaCode, user.backupCodes);
          if (mfaValid) {
            // Remove used backup code
            mfaService.invalidateBackupCode(mfaCode, user.backupCodes);
            await user.save();
          }
        }
        
        if (!mfaValid) {
          securityMonitoringService.logSecurityEvent('auth_failure', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            email,
            userId: user.id,
            reason: 'invalid_mfa'
          });
          
          return res.status(401).json({
            error: 'INVALID_MFA',
            message: 'Invalid multi-factor authentication code'
          });
        }
      }

      // Generate token pair
      const sessionData = {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      };
      
      const tokens = await authTokenService.generateTokenPair(user, sessionData);
      
      // Update user login information
      user.lastLogin = new Date();
      user.lastLoginIP = req.ip;
      user.lastLoginUserAgent = req.get('User-Agent');
      await user.save();

      // Log successful authentication
      securityMonitoringService.logSecurityEvent('auth_success', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: user.id,
        tenantId: user.tenantId?.id
      });

      // Set secure cookies
      const cookieOptions = authTokenService.getSecureCookieOptions();
      if (rememberMe) {
        res.cookie('refreshToken', tokens.refreshToken, cookieOptions);
      }

      res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenantId?.id
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: rememberMe ? undefined : tokens.refreshToken,
          expiresIn: tokens.expiresIn
        }
      });

    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Login failed due to server error'
      });
    }
  }
);

// Refresh token endpoint
router.post('/refresh',
  enhancedAuth.getRateLimiters().refresh,
  async (req, res) => {
    try {
      const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
      
      if (!refreshToken) {
        return res.status(401).json({
          error: 'REFRESH_TOKEN_REQUIRED',
          message: 'Refresh token is required'
        });
      }

      const sessionData = {
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      };

      const newTokens = await authTokenService.refreshAccessToken(refreshToken, sessionData);
      
      res.json({
        success: true,
        tokens: newTokens
      });

    } catch (error) {
      logger.error('Token refresh error:', error);
      
      securityMonitoringService.logSecurityEvent('auth_failure', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'refresh_token_invalid'
      });
      
      res.status(401).json({
        error: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token'
      });
    }
  }
);

// Logout endpoint
router.post('/logout',
  enhancedAuth.authenticate,
  async (req, res) => {
    try {
      // Blacklist current token
      if (req.tokenInfo?.tokenId) {
        await authTokenService.blacklistToken(req.tokenInfo.tokenId);
      }

      // Clear cookies
      res.clearCookie('refreshToken');
      res.clearCookie('accessToken');

      logger.info('User logged out', {
        userId: req.user.id,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        error: 'LOGOUT_ERROR',
        message: 'Logout failed'
      });
    }
  }
);

// Setup MFA endpoint
router.post('/mfa/setup',
  enhancedAuth.authenticate,
  async (req, res) => {
    try {
      const user = req.user;
      
      if (user.twoFactorEnabled) {
        return res.status(400).json({
          error: 'MFA_ALREADY_ENABLED',
          message: 'Multi-factor authentication is already enabled'
        });
      }

      const mfaSetup = await mfaService.generateMFASetup(user);
      
      res.json({
        success: true,
        setup: {
          qrCode: mfaSetup.qrCode,
          manualEntryKey: mfaSetup.manualEntryKey,
          backupCodes: mfaSetup.backupCodes
        }
      });

    } catch (error) {
      logger.error('MFA setup error:', error);
      res.status(500).json({
        error: 'MFA_SETUP_ERROR',
        message: 'MFA setup failed'
      });
    }
  }
);

// Verify and enable MFA
router.post('/mfa/verify',
  enhancedAuth.authenticate,
  inputValidation.sanitizeRequest,
  async (req, res) => {
    try {
      const { secret, verificationCode, backupCodeTest } = req.body;
      const user = req.user;

      if (!secret || !verificationCode) {
        return res.status(400).json({
          error: 'MISSING_PARAMETERS',
          message: 'Secret and verification code are required'
        });
      }

      const validation = await mfaService.validateMFASetup(secret, verificationCode, backupCodeTest);
      
      if (!validation.valid) {
        return res.status(400).json({
          error: 'MFA_VERIFICATION_FAILED',
          message: validation.error
        });
      }

      // Generate backup codes
      const backupCodes = mfaService.generateBackupCodes();
      
      // Save MFA settings to user
      user.twoFactorEnabled = true;
      user.twoFactorSecret = secret;
      user.backupCodes = backupCodes.hashed;
      await user.save();

      mfaService.logMFAEvent('MFA_ENABLED', user.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Multi-factor authentication enabled successfully',
        backupCodes: backupCodes.codes
      });

    } catch (error) {
      logger.error('MFA verification error:', error);
      res.status(500).json({
        error: 'MFA_VERIFICATION_ERROR',
        message: 'MFA verification failed'
      });
    }
  }
);

// Disable MFA
router.post('/mfa/disable',
  enhancedAuth.authenticate,
  enhancedAuth.requireMFA,
  async (req, res) => {
    try {
      const { password, mfaCode } = req.body;
      const user = req.user;

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'INVALID_PASSWORD',
          message: 'Invalid password'
        });
      }

      // Verify MFA code
      const mfaValid = mfaService.verifyTOTP(mfaCode, user.twoFactorSecret);
      if (!mfaValid) {
        return res.status(401).json({
          error: 'INVALID_MFA',
          message: 'Invalid MFA code'
        });
      }

      // Disable MFA
      user.twoFactorEnabled = false;
      user.twoFactorSecret = null;
      user.backupCodes = [];
      await user.save();

      mfaService.logMFAEvent('MFA_DISABLED', user.id, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Multi-factor authentication disabled successfully'
      });

    } catch (error) {
      logger.error('MFA disable error:', error);
      res.status(500).json({
        error: 'MFA_DISABLE_ERROR',
        message: 'Failed to disable MFA'
      });
    }
  }
);

// Get user sessions
router.get('/sessions',
  enhancedAuth.authenticate,
  async (req, res) => {
    try {
      const sessions = await authTokenService.getUserSessions(req.user.id);
      
      res.json({
        success: true,
        sessions: sessions.map(session => ({
          sessionId: session.sessionId,
          createdAt: session.createdAt,
          lastAccess: session.lastAccess,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          current: session.sessionId === req.tokenInfo?.sessionId
        }))
      });

    } catch (error) {
      logger.error('Get sessions error:', error);
      res.status(500).json({
        error: 'SESSIONS_ERROR',
        message: 'Failed to retrieve sessions'
      });
    }
  }
);

// Revoke session
router.delete('/sessions/:sessionId',
  enhancedAuth.authenticate,
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      await authTokenService.revokeSession(sessionId);
      
      res.json({
        success: true,
        message: 'Session revoked successfully'
      });

    } catch (error) {
      logger.error('Revoke session error:', error);
      res.status(500).json({
        error: 'REVOKE_SESSION_ERROR',
        message: 'Failed to revoke session'
      });
    }
  }
);

module.exports = router;