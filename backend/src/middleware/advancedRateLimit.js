// middleware/advancedRateLimit.js - Advanced Rate Limiting with Redis
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('redis');
const logger = require('../utils/logger');

class AdvancedRateLimiter {
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
        logger.error('Redis Client Error for Rate Limiting:', err);
      });
      
      await this.redis.connect();
      logger.info('Redis connected for rate limiting');
    } catch (error) {
      logger.error('Failed to connect to Redis for rate limiting:', error);
      // Will fallback to memory store if Redis not available
    }
  }

  /**
   * Create rate limiter with Redis store
   * @param {Object} options - Rate limiting options
   * @returns {Function} - Rate limiting middleware
   */
  createLimiter(options) {
    const defaultOptions = {
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          userId: req.user?.id,
          userAgent: req.get('User-Agent'),
          endpoint: req.originalUrl,
          method: req.method
        });

        res.status(429).json({
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: options.message || 'Too many requests, please try again later',
          retryAfter: Math.ceil(options.windowMs / 1000)
        });
      }
    };

    // Use Redis store if available
    if (this.redis) {
      defaultOptions.store = new RedisStore({
        sendCommand: (...args) => this.redis.sendCommand(args),
        prefix: 'rl:'
      });
    }

    return rateLimit({
      ...defaultOptions,
      ...options
    });
  }

  /**
   * General user rate limiter - 100 requests per minute
   */
  generalUserLimiter() {
    return this.createLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: (req) => {
        // Different limits based on user role
        if (!req.user) return 50; // Non-authenticated users
        
        switch (req.user.role) {
          case 'super_admin':
          case 'tenant_admin':
            return 500; // Admin users: 500 requests/min
          case 'manager':
          case 'staff':
            return 200; // Staff users: 200 requests/min
          default:
            return 100; // Regular users: 100 requests/min
        }
      },
      keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise IP
        return req.user?.id || req.ip;
      },
      message: 'بیش از حد مجاز درخواست ارسال کردهاید. لطفاً کمی صبر کنید.'
    });
  }

  /**
   * Admin-specific rate limiter - 500 requests per minute
   */
  adminLimiter() {
    return this.createLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: 500,
      keyGenerator: (req) => `admin_${req.user?.id || req.ip}`,
      message: 'Admin rate limit exceeded'
    });
  }

  /**
   * API-specific rate limiter - 1000 requests per minute
   */
  apiLimiter() {
    return this.createLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: 1000,
      keyGenerator: (req) => {
        // Use API key if provided, otherwise user ID or IP
        const apiKey = req.headers['x-api-key'];
        if (apiKey) return `api_${apiKey}`;
        return `api_${req.user?.id || req.ip}`;
      },
      message: 'API rate limit exceeded'
    });
  }

  /**
   * Authentication rate limiter - 5 attempts per 15 minutes
   */
  authLimiter() {
    return this.createLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5,
      keyGenerator: (req) => {
        // Use email from request body for login attempts
        const email = req.body?.email;
        return email ? `auth_${email}` : `auth_ip_${req.ip}`;
      },
      message: 'تعداد تلاش ورود بیش از حد مجاز. لطفاً 15 دقیقه صبر کنید.',
      skipSuccessfulRequests: true // Only count failed attempts
    });
  }

  /**
   * Password reset rate limiter - 3 attempts per hour
   */
  passwordResetLimiter() {
    return this.createLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3,
      keyGenerator: (req) => {
        const email = req.body?.email;
        return email ? `pwd_reset_${email}` : `pwd_reset_ip_${req.ip}`;
      },
      message: 'تعداد درخواست بازیابی رمز عبور بیش از حد مجاز. لطفاً یک ساعت صبر کنید.'
    });
  }

  /**
   * 2FA verification rate limiter - 10 attempts per 5 minutes
   */
  twoFactorLimiter() {
    return this.createLimiter({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 10,
      keyGenerator: (req) => {
        return req.user?.id ? `2fa_${req.user.id}` : `2fa_ip_${req.ip}`;
      },
      message: 'تعداد تلاش تأیید دو مرحله‌ای بیش از حد مجاز.'
    });
  }

  /**
   * File upload rate limiter - 20 uploads per hour
   */
  fileUploadLimiter() {
    return this.createLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 20,
      keyGenerator: (req) => {
        return req.user?.id ? `upload_${req.user.id}` : `upload_ip_${req.ip}`;
      },
      message: 'تعداد آپلود فایل بیش از حد مجاز.'
    });
  }

  /**
   * Transaction rate limiter - 50 transactions per hour
   */
  transactionLimiter() {
    return this.createLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 50,
      keyGenerator: (req) => `transaction_${req.user?.id || req.ip}`,
      message: 'تعداد تراکنش بیش از حد مجاز در این ساعت.'
    });
  }

  /**
   * Email sending rate limiter - 10 emails per hour
   */
  emailLimiter() {
    return this.createLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10,
      keyGenerator: (req) => {
        const email = req.body?.email || req.user?.email;
        return email ? `email_${email}` : `email_ip_${req.ip}`;
      },
      message: 'تعداد ارسال ایمیل بیش از حد مجاز.'
    });
  }

  /**
   * OTP generation rate limiter - 5 OTPs per 15 minutes
   */
  otpLimiter() {
    return this.createLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5,
      keyGenerator: (req) => {
        const identifier = req.body?.phone || req.body?.email || req.user?.id;
        return identifier ? `otp_${identifier}` : `otp_ip_${req.ip}`;
      },
      message: 'تعداد درخواست کد تأیید بیش از حد مجاز.'
    });
  }

  /**
   * Strict limiter for sensitive operations
   */
  strictLimiter() {
    return this.createLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5,
      keyGenerator: (req) => `strict_${req.user?.id || req.ip}`,
      message: 'عملیات حساس: تعداد درخواست بیش از حد مجاز.'
    });
  }

  /**
   * Custom rate limiter factory
   * @param {Object} config - Custom configuration
   * @returns {Function} - Custom rate limiter
   */
  customLimiter(config) {
    return this.createLimiter(config);
  }

  /**
   * Dynamic rate limiter based on user plan or subscription
   */
  dynamicLimiter() {
    return this.createLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: (req) => {
        if (!req.user) return 10; // Very limited for non-authenticated

        // Check user's plan or subscription for custom limits
        const userPlan = req.user.plan || 'basic';
        
        const planLimits = {
          basic: 50,
          premium: 200,
          enterprise: 1000,
          unlimited: 10000
        };

        return planLimits[userPlan] || 50;
      },
      keyGenerator: (req) => `dynamic_${req.user?.id || req.ip}`,
      message: 'سقف درخواست براساس پلن شما'
    });
  }

  /**
   * Geographic rate limiter (can be extended with IP geolocation)
   */
  geographicLimiter() {
    return this.createLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: (req) => {
        // This could be enhanced with actual geolocation
        // For now, just use a default limit
        return 100;
      },
      keyGenerator: (req) => {
        // Could include country code from IP geolocation
        return `geo_${req.ip}`;
      },
      message: 'Geographic rate limit applied'
    });
  }
}

// Singleton instance
const advancedRateLimiter = new AdvancedRateLimiter();

module.exports = advancedRateLimiter;