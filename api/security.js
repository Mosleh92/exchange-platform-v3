const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

class SecurityMiddleware {
  // Enhanced authentication middleware
  static authenticate(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'NO_TOKEN'
      });
    }

    try {
      // For production, use proper JWT verification
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());
      
      // Check if token is expired
      if (payload.exp < Date.now()) {
        return res.status(401).json({
          success: false,
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }

      req.user = {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        tenant: payload.tenant
      };
      
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
  }

  // Role-based authorization
  static authorize(roles = []) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'NOT_AUTHENTICATED'
        });
      }

      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: roles,
          current: req.user.role
        });
      }

      next();
    };
  }

  // Tenant isolation middleware
  static tenantIsolation(req, res, next) {
    if (!req.user) {
      return next();
    }

    // Super admin can access all tenants
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Add tenant filter to query params
    req.tenantId = req.user.tenant;
    next();
  }

  // Input validation and sanitization
  static validateInput(schema) {
    return (req, res, next) => {
      const { error, value } = schema.validate(req.body);
      
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        });
      }
      
      req.body = value;
      next();
    };
  }

  // Rate limiting for different endpoints
  static createRateLimit(windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests') {
    return rateLimit({
      windowMs,
      max,
      message: {
        success: false,
        message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  // Slow down repeated requests
  static createSlowDown(windowMs = 15 * 60 * 1000, delayAfter = 50, maxDelayMs = 20000) {
    return slowDown({
      windowMs,
      delayAfter,
      maxDelayMs,
      delayMs: (used) => (used - delayAfter) * 500,
    });
  }

  // Trading specific rate limits
  static tradingRateLimit = SecurityMiddleware.createRateLimit(
    60 * 1000, // 1 minute
    10, // 10 trades per minute
    'Trading rate limit exceeded'
  );

  // Authentication rate limit
  static authRateLimit = SecurityMiddleware.createRateLimit(
    15 * 60 * 1000, // 15 minutes
    5, // 5 attempts per 15 minutes
    'Too many authentication attempts'
  );

  // API rate limit
  static apiRateLimit = SecurityMiddleware.createRateLimit(
    15 * 60 * 1000, // 15 minutes
    100, // 100 requests per 15 minutes
    'API rate limit exceeded'
  );

  // IP-based request logging
  static requestLogger(req, res, next) {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log({
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userId: req.user?.id || 'anonymous',
        tenant: req.user?.tenant || 'none'
      });
    });
    
    next();
  }

  // CSRF protection for state-changing operations
  static csrfProtection(req, res, next) {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      const csrfToken = req.headers['x-csrf-token'];
      const expectedToken = req.session?.csrfToken;
      
      if (!csrfToken || csrfToken !== expectedToken) {
        return res.status(403).json({
          success: false,
          message: 'CSRF token mismatch',
          code: 'CSRF_ERROR'
        });
      }
    }
    
    next();
  }

  // Content-Type validation
  static validateContentType(expectedType = 'application/json') {
    return (req, res, next) => {
      if (req.method !== 'GET' && !req.is(expectedType)) {
        return res.status(415).json({
          success: false,
          message: `Content-Type must be ${expectedType}`,
          code: 'INVALID_CONTENT_TYPE'
        });
      }
      next();
    };
  }

  // Request size limitation
  static limitRequestSize(maxSize = '10mb') {
    return (req, res, next) => {
      const contentLength = parseInt(req.headers['content-length']);
      const maxBytes = this.parseSize(maxSize);
      
      if (contentLength > maxBytes) {
        return res.status(413).json({
          success: false,
          message: 'Request too large',
          code: 'REQUEST_TOO_LARGE',
          maxSize: maxSize
        });
      }
      
      next();
    };
  }

  static parseSize(size) {
    const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
    const match = size.toLowerCase().match(/(\d+)([a-z]+)/);
    if (!match) return parseInt(size);
    return parseInt(match[1]) * (units[match[2]] || 1);
  }

  // Security headers middleware
  static securityHeaders(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  }
}

module.exports = SecurityMiddleware;