// src/services/AuthService.js
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const crypto = require('crypto');
const { User, Tenant } = require('../models/postgresql');

/**
 * Enterprise Authentication Service
 * Features: JWT refresh tokens, 2FA, enhanced security
 */
class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || this.jwtSecret + '_refresh';
    this.jwtExpiration = process.env.JWT_EXPIRE || '15m';
    this.jwtRefreshExpiration = process.env.JWT_REFRESH_EXPIRE || '7d';
    this.encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
    
    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET is required for authentication service');
    }
  }
  
  /**
   * Generate JWT access and refresh tokens
   */
  generateTokens(user, deviceInfo = {}) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      twoFactorEnabled: user.twoFactorEnabled,
      iat: Math.floor(Date.now() / 1000)
    };
    
    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiration,
      issuer: 'exchange-platform-enterprise',
      audience: 'exchange-platform-users',
      subject: user.id
    });
    
    const refreshTokenPayload = {
      ...payload,
      tokenType: 'refresh',
      deviceId: deviceInfo.deviceId || crypto.randomUUID(),
      userAgent: deviceInfo.userAgent,
      ipAddress: deviceInfo.ipAddress
    };
    
    const refreshToken = jwt.sign(refreshTokenPayload, this.jwtRefreshSecret, {
      expiresIn: this.jwtRefreshExpiration,
      issuer: 'exchange-platform-enterprise',
      audience: 'exchange-platform-users',
      subject: user.id
    });
    
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.parseExpiration(this.jwtExpiration),
      refreshExpiresIn: this.parseExpiration(this.jwtRefreshExpiration)
    };
  }
  
  /**
   * Verify JWT token
   */
  verifyToken(token, isRefreshToken = false) {
    try {
      const secret = isRefreshToken ? this.jwtRefreshSecret : this.jwtSecret;
      return jwt.verify(token, secret, {
        issuer: 'exchange-platform-enterprise',
        audience: 'exchange-platform-users'
      });
    } catch (error) {
      throw new Error(`Invalid token: ${error.message}`);
    }
  }
  
  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken, deviceInfo = {}) {
    try {
      const decoded = this.verifyToken(refreshToken, true);
      
      if (decoded.tokenType !== 'refresh') {
        throw new Error('Invalid refresh token type');
      }
      
      // Get user from database
      const user = await User.findByPk(decoded.id, {
        include: [{ model: Tenant, as: 'tenant' }]
      });
      
      if (!user || user.status !== 'active') {
        throw new Error('User not found or inactive');
      }
      
      // Check if user's tenant is active
      if (!user.tenant || user.tenant.status !== 'active') {
        throw new Error('Tenant is inactive');
      }
      
      // Validate device consistency (optional security measure)
      if (decoded.deviceId && deviceInfo.deviceId && decoded.deviceId !== deviceInfo.deviceId) {
        throw new Error('Device mismatch detected');
      }
      
      // Generate new tokens
      const tokens = this.generateTokens(user, deviceInfo);
      
      // Update user's last activity
      await user.update({ lastActivity: new Date() });
      
      return tokens;
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }
  
  /**
   * Authenticate user with email and password
   */
  async authenticateUser(email, password, tenantId, deviceInfo = {}) {
    try {
      // Find user by email and tenant
      const user = await User.scope('withPassword').findOne({
        where: { email, tenantId },
        include: [{ model: Tenant, as: 'tenant' }]
      });
      
      if (!user) {
        throw new Error('Invalid credentials');
      }
      
      // Check if account is locked
      if (user.isLocked()) {
        throw new Error('Account is temporarily locked due to failed login attempts');
      }
      
      // Check if user is active
      if (user.status !== 'active') {
        throw new Error('Account is inactive');
      }
      
      // Check if tenant is active
      if (!user.tenant || user.tenant.status !== 'active') {
        throw new Error('Organization is inactive');
      }
      
      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        await user.incrementLoginAttempts();
        throw new Error('Invalid credentials');
      }
      
      // Reset login attempts on successful authentication
      await user.resetLoginAttempts();
      
      // Update login information
      await user.update({
        lastLogin: new Date(),
        lastLoginIp: deviceInfo.ipAddress,
        lastActivity: new Date()
      });
      
      return {
        user: user.toJSON(), // Excludes sensitive fields
        requiresTwoFactor: user.twoFactorEnabled,
        tenant: user.tenant
      };
    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }
  
  /**
   * Complete authentication with 2FA verification
   */
  async completeTwoFactorAuth(userId, token, deviceInfo = {}) {
    try {
      const user = await User.scope('withTwoFactor').findByPk(userId, {
        include: [{ model: Tenant, as: 'tenant' }]
      });
      
      if (!user || !user.twoFactorEnabled) {
        throw new Error('Two-factor authentication is not enabled');
      }
      
      let isValidToken = false;
      
      // Try TOTP verification first
      if (user.twoFactorSecret) {
        isValidToken = speakeasy.totp.verify({
          secret: user.twoFactorSecret,
          encoding: 'base32',
          token: token,
          window: 2 // Allow 2 time periods of drift
        });
      }
      
      // Try backup codes if TOTP fails
      if (!isValidToken) {
        isValidToken = await user.useBackupCode(token);
      }
      
      if (!isValidToken) {
        throw new Error('Invalid two-factor authentication code');
      }
      
      // Update 2FA usage
      await user.update({ twoFactorLastUsed: new Date() });
      
      // Generate tokens
      const tokens = this.generateTokens(user, deviceInfo);
      
      // Add session to active sessions
      await user.addActiveSession({
        id: crypto.randomUUID(),
        deviceId: deviceInfo.deviceId,
        userAgent: deviceInfo.userAgent,
        ipAddress: deviceInfo.ipAddress,
        loginAt: new Date()
      });
      
      return {
        user: user.toJSON(),
        tokens,
        tenant: user.tenant
      };
    } catch (error) {
      throw new Error(`Two-factor authentication failed: ${error.message}`);
    }
  }
  
  /**
   * Setup two-factor authentication
   */
  async setupTwoFactor(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      const secret = speakeasy.generateSecret({
        name: `Exchange Platform (${user.email})`,
        issuer: process.env.TWO_FACTOR_ISSUER || 'Exchange Platform Enterprise',
        length: 32
      });
      
      // Generate QR code
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
      
      // Generate backup codes
      const backupCodes = [];
      for (let i = 0; i < 8; i++) {
        backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
      }
      
      // Store secret temporarily (not enabled until verified)
      await user.update({
        twoFactorSecret: secret.base32,
        twoFactorBackupCodes: backupCodes.map(code => ({ code, used: false }))
      });
      
      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        backupCodes,
        manualEntryKey: secret.base32
      };
    } catch (error) {
      throw new Error(`Two-factor setup failed: ${error.message}`);
    }
  }
  
  /**
   * Enable two-factor authentication
   */
  async enableTwoFactor(userId, token) {
    try {
      const user = await User.scope('withTwoFactor').findByPk(userId);
      if (!user || !user.twoFactorSecret) {
        throw new Error('Two-factor authentication setup not found');
      }
      
      const isValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: token,
        window: 2
      });
      
      if (!isValid) {
        throw new Error('Invalid verification code');
      }
      
      await user.update({
        twoFactorEnabled: true,
        twoFactorLastUsed: new Date()
      });
      
      return { success: true, message: 'Two-factor authentication enabled successfully' };
    } catch (error) {
      throw new Error(`Two-factor enable failed: ${error.message}`);
    }
  }
  
  /**
   * Disable two-factor authentication
   */
  async disableTwoFactor(userId, password) {
    try {
      const user = await User.scope('withPassword', 'withTwoFactor').findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('Invalid password');
      }
      
      await user.update({
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
        twoFactorLastUsed: null
      });
      
      return { success: true, message: 'Two-factor authentication disabled successfully' };
    } catch (error) {
      throw new Error(`Two-factor disable failed: ${error.message}`);
    }
  }
  
  /**
   * Logout user and invalidate refresh tokens
   */
  async logout(userId, sessionId = null) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      if (sessionId) {
        await user.removeActiveSession(sessionId);
      } else {
        // Clear all active sessions
        await user.update({ activeSessions: [] });
      }
      
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  }
  
  /**
   * Change user password
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.scope('withPassword').findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }
      
      // Validate new password strength
      this.validatePasswordStrength(newPassword);
      
      await user.update({ passwordHash: newPassword });
      
      // Clear all active sessions to force re-login
      await user.update({ activeSessions: [] });
      
      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      throw new Error(`Password change failed: ${error.message}`);
    }
  }
  
  /**
   * Encrypt sensitive data
   */
  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }
  
  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedText) {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
  
  /**
   * Validate password strength
   */
  validatePasswordStrength(password) {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }
    
    if (!/(?=.*\d)/.test(password)) {
      throw new Error('Password must contain at least one number');
    }
    
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      throw new Error('Password must contain at least one special character (@$!%*?&)');
    }
  }
  
  /**
   * Parse expiration time to seconds
   */
  parseExpiration(expiration) {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900;
    }
  }
}

module.exports = new AuthService();