const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const TenantHierarchyService = require('../core/multi-tenancy/TenantHierarchyService');
const logger = require('../utils/logger');

/**
 * Enhanced Authentication Middleware
 * Comprehensive security with multi-tenant support
 */
class EnhancedAuthMiddleware {
  constructor() {
    this.rateLimiters = new Map();
    this.failedAttempts = new Map();
    this.lockedAccounts = new Map();
  }

  /**
   * Main authentication middleware
   */
  authenticate = async (req, res, next) => {
    try {
      // Extract token from multiple sources
      const token = this.extractToken(req);
      
      if (!token) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Verify JWT token
      const decoded = await this.verifyToken(token);
      if (!decoded) {
        return res.status(401).json({
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN'
        });
      }

      // Validate tenant access
      const tenantValidation = await this.validateTenantAccess(decoded, req);
      if (!tenantValidation.hasAccess) {
        return res.status(403).json({
          error: 'Tenant access denied',
          code: 'TENANT_ACCESS_DENIED',
          details: tenantValidation.reason
        });
      }

      // Check account lockout
      if (this.isAccountLocked(decoded.userId)) {
        return res.status(423).json({
          error: 'Account temporarily locked',
          code: 'ACCOUNT_LOCKED',
          unlockTime: this.getLockoutTime(decoded.userId)
        });
      }

      // Attach user and tenant info to request
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        tenantId: decoded.tenantId,
        branchId: decoded.branchId,
        permissions: decoded.permissions || []
      };

      req.tenant = {
        id: decoded.tenantId,
        level: decoded.tenantLevel,
        accessLevel: tenantValidation.level
      };

      // Log successful authentication
      logger.info('User authenticated successfully', {
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      next();
    } catch (error) {
      logger.error('Authentication error:', error);
      return res.status(500).json({
        error: 'Authentication failed',
        code: 'AUTH_ERROR'
      });
    }
  };

  /**
   * Extract token from multiple sources
   */
  extractToken(req) {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check x-access-token header
    if (req.headers['x-access-token']) {
      return req.headers['x-access-token'];
    }

    // Check cookies
    if (req.cookies && req.cookies.token) {
      return req.cookies.token;
    }

    // Check query parameter (for specific endpoints)
    if (req.query.token && req.path.startsWith('/api/v1/websocket')) {
      return req.query.token;
    }

    return null;
  }

  /**
   * Verify JWT token with enhanced validation
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: 'exchange-platform',
        audience: 'exchange-users'
      });

      // Validate required claims
      const requiredClaims = ['userId', 'email', 'role', 'tenantId'];
      for (const claim of requiredClaims) {
        if (!decoded[claim]) {
          throw new Error(`Missing required claim: ${claim}`);
        }
      }

      // Check token expiration
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        throw new Error('Token expired');
      }

      // Check token issued time
      if (decoded.iat && decoded.iat > now) {
        throw new Error('Token issued in the future');
      }

      return decoded;
    } catch (error) {
      logger.warn('Token verification failed:', error.message);
      return null;
    }
  }

  /**
   * Validate tenant access with hierarchy
   */
  async validateTenantAccess(decoded, req) {
    try {
      // Get target tenant from request
      const targetTenantId = req.headers['x-tenant-id'] || 
                           req.params.tenantId || 
                           decoded.tenantId;

      // Validate user access to target tenant
      const accessValidation = await TenantHierarchyService.validateUserTenantAccess(
        decoded.userId,
        targetTenantId
      );

      return accessValidation;
    } catch (error) {
      logger.error('Tenant access validation error:', error);
      return { hasAccess: false, reason: 'Validation error' };
    }
  }

  /**
   * Role-based authorization middleware
   */
  authorize = (requiredRoles = [], requiredPermissions = []) => {
    return (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
          });
        }

        // Check role requirements
        if (requiredRoles.length > 0) {
          const hasRequiredRole = requiredRoles.some(role => 
            req.user.role === role || req.user.role === 'super_admin'
          );

          if (!hasRequiredRole) {
            logger.warn('Role access denied', {
              userId: req.user.id,
              userRole: req.user.role,
              requiredRoles,
              path: req.path
            });

            return res.status(403).json({
              error: 'Insufficient role permissions',
              code: 'INSUFFICIENT_ROLE',
              required: requiredRoles,
              current: req.user.role
            });
          }
        }

        // Check permission requirements
        if (requiredPermissions.length > 0) {
          const userPermissions = req.user.permissions || [];
          const hasRequiredPermissions = requiredPermissions.every(permission =>
            userPermissions.includes(permission)
          );

          if (!hasRequiredPermissions) {
            logger.warn('Permission access denied', {
              userId: req.user.id,
              userPermissions,
              requiredPermissions,
              path: req.path
            });

            return res.status(403).json({
              error: 'Insufficient permissions',
              code: 'INSUFFICIENT_PERMISSIONS',
              required: requiredPermissions,
              current: userPermissions
            });
          }
        }

        next();
      } catch (error) {
        logger.error('Authorization error:', error);
        return res.status(500).json({
          error: 'Authorization failed',
          code: 'AUTH_ERROR'
        });
      }
    };
  };

  /**
   * Rate limiting middleware
   */
  rateLimit = (windowMs = 15 * 60 * 1000, max = 100, keyGenerator = null) => {
    const limiter = rateLimit({
      windowMs,
      max,
      keyGenerator: keyGenerator || ((req) => {
        return req.user ? req.user.id : req.ip;
      }),
      handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
          userId: req.user?.id,
          ip: req.ip,
          path: req.path
        });

        res.status(429).json({
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      },
      skip: (req) => {
        // Skip rate limiting for certain paths
        const skipPaths = ['/api/v1/health', '/api/v1/metrics'];
        return skipPaths.some(path => req.path.startsWith(path));
      }
    });

    return limiter;
  };

  /**
   * Account lockout management
   */
  recordFailedAttempt(userId) {
    const attempts = this.failedAttempts.get(userId) || 0;
    const newAttempts = attempts + 1;
    
    this.failedAttempts.set(userId, newAttempts);

    // Lock account after 5 failed attempts
    if (newAttempts >= 5) {
      const lockoutTime = Date.now() + (15 * 60 * 1000); // 15 minutes
      this.lockedAccounts.set(userId, lockoutTime);
      
      logger.warn('Account locked due to failed attempts', {
        userId,
        attempts: newAttempts,
        lockoutTime
      });
    }

    return newAttempts;
  }

  /**
   * Check if account is locked
   */
  isAccountLocked(userId) {
    const lockoutTime = this.lockedAccounts.get(userId);
    if (!lockoutTime) return false;

    if (Date.now() > lockoutTime) {
      // Unlock account
      this.lockedAccounts.delete(userId);
      this.failedAttempts.delete(userId);
      return false;
    }

    return true;
  }

  /**
   * Get lockout time remaining
   */
  getLockoutTime(userId) {
    const lockoutTime = this.lockedAccounts.get(userId);
    if (!lockoutTime) return 0;

    const remaining = Math.max(0, lockoutTime - Date.now());
    return Math.ceil(remaining / 1000); // Return seconds
  }

  /**
   * Reset failed attempts
   */
  resetFailedAttempts(userId) {
    this.failedAttempts.delete(userId);
    this.lockedAccounts.delete(userId);
  }

  /**
   * CSRF protection middleware
   */
  csrfProtection = (req, res, next) => {
    // Skip CSRF for API endpoints that don't modify data
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next();
    }

    const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
    const sessionToken = req.session?.csrfToken;

    if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
      logger.warn('CSRF token validation failed', {
        userId: req.user?.id,
        ip: req.ip,
        path: req.path
      });

      return res.status(403).json({
        error: 'CSRF token validation failed',
        code: 'CSRF_ERROR'
      });
    }

    next();
  };

  /**
   * Input validation middleware
   */
  validateInput = (schema) => {
    return (req, res, next) => {
      try {
        const { error } = schema.validate(req.body);
        if (error) {
          logger.warn('Input validation failed', {
            userId: req.user?.id,
            path: req.path,
            errors: error.details
          });

          return res.status(400).json({
            error: 'Invalid input data',
            code: 'VALIDATION_ERROR',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          });
        }
        next();
      } catch (error) {
        logger.error('Input validation error:', error);
        return res.status(500).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR'
        });
      }
    };
  };

  /**
   * Audit logging middleware
   */
  auditLog = (action) => {
    return (req, res, next) => {
      const originalSend = res.send;
      
      res.send = function(data) {
        // Log the action after response is sent
        logger.info('Audit log', {
          userId: req.user?.id,
          tenantId: req.user?.tenantId,
          action,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        });

        originalSend.call(this, data);
      };

      next();
    };
  };
}

module.exports = new EnhancedAuthMiddleware(); 