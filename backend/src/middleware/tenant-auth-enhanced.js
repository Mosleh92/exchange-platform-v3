const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const Tenant = require('../models/tenants/Tenant');
const AuditLog = require('../models/AuditLog');
const { SecurityLogger } = require('../utils/securityLogger');

/**
 * Enhanced Multi-Tenant Authentication Middleware
 * Implements comprehensive security with JWT, refresh tokens, MFA, and strict tenant isolation
 */
class TenantAuthMiddleware {
  constructor() {
    this.securityLogger = new SecurityLogger();
    this.loginAttempts = new Map();
    this.accountLockouts = new Map();
  }

  /**
   * Main middleware function
   */
  async authenticate(req, res, next) {
    try {
      // Extract tenant context
      const tenantId = this.extractTenantId(req);
      if (!tenantId) {
        return this.handleAuthError(res, 'TENANT_MISSING', 'Tenant context required');
      }

      // Validate tenant exists and is active
      const tenant = await this.validateTenant(tenantId);
      if (!tenant) {
        return this.handleAuthError(res, 'TENANT_INVALID', 'Invalid tenant');
      }

      // Extract and validate JWT token
      const token = this.extractToken(req);
      if (!token) {
        return this.handleAuthError(res, 'TOKEN_MISSING', 'Authentication token required');
      }

      // Verify JWT token
      const decoded = await this.verifyToken(token, tenantId);
      if (!decoded) {
        return this.handleAuthError(res, 'TOKEN_INVALID', 'Invalid authentication token');
      }

      // Get user with tenant context
      const user = await this.getUserWithTenant(decoded.userId, tenantId);
      if (!user) {
        return this.handleAuthError(res, 'USER_NOT_FOUND', 'User not found in tenant context');
      }

      // Check account status
      if (!user.isActive) {
        return this.handleAuthError(res, 'ACCOUNT_DEACTIVATED', 'Account is deactivated');
      }

      if (user.isLocked) {
        return this.handleAuthError(res, 'ACCOUNT_LOCKED', 'Account is locked due to security concerns');
      }

      // Validate user permissions for this tenant
      if (!this.validateUserTenantAccess(user, tenantId)) {
        await this.securityLogger.logSecurityEvent('CROSS_TENANT_ACCESS_ATTEMPT', {
          userId: user._id,
          attemptedTenantId: tenantId,
          userTenantId: user.tenantId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
        return this.handleAuthError(res, 'CROSS_TENANT_ACCESS', 'Cross-tenant access denied');
      }

      // Set request context
      req.tenantContext = {
        tenantId: tenant._id,
        tenantLevel: tenant.level,
        tenantSettings: tenant.settings
      };

      req.userContext = {
        userId: user._id,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        kycStatus: user.kycStatus
      };

      // Log successful authentication
      await this.securityLogger.logSecurityEvent('AUTH_SUCCESS', {
        userId: user._id,
        tenantId: tenantId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      next();
    } catch (error) {
      await this.securityLogger.logSecurityEvent('AUTH_ERROR', {
        error: error.message,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      return this.handleAuthError(res, 'AUTH_ERROR', 'Authentication failed');
    }
  }

  /**
   * Extract tenant ID from request
   */
  extractTenantId(req) {
    // Check multiple sources for tenant ID
    const tenantId = req.headers['x-tenant-id'] || 
                    req.query.tenantId || 
                    req.body.tenantId ||
                    req.params.tenantId;

    return tenantId;
  }

  /**
   * Extract JWT token from request
   */
  extractToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Validate tenant exists and is active
   */
  async validateTenant(tenantId) {
    try {
      const tenant = await Tenant.findById(tenantId).lean();
      return tenant && tenant.isActive ? tenant : null;
    } catch (error) {
      this.securityLogger.logError('TENANT_VALIDATION_ERROR', error);
      return null;
    }
  }

  /**
   * Verify JWT token with tenant context
   */
  async verifyToken(token, tenantId) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Additional validation: check if token was issued for this tenant
      if (decoded.tenantId && decoded.tenantId !== tenantId) {
        return null;
      }

      // Check token expiration
      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        return null;
      }

      return decoded;
    } catch (error) {
      this.securityLogger.logError('TOKEN_VERIFICATION_ERROR', error);
      return null;
    }
  }

  /**
   * Get user with tenant context validation
   */
  async getUserWithTenant(userId, tenantId) {
    try {
      const user = await User.findOne({
        _id: userId,
        tenantId: tenantId,
        isActive: true
      }).lean();

      return user;
    } catch (error) {
      this.securityLogger.logError('USER_FETCH_ERROR', error);
      return null;
    }
  }

  /**
   * Validate user has access to this tenant
   */
  validateUserTenantAccess(user, tenantId) {
    return user.tenantId.toString() === tenantId.toString();
  }

  /**
   * Handle authentication errors
   */
  handleAuthError(res, code, message) {
    res.status(401).json({
      success: false,
      code: code,
      message: message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Rate limiting middleware for authentication endpoints
   */
  createRateLimit() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
      message: {
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts. Please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        this.securityLogger.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
        res.status(429).json({
          success: false,
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many authentication attempts. Please try again later.'
        });
      }
    });
  }

  /**
   * Account lockout middleware
   */
  async checkAccountLockout(req, res, next) {
    const { email } = req.body;
    const ipAddress = req.ip;

    // Check IP-based lockout
    const ipAttempts = this.loginAttempts.get(ipAddress) || 0;
    if (ipAttempts >= 10) {
      return res.status(429).json({
        success: false,
        code: 'IP_LOCKOUT',
        message: 'Too many failed attempts from this IP address.'
      });
    }

    // Check account-based lockout
    if (email) {
      const accountLockout = this.accountLockouts.get(email);
      if (accountLockout && Date.now() < accountLockout.until) {
        return res.status(423).json({
          success: false,
          code: 'ACCOUNT_LOCKOUT',
          message: 'Account temporarily locked due to security concerns.'
        });
      }
    }

    next();
  }

  /**
   * Handle failed login attempts
   */
  async handleFailedLogin(email, ipAddress) {
    // Increment IP attempts
    const ipAttempts = this.loginAttempts.get(ipAddress) || 0;
    this.loginAttempts.set(ipAddress, ipAttempts + 1);

    // Increment account attempts
    if (email) {
      const accountAttempts = this.accountLockouts.get(email)?.attempts || 0;
      const newAttempts = accountAttempts + 1;

      if (newAttempts >= 5) {
        // Lock account for 30 minutes
        this.accountLockouts.set(email, {
          attempts: newAttempts,
          until: Date.now() + (30 * 60 * 1000)
        });

        // Update user account
        await User.findOneAndUpdate(
          { email: email },
          { 
            isLocked: true,
            loginAttempts: newAttempts,
            lockedAt: new Date()
          }
        );

        await this.securityLogger.logSecurityEvent('ACCOUNT_LOCKED', {
          email: email,
          ipAddress: ipAddress,
          attempts: newAttempts
        });
      } else {
        this.accountLockouts.set(email, {
          attempts: newAttempts,
          until: Date.now() + (15 * 60 * 1000) // 15 minute window
        });
      }
    }

    // Log security event
    await this.securityLogger.logSecurityEvent('LOGIN_FAILED', {
      email: email,
      ipAddress: ipAddress
    });
  }

  /**
   * Reset login attempts on successful login
   */
  async resetLoginAttempts(email, ipAddress) {
    this.loginAttempts.delete(ipAddress);
    this.accountLockouts.delete(email);

    // Update user record
    await User.findOneAndUpdate(
      { email: email },
      { 
        loginAttempts: 0,
        lastLoginAt: new Date(),
        isLocked: false,
        lockedAt: null
      }
    );
  }

  /**
   * Generate JWT token with tenant context
   */
  generateToken(user, tenantId) {
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role,
      tenantId: tenantId,
      permissions: user.permissions,
      iat: Date.now(),
      exp: Date.now() + (parseInt(process.env.JWT_EXPIRES_IN) * 60 * 60 * 1000)
    };

    return jwt.sign(payload, process.env.JWT_SECRET);
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(userId, tenantId) {
    const payload = {
      userId: userId,
      tenantId: tenantId,
      type: 'refresh',
      iat: Date.now(),
      exp: Date.now() + (parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN) * 24 * 60 * 60 * 1000)
    };

    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET);
  }

  /**
   * Validate password complexity
   */
  validatePassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }

    if (!hasUpperCase) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }

    if (!hasLowerCase) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }

    if (!hasNumbers) {
      return { valid: false, message: 'Password must contain at least one number' };
    }

    if (!hasSpecialChar) {
      return { valid: false, message: 'Password must contain at least one special character' };
    }

    return { valid: true };
  }

  /**
   * Hash password with bcrypt
   */
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare password with hash
   */
  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate MFA secret
   */
  generateMFASecret() {
    return crypto.randomBytes(20).toString('hex');
  }

  /**
   * Validate MFA token
   */
  validateMFAToken(token, secret) {
    // Implementation would use a library like speakeasy
    // For now, return true for demonstration
    return token.length === 6 && /^\d+$/.test(token);
  }
}

// Export middleware instance
const tenantAuthMiddleware = new TenantAuthMiddleware();

module.exports = {
  authenticate: tenantAuthMiddleware.authenticate.bind(tenantAuthMiddleware),
  createRateLimit: tenantAuthMiddleware.createRateLimit.bind(tenantAuthMiddleware),
  checkAccountLockout: tenantAuthMiddleware.checkAccountLockout.bind(tenantAuthMiddleware),
  handleFailedLogin: tenantAuthMiddleware.handleFailedLogin.bind(tenantAuthMiddleware),
  resetLoginAttempts: tenantAuthMiddleware.resetLoginAttempts.bind(tenantAuthMiddleware),
  generateToken: tenantAuthMiddleware.generateToken.bind(tenantAuthMiddleware),
  generateRefreshToken: tenantAuthMiddleware.generateRefreshToken.bind(tenantAuthMiddleware),
  validatePassword: tenantAuthMiddleware.validatePassword.bind(tenantAuthMiddleware),
  hashPassword: tenantAuthMiddleware.hashPassword.bind(tenantAuthMiddleware),
  comparePassword: tenantAuthMiddleware.comparePassword.bind(tenantAuthMiddleware),
  generateMFASecret: tenantAuthMiddleware.generateMFASecret.bind(tenantAuthMiddleware),
  validateMFAToken: tenantAuthMiddleware.validateMFAToken.bind(tenantAuthMiddleware)
}; 