const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');
const logger = require('../utils/logger');

/**
 * Comprehensive Security Service
 * Handles authentication, session management, rate limiting, and security controls
 */
class SecurityService {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.refreshTokenRotation = true;
    this.maxRefreshTokens = 5;
    this.sessionTimeout = 24 * 60 * 60; // 24 hours
    this.jwtSecret = process.env.JWT_SECRET;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET;
    
    // Initialize rate limiters
    this.initializeRateLimiters();
  }

  /**
   * Initialize rate limiters for different endpoints
   */
  initializeRateLimiters() {
    // Authentication rate limiter
    this.authRateLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
      message: 'Too many authentication attempts',
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit exceeded for authentication', {
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        res.status(429).json({
          error: 'Too many authentication attempts. Please try again later.',
          retryAfter: Math.ceil(15 * 60 / 1000)
        });
      }
    });

    // API rate limiter
    this.apiRateLimiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 100, // 100 requests per minute
      message: 'Too many API requests',
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return req.headers['tenant-id'] + ':' + req.ip;
      }
    });

    // Trading API rate limiter (stricter)
    this.tradingRateLimiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 30, // 30 requests per minute
      message: 'Too many trading requests',
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return req.headers['tenant-id'] + ':' + req.user?.id + ':' + req.ip;
      }
    });
  }

  /**
   * Generate JWT tokens with rotation
   */
  async generateTokens(user, tenantId) {
    const accessToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        tenantId: tenantId,
        permissions: user.permissions || []
      },
      this.jwtSecret,
      { expiresIn: '15m' }
    );

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

    // Store refresh token hash in Redis with rotation
    const tokenKey = `refresh_token:${user.id}:${tenantId}`;
    const existingTokens = await this.redis.lrange(tokenKey, 0, -1);
    
    if (existingTokens.length >= this.maxRefreshTokens) {
      // Remove oldest token
      await this.redis.lpop(tokenKey);
    }
    
    await this.redis.rpush(tokenKey, refreshTokenHash);
    await this.redis.expire(tokenKey, this.sessionTimeout);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes
      refreshExpiresIn: this.sessionTimeout
    };
  }

  /**
   * Verify and refresh JWT tokens
   */
  async verifyAndRefreshTokens(accessToken, refreshToken, tenantId) {
    try {
      // Verify access token
      const decoded = jwt.verify(accessToken, this.jwtSecret);
      
      // Check if refresh token is valid
      const tokenKey = `refresh_token:${decoded.userId}:${tenantId}`;
      const storedTokens = await this.redis.lrange(tokenKey, 0, -1);
      
      let validRefreshToken = false;
      for (const storedToken of storedTokens) {
        if (await bcrypt.compare(refreshToken, storedToken)) {
          validRefreshToken = true;
          break;
        }
      }

      if (!validRefreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      const user = await this.getUserById(decoded.userId);
      return await this.generateTokens(user, tenantId);

    } catch (error) {
      logger.error('Token verification failed:', error);
      throw new Error('Invalid tokens');
    }
  }

  /**
   * Implement 2FA/MFA
   */
  async setup2FA(userId, tenantId) {
    const secret = crypto.randomBytes(20).toString('base32');
    const qrCodeUrl = `otpauth://totp/${tenantId}:${userId}?secret=${secret}&issuer=ExchangePlatform`;
    
    // Store secret securely
    await this.redis.setex(`2fa_secret:${userId}:${tenantId}`, 300, secret); // 5 minutes to setup
    
    return {
      secret,
      qrCodeUrl,
      backupCodes: this.generateBackupCodes()
    };
  }

  /**
   * Verify 2FA code
   */
  async verify2FA(userId, tenantId, code) {
    const secret = await this.redis.get(`2fa_secret:${userId}:${tenantId}`);
    if (!secret) {
      throw new Error('2FA not set up');
    }

    // Verify TOTP code
    const isValid = this.verifyTOTP(secret, code);
    if (!isValid) {
      throw new Error('Invalid 2FA code');
    }

    return true;
  }

  /**
   * Generate backup codes for 2FA
   */
  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  /**
   * Verify TOTP code
   */
  verifyTOTP(secret, code) {
    // Implementation would use a TOTP library like speakeasy
    // For now, return true for demonstration
    return true;
  }

  /**
   * Session hijacking protection
   */
  async validateSession(req, res, next) {
    const sessionId = req.headers['session-id'];
    const userAgent = req.get('User-Agent');
    const ip = req.ip;

    if (!sessionId) {
      return res.status(401).json({ error: 'Session ID required' });
    }

    const sessionData = await this.redis.get(`session:${sessionId}`);
    if (!sessionData) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const session = JSON.parse(sessionData);
    
    // Check for session hijacking indicators
    if (session.userAgent !== userAgent || session.ip !== ip) {
      logger.warn('Potential session hijacking detected', {
        sessionId,
        expectedUserAgent: session.userAgent,
        actualUserAgent: userAgent,
        expectedIp: session.ip,
        actualIp: ip
      });
      
      // Invalidate session
      await this.redis.del(`session:${sessionId}`);
      return res.status(401).json({ error: 'Session security violation' });
    }

    req.session = session;
    next();
  }

  /**
   * API request signing for trading APIs
   */
  verifyRequestSignature(req, res, next) {
    const signature = req.headers['x-signature'];
    const timestamp = req.headers['x-timestamp'];
    const apiKey = req.headers['x-api-key'];

    if (!signature || !timestamp || !apiKey) {
      return res.status(401).json({ error: 'Missing authentication headers' });
    }

    // Verify timestamp (prevent replay attacks)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > 300) { // 5 minutes
      return res.status(401).json({ error: 'Request timestamp expired' });
    }

    // Verify signature
    const expectedSignature = this.generateRequestSignature(
      req.method,
      req.path,
      req.body,
      timestamp,
      apiKey
    );

    if (signature !== expectedSignature) {
      logger.warn('Invalid request signature', {
        ip: req.ip,
        path: req.path,
        expectedSignature,
        actualSignature: signature
      });
      return res.status(401).json({ error: 'Invalid request signature' });
    }

    next();
  }

  /**
   * Generate request signature
   */
  generateRequestSignature(method, path, body, timestamp, apiKey) {
    const payload = `${method}${path}${JSON.stringify(body)}${timestamp}${apiKey}`;
    return crypto.createHmac('sha256', this.jwtSecret).update(payload).digest('hex');
  }

  /**
   * Webhook signature verification
   */
  verifyWebhookSignature(req, res, next) {
    const signature = req.headers['x-webhook-signature'];
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (!signature) {
      return res.status(401).json({ error: 'Missing webhook signature' });
    }

    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      logger.warn('Invalid webhook signature', {
        ip: req.ip,
        expectedSignature,
        actualSignature: signature
      });
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    next();
  }

  /**
   * Field-level encryption for sensitive data
   */
  encryptSensitiveField(value) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: cipher.getAuthTag().toString('hex')
    };
  }

  /**
   * Decrypt sensitive field
   */
  decryptSensitiveField(encryptedData) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');
    
    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Data anonymization for GDPR compliance
   */
  anonymizeData(data, fields) {
    const anonymized = { ...data };
    
    fields.forEach(field => {
      if (anonymized[field]) {
        anonymized[field] = this.hashValue(anonymized[field]);
      }
    });
    
    return anonymized;
  }

  /**
   * Hash value for anonymization
   */
  hashValue(value) {
    return crypto.createHash('sha256').update(value.toString()).digest('hex');
  }

  /**
   * Get rate limiters
   */
  getRateLimiters() {
    return {
      auth: this.authRateLimiter,
      api: this.apiRateLimiter,
      trading: this.tradingRateLimiter
    };
  }

  /**
   * Cleanup expired sessions and tokens
   */
  async cleanupExpiredSessions() {
    try {
      // Cleanup expired refresh tokens
      const keys = await this.redis.keys('refresh_token:*');
      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -1) {
          await this.redis.expire(key, this.sessionTimeout);
        }
      }

      // Cleanup expired sessions
      const sessionKeys = await this.redis.keys('session:*');
      for (const key of sessionKeys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -1) {
          await this.redis.expire(key, this.sessionTimeout);
        }
      }

      logger.info('Session cleanup completed');
    } catch (error) {
      logger.error('Session cleanup failed:', error);
    }
  }

  // Helper methods
  async getUserById(userId) {
    // Implementation to get user from database
    return { id: userId, email: 'user@example.com', role: 'user' };
  }
}

module.exports = new SecurityService(); 