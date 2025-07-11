// middleware/enhancedAuth.js - Enhanced JWT Authentication with Refresh Token Support
const tokenManager = require('../services/tokenManager');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Enhanced authentication middleware with JWT refresh token support
 */
const enhancedAuth = async (req, res, next) => {
  try {
    // Try to get token from Authorization header first
    let token = req.header('Authorization')?.replace('Bearer ', '');
    
    // Fallback to cookies for refresh token scenarios
    if (!token) {
      token = req.cookies?.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'ACCESS_TOKEN_REQUIRED',
        message: 'Access token is required'
      });
    }

    // Verify access token
    const decoded = await tokenManager.verifyAccessToken(token);
    
    // Get user from database
    const user = await User.findById(decoded.userId)
      .populate('tenantId')
      .select('-password -twoFactorSecret');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    // Check user status
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'ACCOUNT_DEACTIVATED',
        message: 'Account is deactivated'
      });
    }

    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      return res.status(401).json({
        success: false,
        error: 'ACCOUNT_LOCKED',
        message: 'Account is temporarily locked'
      });
    }

    // Check tenant status for non-super admins
    if (user.role !== 'super_admin' && user.tenantId && !user.tenantId.isActive) {
      return res.status(401).json({
        success: false,
        error: 'TENANT_INACTIVE',
        message: 'Tenant is inactive'
      });
    }

    // Check 2FA requirement for admin users
    if (['super_admin', 'tenant_admin'].includes(user.role) && 
        !user.twoFactorEnabled && 
        process.env.ENFORCE_2FA_FOR_ADMINS === 'true') {
      return res.status(403).json({
        success: false,
        error: 'TWO_FACTOR_REQUIRED',
        message: '2FA is required for admin users'
      });
    }

    // Attach user to request
    req.user = user;
    req.tokenInfo = {
      token,
      decoded,
      issuedAt: new Date(decoded.iat * 1000),
      expiresAt: new Date(decoded.exp * 1000)
    };

    next();
  } catch (error) {
    logger.error('Authentication failed:', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Handle specific token errors
    if (error.message.includes('Token is blacklisted')) {
      return res.status(401).json({
        success: false,
        error: 'TOKEN_BLACKLISTED',
        message: 'Token has been revoked'
      });
    }

    if (error.message.includes('jwt expired')) {
      return res.status(401).json({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'Access token has expired',
        shouldRefresh: true
      });
    }

    if (error.message.includes('jwt malformed')) {
      return res.status(401).json({
        success: false,
        error: 'TOKEN_MALFORMED',
        message: 'Invalid token format'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'AUTHENTICATION_FAILED',
      message: 'Authentication failed'
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies?.accessToken;
    
    if (token) {
      const decoded = await tokenManager.verifyAccessToken(token);
      const user = await User.findById(decoded.userId)
        .populate('tenantId')
        .select('-password -twoFactorSecret');
      
      if (user && user.isActive) {
        req.user = user;
        req.tokenInfo = {
          token,
          decoded,
          issuedAt: new Date(decoded.iat * 1000),
          expiresAt: new Date(decoded.exp * 1000)
        };
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

/**
 * Role-based authorization middleware
 * @param {Array} allowedRoles - Array of allowed roles
 */
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required'
      });
    }

    if (allowedRoles.length === 0) {
      return next(); // No specific roles required
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Authorization failed', {
        userId: req.user._id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        resource: req.originalUrl
      });

      return res.status(403).json({
        success: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'Insufficient permissions to access this resource'
      });
    }

    next();
  };
};

/**
 * Tenant isolation middleware - ensures user can only access their tenant's data
 */
const tenantIsolation = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'AUTHENTICATION_REQUIRED',
      message: 'Authentication required'
    });
  }

  // Super admins can access all tenants
  if (req.user.role === 'super_admin') {
    return next();
  }

  const requestedTenantId = req.headers['x-tenant-id'] || req.params.tenantId || req.body.tenantId;
  
  if (requestedTenantId && requestedTenantId !== req.user.tenantId?.toString()) {
    logger.warn('Tenant isolation violation', {
      userId: req.user._id,
      userTenant: req.user.tenantId,
      requestedTenant: requestedTenantId,
      resource: req.originalUrl
    });

    return res.status(403).json({
      success: false,
      error: 'TENANT_ACCESS_DENIED',
      message: 'Access denied to requested tenant'
    });
  }

  next();
};

/**
 * IP whitelist middleware
 */
const ipWhitelist = (req, res, next) => {
  if (!req.user || !req.user.ipWhitelist || req.user.ipWhitelist.length === 0) {
    return next(); // No IP restrictions
  }

  const clientIP = req.ip || req.connection.remoteAddress;
  const allowedIPs = req.user.ipWhitelist.map(item => item.ip);

  if (!allowedIPs.includes(clientIP)) {
    logger.warn('IP whitelist violation', {
      userId: req.user._id,
      clientIP,
      allowedIPs,
      resource: req.originalUrl
    });

    return res.status(403).json({
      success: false,
      error: 'IP_NOT_ALLOWED',
      message: 'Access denied from this IP address'
    });
  }

  next();
};

module.exports = {
  enhancedAuth,
  optionalAuth,
  authorize,
  tenantIsolation,
  ipWhitelist
};