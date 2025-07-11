// src/middleware/rateLimiting.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

/**
 * Enterprise Rate Limiting Middleware
 * Features: Redis-backed rate limiting, role-based limits, IP whitelisting
 */

// Create Redis client for rate limiting
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableAutoPipelining: true
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Redis connected for rate limiting');
});

// Initialize Redis connection
redisClient.connect().catch(console.error);

/**
 * Create rate limit store using Redis
 */
const createRedisStore = () => {
  return new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  });
};

/**
 * Custom key generator that includes tenant and user information
 */
const keyGenerator = (req) => {
  const ip = req.ip || req.connection.remoteAddress;
  const userId = req.user?.id || 'anonymous';
  const tenantId = req.user?.tenantId || req.headers['x-tenant-id'] || 'unknown';
  
  return `rate_limit:${tenantId}:${userId}:${ip}`;
};

/**
 * Custom skip function for whitelisted IPs and privileged users
 */
const skipFunction = (req) => {
  // Skip rate limiting for super admins
  if (req.user?.role === 'super_admin') {
    return true;
  }
  
  // Skip for whitelisted IPs
  const whitelistedIPs = process.env.RATE_LIMIT_WHITELIST?.split(',') || [];
  const clientIP = req.ip || req.connection.remoteAddress;
  
  if (whitelistedIPs.includes(clientIP)) {
    return true;
  }
  
  // Skip for internal requests
  if (req.headers['x-internal-request'] === 'true') {
    return true;
  }
  
  return false;
};

/**
 * Custom handler for rate limit exceeded
 */
const rateLimitHandler = (req, res) => {
  const retryAfter = Math.round(req.rateLimit.resetTime / 1000);
  
  res.status(429).json({
    error: 'Rate limit exceeded',
    message: 'Too many requests, please try again later',
    retryAfter,
    limit: req.rateLimit.limit,
    remaining: req.rateLimit.remaining,
    resetTime: new Date(req.rateLimit.resetTime).toISOString()
  });
};

/**
 * Role-based rate limiting configuration
 */
const getRoleBasedLimits = (role) => {
  const limits = {
    super_admin: { windowMs: 15 * 60 * 1000, max: 10000 }, // 10k per 15min
    tenant_admin: { windowMs: 15 * 60 * 1000, max: 2000 },  // 2k per 15min
    branch_manager: { windowMs: 15 * 60 * 1000, max: 1000 }, // 1k per 15min
    staff: { windowMs: 15 * 60 * 1000, max: 500 },          // 500 per 15min
    customer: { windowMs: 15 * 60 * 1000, max: 100 }        // 100 per 15min
  };
  
  return limits[role] || limits.customer;
};

/**
 * General rate limiter - applies to all requests
 */
const generalRateLimit = rateLimit({
  store: createRedisStore(),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // Default 100 requests per window
  keyGenerator,
  skip: skipFunction,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later'
});

/**
 * Authentication rate limiter - stricter limits for auth endpoints
 */
const authRateLimit = rateLimit({
  store: createRedisStore(),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5, // 5 attempts per window
  keyGenerator: (req) => {
    const ip = req.ip || req.connection.remoteAddress;
    const email = req.body?.email || 'unknown';
    return `auth_limit:${ip}:${email}`;
  },
  skipSuccessfulRequests: true, // Don't count successful auth attempts
  handler: (req, res) => {
    res.status(429).json({
      error: 'Authentication rate limit exceeded',
      message: 'Too many login attempts, please try again in 15 minutes',
      retryAfter: 900 // 15 minutes
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Transaction rate limiter - for financial operations
 */
const transactionRateLimit = rateLimit({
  store: createRedisStore(),
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.TRANSACTION_RATE_LIMIT_MAX) || 10, // 10 transactions per minute
  keyGenerator,
  skip: (req) => {
    // Skip for super admins and tenant admins
    return ['super_admin', 'tenant_admin'].includes(req.user?.role);
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Transaction rate limit exceeded',
      message: 'Too many transactions, please wait before creating another transaction',
      retryAfter: 60
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * API rate limiter - for API endpoints
 */
const apiRateLimit = rateLimit({
  store: createRedisStore(),
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.API_RATE_LIMIT_MAX) || 60, // 60 requests per minute
  keyGenerator: (req) => {
    // Use API key if available, otherwise fall back to user/IP
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      return `api_limit:${apiKey}`;
    }
    return keyGenerator(req);
  },
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * File upload rate limiter
 */
const fileUploadRateLimit = rateLimit({
  store: createRedisStore(),
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.FILE_UPLOAD_RATE_LIMIT_MAX) || 5, // 5 uploads per minute
  keyGenerator,
  handler: (req, res) => {
    res.status(429).json({
      error: 'File upload rate limit exceeded',
      message: 'Too many file uploads, please wait before uploading again',
      retryAfter: 60
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Password reset rate limiter
 */
const passwordResetRateLimit = rateLimit({
  store: createRedisStore(),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset attempts per hour
  keyGenerator: (req) => {
    const ip = req.ip || req.connection.remoteAddress;
    const email = req.body?.email || 'unknown';
    return `password_reset_limit:${ip}:${email}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Password reset rate limit exceeded',
      message: 'Too many password reset attempts, please try again in 1 hour',
      retryAfter: 3600
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * 2FA verification rate limiter
 */
const twoFactorRateLimit = rateLimit({
  store: createRedisStore(),
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 attempts per 5 minutes
  keyGenerator: (req) => {
    const userId = req.user?.id || req.body?.userId || 'unknown';
    const ip = req.ip || req.connection.remoteAddress;
    return `2fa_limit:${userId}:${ip}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: '2FA verification rate limit exceeded',
      message: 'Too many 2FA verification attempts, please try again in 5 minutes',
      retryAfter: 300
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Dynamic rate limiter based on user role
 */
const createRoleBasedRateLimit = () => {
  return (req, res, next) => {
    const userRole = req.user?.role || 'customer';
    const limits = getRoleBasedLimits(userRole);
    
    const dynamicRateLimit = rateLimit({
      store: createRedisStore(),
      windowMs: limits.windowMs,
      max: limits.max,
      keyGenerator,
      skip: skipFunction,
      handler: rateLimitHandler,
      standardHeaders: true,
      legacyHeaders: false
    });
    
    return dynamicRateLimit(req, res, next);
  };
};

/**
 * Tenant-based rate limiter
 */
const createTenantRateLimit = () => {
  return (req, res, next) => {
    const tenantPlan = req.tenant?.subscriptionPlan || 'trial';
    
    const planLimits = {
      trial: { windowMs: 60 * 1000, max: 20 },      // 20 per minute
      basic: { windowMs: 60 * 1000, max: 100 },     // 100 per minute
      professional: { windowMs: 60 * 1000, max: 500 }, // 500 per minute
      enterprise: { windowMs: 60 * 1000, max: 2000 }   // 2000 per minute
    };
    
    const limits = planLimits[tenantPlan] || planLimits.trial;
    
    const tenantRateLimit = rateLimit({
      store: createRedisStore(),
      windowMs: limits.windowMs,
      max: limits.max,
      keyGenerator: (req) => {
        const tenantId = req.tenant?.id || req.headers['x-tenant-id'] || 'unknown';
        return `tenant_limit:${tenantId}`;
      },
      handler: (req, res) => {
        res.status(429).json({
          error: 'Tenant rate limit exceeded',
          message: `Your ${tenantPlan} plan limit has been exceeded. Please upgrade your plan for higher limits.`,
          retryAfter: Math.round(limits.windowMs / 1000),
          currentPlan: tenantPlan,
          upgradeUrl: '/billing/upgrade'
        });
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    
    return tenantRateLimit(req, res, next);
  };
};

/**
 * Suspicious activity rate limiter
 */
const suspiciousActivityRateLimit = rateLimit({
  store: createRedisStore(),
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 1, // Only 1 attempt for suspicious activities
  keyGenerator: (req) => {
    const ip = req.ip || req.connection.remoteAddress;
    return `suspicious_activity:${ip}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Suspicious activity detected',
      message: 'Your request has been flagged for suspicious activity. Please contact support.',
      retryAfter: 300
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Cleanup function for graceful shutdown
 */
const cleanup = async () => {
  try {
    await redisClient.quit();
    console.log('✅ Redis rate limiting client closed gracefully');
  } catch (error) {
    console.error('❌ Error closing Redis rate limiting client:', error);
  }
};

// Export all rate limiters
module.exports = {
  generalRateLimit,
  authRateLimit,
  transactionRateLimit,
  apiRateLimit,
  fileUploadRateLimit,
  passwordResetRateLimit,
  twoFactorRateLimit,
  suspiciousActivityRateLimit,
  createRoleBasedRateLimit,
  createTenantRateLimit,
  cleanup,
  redisClient
};