const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Enhanced Authentication Middleware
 * Comprehensive security with multiple validation layers
 */
const enhancedAuthMiddleware = async (req, res, next) => {
  try {
    // Extract token from multiple sources
    const token = req.headers.authorization?.split(' ')[1] ||
                  req.headers['x-access-token'] ||
                  req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({
        error: 'Authentication token required',
        code: 'TOKEN_MISSING'
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({
        error: 'Invalid token',
        code: 'TOKEN_INVALID'
      });
    }

    // Fetch user with comprehensive validation
    const user = await User.findById(decoded.id)
      .populate('tenantId')
      .select('-password')
      .lean();

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Comprehensive user status validation
    if (!user.isActive) {
      return res.status(401).json({
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    if (user.isLocked) {
      return res.status(401).json({
        error: 'Account is locked',
        code: 'ACCOUNT_LOCKED'
      });
    }

    if (user.loginAttempts >= 5) {
      return res.status(401).json({
        error: 'Account temporarily locked due to multiple failed attempts',
        code: 'ACCOUNT_TEMP_LOCKED'
      });
    }

    // Check session validity
    if (user.lastPasswordChange && decoded.iat < user.lastPasswordChange.getTime() / 1000) {
      return res.status(401).json({
        error: 'Session expired due to password change',
        code: 'SESSION_EXPIRED'
      });
    }

    // Set user context with security info
    req.user = {
      ...user,
      sessionId: decoded.sessionId,
      permissions: user.permissions || [],
      securityLevel: user.securityLevel || 'standard'
    };

    // Log successful authentication
    logger.info(`User authenticated: ${user.email} (${user._id}) from IP: ${req.ip}`);

    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Role-Based Access Control (RBAC)
 */
const roleMiddleware = (requiredRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (requiredRoles.length > 0 && !requiredRoles.includes(req.user.role)) {
      logger.warn(`Access denied: User ${req.user.email} attempted to access ${req.path}`);
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

/**
 * Permission-Based Access Control
 */
const permissionMiddleware = (requiredPermissions = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userPermissions = req.user.permissions || [];
    const hasAllPermissions = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      logger.warn(`Permission denied: User ${req.user.email} missing permissions: ${requiredPermissions.join(', ')}`);
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

/**
 * Rate Limiting for Security
 */
const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }
  });
};

/**
 * Input Validation Middleware
 */
const validateInput = (schema) => {
  return (req, res, next) => {
    try {
      const { error } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(detail => detail.message),
          code: 'VALIDATION_ERROR'
        });
      }
      next();
    } catch (error) {
      logger.error('Input validation error:', error);
      return res.status(500).json({
        error: 'Validation error',
        code: 'VALIDATION_ERROR'
      });
    }
  };
};

/**
 * Security Headers Middleware
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * CSRF Protection
 */
const csrfProtection = (req, res, next) => {
  const csrfToken = req.headers['x-csrf-token'];
  const sessionToken = req.session?.csrfToken;

  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
      return res.status(403).json({
        error: 'CSRF token validation failed',
        code: 'CSRF_ERROR'
      });
    }
  }

  next();
};

module.exports = {
  enhancedAuthMiddleware,
  roleMiddleware,
  permissionMiddleware,
  createRateLimiter,
  validateInput,
  securityHeaders,
  csrfProtection
}; 