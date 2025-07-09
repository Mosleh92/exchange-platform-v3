// backend/src/middleware/securityMiddleware.js
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

// Advanced Rate Limiting
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message,
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });
};

// Different rate limits for different endpoints
const rateLimiters = {
  login: createRateLimiter(15 * 60 * 1000, 5, 'خطا: تعداد درخواست‌های ورود از حد مجاز بیشتر است'),
  api: createRateLimiter(15 * 60 * 1000, 100, 'خطا: تعداد درخواست‌های API از حد مجاز بیشتر است'),
  upload: createRateLimiter(60 * 60 * 1000, 20, 'خطا: تعداد آپلود فایل از حد مجاز بیشتر است'),
  payment: createRateLimiter(5 * 60 * 1000, 10, 'خطا: تعداد درخواست‌های پرداخت از حد مجاز بیشتر است')
};

// Security headers
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
});

// XSS Protection
const xssProtection = xss();

// NoSQL Injection Protection
const mongoSanitization = mongoSanitize();

// HTTP Parameter Pollution Protection
const hppProtection = hpp({
  whitelist: ['sort', 'fields', 'page', 'limit', 'status']
});

module.exports = {
  rateLimiters,
  securityHeaders,
  xssProtection,
  mongoSanitization,
  hppProtection
};
