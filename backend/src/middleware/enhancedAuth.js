// backend/src/middleware/enhancedAuth.js
const authTokenService = require('../services/authTokenService');
const User = require('../models/User');
const logger = require('../utils/logger');
const rateLimit = require('express-rate-limit');

/**
 * Enhanced Authentication Middleware
 * Provides secure JWT validation, session management, and rate limiting
 */
class EnhancedAuthMiddleware {
  constructor() {
    this.initializeRateLimiters();
  }

  /**
   * Initialize rate limiters for authentication endpoints
   */
  initializeRateLimiters() {
    // Login rate limiter
    this.loginLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
      message: {
        error: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many login attempts. Please try again later.',
        retryAfter: 15 * 60
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return `login:${req.ip}:${req.body.email || 'unknown'}`;
      },
      handler: (req, res) => {
        logger.warn('Login rate limit exceeded', {
          ip: req.ip,
          email: req.body.email,
          userAgent: req.get('User-Agent')
        });
        res.status(429).json({
          error: 'AUTH_RATE_LIMIT_EXCEEDED',
          message: 'Too many login attempts. Please try again later.',
          retryAfter: 15 * 60
        });
      }
    });

    // Password reset rate limiter
    this.passwordResetLimiter = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // 3 attempts per hour
      message: {
        error: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
        message: 'Too many password reset attempts. Please try again later.',
        retryAfter: 60 * 60
      },
      keyGenerator: (req) => {
        return `password_reset:${req.ip}:${req.body.email || 'unknown'}`;
      }
    });

    // Token refresh rate limiter
    this.refreshLimiter = rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 10, // 10 refresh attempts per 5 minutes
      message: {
        error: 'REFRESH_RATE_LIMIT_EXCEEDED',
        message: 'Too many token refresh attempts.',
        retryAfter: 5 * 60
      },
      keyGenerator: (req) => {
        return `refresh:${req.ip}`;
      }
    });
  }

  /**
   * Enhanced authentication middleware
   */
  authenticate = async (req, res, next) => {
    try {
      // Extract token from Authorization header or cookies
      let token = this.extractToken(req);
      
      if (!token) {
        return res.status(401).json({
          error: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication token is required'
        });
      }

      // Verify access token
      const decoded = await authTokenService.verifyAccessToken(token);
      
      // Get user from database with fresh data
      const user = await User.findById(decoded.id)
        .populate('tenantId')
        .select('-password -__v');

      if (!user) {
        return res.status(401).json({
          error: 'USER_NOT_FOUND',
          message: 'User account not found'
        });
      }

      // Check user account status
      if (!user.isActive) {
        return res.status(401).json({
          error: 'ACCOUNT_DEACTIVATED',
          message: 'User account is deactivated'
        });
      }

      if (user.isLocked) {
        return res.status(401).json({
          error: 'ACCOUNT_LOCKED',
          message: 'User account is locked'
        });
      }

      // Check tenant status for non-super admins
      if (user.role !== 'super_admin' && user.tenantId && !user.tenantId.isActive) {
        return res.status(401).json({
          error: 'TENANT_INACTIVE',
          message: 'Tenant account is inactive'
        });
      }

      // Add user and token info to request
      req.user = user;
      req.tokenInfo = {
        sessionId: decoded.sessionId,
        tokenId: decoded.tokenId,
        type: decoded.type
      };

      // Log successful authentication
      this.logAuthEvent('AUTH_SUCCESS', req, {
        userId: user.id,
        tenantId: user.tenantId?.id
      });

      next();
    } catch (error) {
      this.logAuthEvent('AUTH_FAILURE', req, {
        error: error.message,
        stack: error.stack
      });

      if (error.message === 'Access token expired') {
        return res.status(401).json({
          error: 'TOKEN_EXPIRED',
          message: 'Access token has expired',
          requiresRefresh: true
        });
      }

      if (error.message === 'Token has been revoked') {
        return res.status(401).json({
          error: 'TOKEN_REVOKED',
          message: 'Token has been revoked',
          requiresLogin: true
        });
      }

      return res.status(401).json({
        error: 'AUTHENTICATION_FAILED',
        message: 'Authentication failed'
      });
    }
  };

  /**
   * Optional authentication middleware (doesn't fail if no token)
   */
  optionalAuth = async (req, res, next) => {
    try {
      const token = this.extractToken(req);
      
      if (token) {
        const decoded = await authTokenService.verifyAccessToken(token);
        const user = await User.findById(decoded.id)
          .populate('tenantId')
          .select('-password -__v');

        if (user && user.isActive && !user.isLocked) {
          req.user = user;
          req.tokenInfo = {
            sessionId: decoded.sessionId,
            tokenId: decoded.tokenId,
            type: decoded.type
          };
        }
      }
    } catch (error) {
      // Log but don't fail for optional auth
      logger.debug('Optional auth failed:', error.message);
    }
    
    next();
  };

  /**
   * Role-based authorization middleware
   */
  authorize = (requiredRoles = []) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required'
        });
      }

      if (requiredRoles.length === 0) {
        return next();
      }

      // Convert to array if single role provided
      const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

      if (!roles.includes(req.user.role)) {
        this.logAuthEvent('AUTHORIZATION_FAILURE', req, {
          requiredRoles: roles,
          userRole: req.user.role
        });

        return res.status(403).json({
          error: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions for this action',
          requiredRoles: roles
        });
      }

      next();
    };
  };

  /**
   * Tenant-based authorization middleware
   */
  requireTenant = async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required'
        });
      }

      // Super admins can access any tenant
      if (req.user.role === 'super_admin') {
        return next();
      }

      // Get tenant from header or user
      const tenantId = req.headers['x-tenant-id'] || req.user.tenantId?.id;
      
      if (!tenantId) {
        return res.status(400).json({
          error: 'TENANT_REQUIRED',
          message: 'Tenant ID is required'
        });
      }

      // Verify user belongs to this tenant
      if (req.user.tenantId?.id !== tenantId) {
        this.logAuthEvent('TENANT_ACCESS_VIOLATION', req, {
          requestedTenant: tenantId,
          userTenant: req.user.tenantId?.id
        });

        return res.status(403).json({
          error: 'TENANT_ACCESS_DENIED',
          message: 'Access denied to this tenant'
        });
      }

      req.tenantId = tenantId;
      next();
    } catch (error) {
      logger.error('Tenant authorization error:', error);
      res.status(500).json({
        error: 'AUTHORIZATION_ERROR',
        message: 'Authorization check failed'
      });
    }
  };

  /**
   * Multi-factor authentication requirement
   */
  requireMFA = (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required'
      });
    }

    // Check if user has MFA enabled and verified
    if (req.user.twoFactorEnabled && !req.user.twoFactorVerified) {
      return res.status(403).json({
        error: 'MFA_REQUIRED',
        message: 'Multi-factor authentication is required',
        requiresMFA: true
      });
    }

    next();
  };

  /**
   * Session validation middleware
   */
  validateSession = async (req, res, next) => {
    try {
      if (!req.tokenInfo?.sessionId) {
        return next();
      }

      // Check session in Redis
      const sessions = await authTokenService.getUserSessions(req.user.id);
      const currentSession = sessions.find(s => s.sessionId === req.tokenInfo.sessionId);

      if (!currentSession) {
        return res.status(401).json({
          error: 'SESSION_INVALID',
          message: 'Session is invalid or expired',
          requiresLogin: true
        });
      }

      // Check for suspicious activity
      if (currentSession.ipAddress && currentSession.ipAddress !== req.ip) {
        this.logAuthEvent('SESSION_IP_MISMATCH', req, {
          sessionIp: currentSession.ipAddress,
          requestIp: req.ip
        });
      }

      next();
    } catch (error) {
      logger.error('Session validation error:', error);
      next(); // Continue with request
    }
  };

  /**
   * Extract token from request
   */
  extractToken(req) {
    // Try Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try cookies
    if (req.cookies && req.cookies.accessToken) {
      return req.cookies.accessToken;
    }

    // Try query parameter (not recommended for production)
    if (req.query.token && process.env.NODE_ENV !== 'production') {
      return req.query.token;
    }

    return null;
  }

  /**
   * Log authentication events
   */
  logAuthEvent(eventType, req, details = {}) {
    const logData = {
      eventType,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      requestId: req.id,
      ...details
    };

    if (eventType.includes('FAILURE') || eventType.includes('VIOLATION')) {
      logger.warn('Authentication event', logData);
    } else {
      logger.info('Authentication event', logData);
    }
  }

  /**
   * Get rate limiters
   */
  getRateLimiters() {
    return {
      login: this.loginLimiter,
      passwordReset: this.passwordResetLimiter,
      refresh: this.refreshLimiter
    };
  }
}

module.exports = new EnhancedAuthMiddleware();