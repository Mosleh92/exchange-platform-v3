const rateLimit = require('express-rate-limit');
let RedisStore, redis, redisClient;
const logger = require('../utils/logger');

// اگر محیط تست است، از حافظه استفاده کن و Redis را mock کن
const isTest = process.env.NODE_ENV === 'test';

if (!isTest) {
  RedisStore = require('rate-limit-redis');
  redis = require('redis');
  redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    legacyMode: true
  });
  redisClient.connect().catch(console.error);
}

// Create rate limiters with Redis store
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    store: isTest ? undefined : new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args)
    }),
    message: {
        success: false,
        message: 'تعداد تلاش‌های شما بیش از حد مجاز است. لطفاً 15 دقیقه دیگر مجدداً تلاش کنید.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            method: req.method
        });
        res.status(429).json({
            success: false,
            message: 'تعداد تلاش‌های شما بیش از حد مجاز است. لطفاً 15 دقیقه دیگر مجدداً تلاش کنید.',
            code: 'RATE_LIMIT_EXCEEDED'
        });
    }
});

const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    store: isTest ? undefined : new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args)
    }),
    message: {
        success: false,
        message: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً کمی صبر کنید.',
        code: 'API_RATE_LIMIT_EXCEEDED'
    },
    handler: (req, res) => {
        logger.warn('API rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            method: req.method
        });
        res.status(429).json({
            success: false,
            message: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً کمی صبر کنید.',
            code: 'API_RATE_LIMIT_EXCEEDED'
        });
    }
});

// Tenant-specific rate limiter
const tenantLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: (req) => {
        // Get tenant limits from request
        const tenant = req.tenant;
        return tenant?.limits?.apiRateLimit || 100; // Default to 100 requests per minute
    },
    keyGenerator: (req) => {
        // Use tenant ID as part of the key
        return `${req.tenant?.id || 'unknown'}:${req.ip}`;
    },
    store: isTest ? undefined : new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args)
    }),
    message: {
        success: false,
        message: 'محدودیت درخواست برای سازمان شما اعمال شده است.',
        code: 'TENANT_RATE_LIMIT_EXCEEDED'
    },
    handler: (req, res) => {
        logger.warn('Tenant rate limit exceeded', {
            tenantId: req.tenant?.id,
            ip: req.ip,
            path: req.path,
            method: req.method
        });
        res.status(429).json({
            success: false,
            message: 'محدودیت درخواست برای سازمان شما اعمال شده است.',
            code: 'TENANT_RATE_LIMIT_EXCEEDED'
        });
    }
});

// Export rate limiters
module.exports = {
    authLimiter,
    apiLimiter,
    tenantLimiter
}; 