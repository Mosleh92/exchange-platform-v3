// backend/src/services/authTokenService.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const redis = require('redis');

// Fallback logger if winston logger fails
const logger = (() => {
  try {
    return require('../utils/logger');
  } catch (error) {
    console.warn('Using fallback logger');
    return {
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug
    };
  }
})();

/**
 * Enhanced Authentication Token Service
 * Provides secure JWT management with refresh tokens, blacklisting, and session management
 */
class AuthTokenService {
  constructor() {
    this.redisClient = null;
    this.initializeRedis();
    
    // Token configuration
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
    
    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
  }

  /**
   * Initialize Redis connection for token blacklisting and session management
   */
  async initializeRedis() {
    try {
      this.redisClient = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3
      });

      this.redisClient.on('error', (err) => {
        logger.error('Redis connection error:', err);
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis connected successfully');
      });

      await this.redisClient.connect();
    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      // Continue without Redis for development
      this.redisClient = null;
    }
  }

  /**
   * Generate secure token pair (access + refresh)
   */
  async generateTokenPair(user, sessionData = {}) {
    try {
      const tokenId = crypto.randomBytes(16).toString('hex');
      const sessionId = crypto.randomBytes(16).toString('hex');

      // Access token payload
      const accessPayload = {
        id: user.id || user._id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        sessionId,
        tokenId,
        type: 'access'
      };

      // Refresh token payload
      const refreshPayload = {
        id: user.id || user._id,
        sessionId,
        tokenId,
        type: 'refresh'
      };

      // Generate tokens
      const accessToken = jwt.sign(accessPayload, this.jwtSecret, {
        expiresIn: this.accessTokenExpiry,
        issuer: 'exchange-platform',
        audience: 'exchange-api'
      });

      const refreshToken = jwt.sign(refreshPayload, this.jwtRefreshSecret, {
        expiresIn: this.refreshTokenExpiry,
        issuer: 'exchange-platform',
        audience: 'exchange-api'
      });

      // Store session data in Redis
      if (this.redisClient) {
        const sessionKey = `session:${sessionId}`;
        const sessionInfo = {
          userId: user.id || user._id,
          tenantId: user.tenantId,
          tokenId,
          createdAt: new Date().toISOString(),
          lastAccess: new Date().toISOString(),
          userAgent: sessionData.userAgent,
          ipAddress: sessionData.ipAddress,
          ...sessionData
        };

        await this.redisClient.setEx(
          sessionKey, 
          7 * 24 * 60 * 60, // 7 days in seconds
          JSON.stringify(sessionInfo)
        );
      }

      return {
        accessToken,
        refreshToken,
        sessionId,
        tokenId,
        expiresIn: this.parseExpiryTime(this.accessTokenExpiry)
      };
    } catch (error) {
      logger.error('Failed to generate token pair:', error);
      throw new Error('Token generation failed');
    }
  }

  /**
   * Verify and decode access token
   */
  async verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: 'exchange-platform',
        audience: 'exchange-api'
      });

      // Check if token is blacklisted
      if (await this.isTokenBlacklisted(decoded.tokenId)) {
        throw new Error('Token has been revoked');
      }

      // Update last access time
      if (this.redisClient && decoded.sessionId) {
        await this.updateSessionAccess(decoded.sessionId);
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Access token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid access token');
      }
      throw error;
    }
  }

  /**
   * Verify and decode refresh token
   */
  async verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtRefreshSecret, {
        issuer: 'exchange-platform',
        audience: 'exchange-api'
      });

      // Check if token is blacklisted
      if (await this.isTokenBlacklisted(decoded.tokenId)) {
        throw new Error('Refresh token has been revoked');
      }

      // Verify session exists
      if (this.redisClient && decoded.sessionId) {
        const sessionExists = await this.redisClient.exists(`session:${decoded.sessionId}`);
        if (!sessionExists) {
          throw new Error('Session expired or invalid');
        }
      }

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken, sessionData = {}) {
    try {
      const decoded = await this.verifyRefreshToken(refreshToken);
      
      // Get user data from session
      let userData = {};
      if (this.redisClient && decoded.sessionId) {
        const sessionInfo = await this.redisClient.get(`session:${decoded.sessionId}`);
        if (sessionInfo) {
          const session = JSON.parse(sessionInfo);
          userData = {
            id: session.userId,
            tenantId: session.tenantId
          };
        }
      }

      // Create new access token with same session ID
      const tokenId = crypto.randomBytes(16).toString('hex');
      const accessPayload = {
        id: decoded.id,
        sessionId: decoded.sessionId,
        tokenId,
        type: 'access',
        ...userData
      };

      const accessToken = jwt.sign(accessPayload, this.jwtSecret, {
        expiresIn: this.accessTokenExpiry,
        issuer: 'exchange-platform',
        audience: 'exchange-api'
      });

      // Update session with new token ID
      if (this.redisClient && decoded.sessionId) {
        await this.updateSessionAccess(decoded.sessionId, { tokenId });
      }

      return {
        accessToken,
        tokenId,
        expiresIn: this.parseExpiryTime(this.accessTokenExpiry)
      };
    } catch (error) {
      logger.error('Failed to refresh access token:', error);
      throw error;
    }
  }

  /**
   * Blacklist a token (logout)
   */
  async blacklistToken(tokenId, expiresIn = null) {
    if (!this.redisClient) {
      logger.warn('Redis not available, token blacklisting skipped');
      return;
    }

    try {
      const blacklistKey = `blacklist:${tokenId}`;
      const ttl = expiresIn || 24 * 60 * 60; // 24 hours default
      
      await this.redisClient.setEx(blacklistKey, ttl, 'blacklisted');
      logger.info(`Token ${tokenId} blacklisted`);
    } catch (error) {
      logger.error('Failed to blacklist token:', error);
    }
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(tokenId) {
    if (!this.redisClient) {
      return false;
    }

    try {
      const exists = await this.redisClient.exists(`blacklist:${tokenId}`);
      return exists === 1;
    } catch (error) {
      logger.error('Failed to check token blacklist:', error);
      return false;
    }
  }

  /**
   * Revoke session (logout from all devices)
   */
  async revokeSession(sessionId) {
    if (!this.redisClient) {
      return;
    }

    try {
      const sessionKey = `session:${sessionId}`;
      await this.redisClient.del(sessionKey);
      logger.info(`Session ${sessionId} revoked`);
    } catch (error) {
      logger.error('Failed to revoke session:', error);
    }
  }

  /**
   * Update session last access time
   */
  async updateSessionAccess(sessionId, updateData = {}) {
    if (!this.redisClient) {
      return;
    }

    try {
      const sessionKey = `session:${sessionId}`;
      const sessionInfo = await this.redisClient.get(sessionKey);
      
      if (sessionInfo) {
        const session = JSON.parse(sessionInfo);
        session.lastAccess = new Date().toISOString();
        
        // Update with any additional data
        Object.assign(session, updateData);
        
        await this.redisClient.setEx(
          sessionKey, 
          7 * 24 * 60 * 60, // Reset TTL to 7 days
          JSON.stringify(session)
        );
      }
    } catch (error) {
      logger.error('Failed to update session access:', error);
    }
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId) {
    if (!this.redisClient) {
      return [];
    }

    try {
      const keys = await this.redisClient.keys('session:*');
      const sessions = [];

      for (const key of keys) {
        const sessionInfo = await this.redisClient.get(key);
        if (sessionInfo) {
          const session = JSON.parse(sessionInfo);
          if (session.userId === userId) {
            sessions.push({
              sessionId: key.replace('session:', ''),
              ...session
            });
          }
        }
      }

      return sessions;
    } catch (error) {
      logger.error('Failed to get user sessions:', error);
      return [];
    }
  }

  /**
   * Parse expiry time string to seconds
   */
  parseExpiryTime(expiryString) {
    const units = {
      's': 1,
      'm': 60,
      'h': 3600,
      'd': 86400
    };

    const match = expiryString.match(/^(\d+)([smhd])$/);
    if (match) {
      return parseInt(match[1]) * units[match[2]];
    }
    return 900; // Default 15 minutes
  }

  /**
   * Generate secure cookie options
   */
  getSecureCookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: this.parseExpiryTime(this.refreshTokenExpiry) * 1000,
      domain: process.env.COOKIE_DOMAIN,
      path: '/'
    };
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

module.exports = new AuthTokenService();