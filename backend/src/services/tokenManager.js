// services/tokenManager.js - Enhanced JWT Security with Refresh Token Rotation
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Redis = require('redis');
const RefreshToken = require('../models/RefreshToken');
const logger = require('../utils/logger');

class TokenManager {
  constructor() {
    this.redis = null;
    this.initRedis();
  }

  async initRedis() {
    try {
      this.redis = Redis.createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      this.redis.on('error', (err) => {
        logger.error('Redis Client Error:', err);
      });
      
      await this.redis.connect();
      logger.info('Redis connected for token management');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      // Fallback without Redis if not available
    }
  }

  /**
   * Generate access and refresh tokens with rotation
   * @param {Object} user - User object
   * @returns {Object} - { accessToken, refreshToken }
   */
  generateTokens(user) {
    const payload = {
      userId: user._id || user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId
    };

    // Access token: 15 minutes
    const accessToken = jwt.sign(
      payload,
      process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
      { 
        expiresIn: '15m',
        issuer: 'exchange-platform-v3',
        audience: 'exchange-platform-users'
      }
    );

    // Refresh token: 7 days
    const refreshToken = jwt.sign(
      { 
        userId: user._id || user.id,
        tokenVersion: Date.now() // For rotation tracking
      },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { 
        expiresIn: '7d',
        issuer: 'exchange-platform-v3',
        audience: 'exchange-platform-refresh'
      }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Verify access token
   * @param {string} token - JWT token
   * @returns {Object} - Decoded payload
   */
  async verifyAccessToken(token) {
    try {
      // Check if token is blacklisted
      if (await this.isTokenBlacklisted(token)) {
        throw new Error('Token is blacklisted');
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET,
        {
          issuer: 'exchange-platform-v3',
          audience: 'exchange-platform-users'
        }
      );

      return decoded;
    } catch (error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Verify refresh token
   * @param {string} token - Refresh token
   * @returns {Object} - Decoded payload
   */
  async verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        {
          issuer: 'exchange-platform-v3',
          audience: 'exchange-platform-refresh'
        }
      );

      // Check if refresh token exists in database and is valid
      const refreshTokenDoc = await RefreshToken.findOne({ 
        token: token,
        userId: decoded.userId,
        expiresAt: { $gt: new Date() }
      });

      if (!refreshTokenDoc) {
        throw new Error('Refresh token not found or expired');
      }

      return decoded;
    } catch (error) {
      throw new Error(`Refresh token verification failed: ${error.message}`);
    }
  }

  /**
   * Rotate refresh token - invalidate old and create new
   * @param {string} oldRefreshToken - Current refresh token
   * @param {Object} user - User object
   * @returns {Object} - New tokens
   */
  async rotateRefreshToken(oldRefreshToken, user) {
    try {
      // Verify the old refresh token
      const decoded = await this.verifyRefreshToken(oldRefreshToken);

      // Remove old refresh token from database
      await RefreshToken.deleteOne({ 
        token: oldRefreshToken,
        userId: decoded.userId 
      });

      // Generate new tokens
      const newTokens = this.generateTokens(user);

      // Store new refresh token in database
      await this.storeRefreshToken(newTokens.refreshToken, user);

      logger.info('Refresh token rotated successfully', {
        userId: user._id || user.id,
        tenantId: user.tenantId
      });

      return newTokens;
    } catch (error) {
      logger.error('Refresh token rotation failed:', error);
      throw error;
    }
  }

  /**
   * Store refresh token in database
   * @param {string} refreshToken - Refresh token
   * @param {Object} user - User object
   */
  async storeRefreshToken(refreshToken, user) {
    try {
      const decoded = jwt.decode(refreshToken);
      
      await RefreshToken.create({
        userId: user._id || user.id,
        tenantId: user.tenantId,
        token: refreshToken,
        expiresAt: new Date(decoded.exp * 1000)
      });
    } catch (error) {
      logger.error('Failed to store refresh token:', error);
      throw error;
    }
  }

  /**
   * Blacklist a token
   * @param {string} token - Token to blacklist
   */
  async blacklistToken(token) {
    try {
      if (!this.redis) {
        logger.warn('Redis not available for token blacklisting');
        return;
      }

      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        throw new Error('Invalid token format');
      }

      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      
      if (ttl > 0) {
        await this.redis.setEx(`blacklist_${token}`, ttl, 'true');
        logger.info('Token blacklisted successfully', {
          tokenExp: decoded.exp,
          ttl: ttl
        });
      }
    } catch (error) {
      logger.error('Failed to blacklist token:', error);
      throw error;
    }
  }

  /**
   * Check if token is blacklisted
   * @param {string} token - Token to check
   * @returns {boolean} - True if blacklisted
   */
  async isTokenBlacklisted(token) {
    try {
      if (!this.redis) {
        return false; // If Redis not available, assume not blacklisted
      }

      const result = await this.redis.get(`blacklist_${token}`);
      return result === 'true';
    } catch (error) {
      logger.error('Failed to check token blacklist status:', error);
      return false;
    }
  }

  /**
   * Revoke all refresh tokens for a user
   * @param {string} userId - User ID
   */
  async revokeAllRefreshTokens(userId) {
    try {
      await RefreshToken.deleteMany({ userId });
      logger.info('All refresh tokens revoked for user', { userId });
    } catch (error) {
      logger.error('Failed to revoke refresh tokens:', error);
      throw error;
    }
  }

  /**
   * Clean up expired refresh tokens
   */
  async cleanupExpiredTokens() {
    try {
      const result = await RefreshToken.deleteMany({
        expiresAt: { $lt: new Date() }
      });
      
      logger.info('Cleanup expired refresh tokens', {
        deletedCount: result.deletedCount
      });
    } catch (error) {
      logger.error('Failed to cleanup expired tokens:', error);
    }
  }

  /**
   * Generate secure cookies options
   * @param {boolean} isProduction - Environment flag
   * @returns {Object} - Cookie options
   */
  getCookieOptions(isProduction = process.env.NODE_ENV === 'production') {
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    };
  }
}

// Singleton instance
const tokenManager = new TokenManager();

module.exports = tokenManager;