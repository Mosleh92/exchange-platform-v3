// src/middleware/auth.js
const AuthService = require('../services/AuthService');
const { User, Tenant } = require('../models/postgresql');

/**
 * Enterprise Authentication Middleware
 * Features: JWT verification, tenant isolation, role-based access control
 */

/**
 * Verify JWT token and load user
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Authentication token is required'
      });
    }
    
    // Verify token
    const decoded = AuthService.verifyToken(token);
    
    // Load user with tenant information
    const user = await User.findByPk(decoded.id, {
      include: [{ 
        model: Tenant, 
        as: 'tenant',
        attributes: ['id', 'name', 'subscriptionPlan', 'status', 'settings']
      }]
    });
    
    if (!user) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'User not found'
      });
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({
        error: 'Access denied',
        message: 'User account is inactive'
      });
    }
    
    // Check if tenant is active
    if (!user.tenant || user.tenant.status !== 'active') {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Organization is inactive'
      });
    }
    
    // Check if user is locked
    if (user.isLocked()) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Account is temporarily locked'
      });
    }
    
    // Add user and tenant to request
    req.user = user;
    req.tenant = user.tenant;
    req.tenantId = user.tenantId;
    
    // Update last activity
    user.update({ lastActivity: new Date() }).catch(console.error);
    
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Access denied',
      message: error.message || 'Invalid token'
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return next(); // Continue without authentication
  }
  
  try {
    const decoded = AuthService.verifyToken(token);
    const user = await User.findByPk(decoded.id, {
      include: [{ 
        model: Tenant, 
        as: 'tenant',
        attributes: ['id', 'name', 'subscriptionPlan', 'status']
      }]
    });
    
    if (user && user.status === 'active' && user.tenant?.status === 'active') {
      req.user = user;
      req.tenant = user.tenant;
      req.tenantId = user.tenantId;
    }
  } catch (error) {
    // Ignore errors for optional auth
  }
  
  next();
};

/**
 * Require specific user role
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        required: roles,
        current: req.user.role
      });
    }
    
    next();
  };
};

/**
 * Require specific permission
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required'
      });
    }
    
    if (!req.user.hasPermission(permission)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Permission '${permission}' required`,
        userRole: req.user.role
      });
    }
    
    next();
  };
};

/**
 * Ensure tenant isolation - user can only access their tenant's data
 */
const ensureTenantIsolation = (req, res, next) => {
  const tenantIdFromUrl = req.params.tenantId;
  const tenantIdFromBody = req.body.tenantId;
  const tenantIdFromQuery = req.query.tenantId;
  const tenantIdFromHeader = req.headers['x-tenant-id'];
  
  // Get tenant ID from various sources
  const requestedTenantId = tenantIdFromUrl || tenantIdFromBody || 
                            tenantIdFromQuery || tenantIdFromHeader;
  
  // Super admin can access any tenant
  if (req.user?.role === 'super_admin') {
    return next();
  }
  
  // If no tenant ID in request, use user's tenant
  if (!requestedTenantId) {
    req.tenantId = req.user.tenantId;
    return next();
  }
  
  // Ensure user can only access their tenant's data
  if (requestedTenantId !== req.user.tenantId) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access to this tenant is not allowed'
    });
  }
  
  next();
};

/**
 * Require 2FA verification for sensitive operations
 */
const requireTwoFactor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Access denied',
      message: 'Authentication required'
    });
  }
  
  // Check if 2FA is enabled and required
  if (req.user.twoFactorEnabled || req.tenant?.settings?.security?.requireTwoFactor) {
    const twoFactorToken = req.headers['x-2fa-token'];
    
    if (!twoFactorToken) {
      return res.status(403).json({
        error: 'Two-factor authentication required',
        message: 'Please provide 2FA token in X-2FA-Token header'
      });
    }
    
    // Verify 2FA token
    const isValid = req.user.verifyTwoFactorToken(twoFactorToken);
    if (!isValid) {
      return res.status(403).json({
        error: 'Invalid 2FA token',
        message: 'Two-factor authentication token is invalid'
      });
    }
  }
  
  next();
};

/**
 * Check if user owns the resource
 */
const requireOwnership = (userIdField = 'userId') => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'Authentication required'
      });
    }
    
    // Super admin and tenant admin can access any resource in their tenant
    if (['super_admin', 'tenant_admin'].includes(req.user.role)) {
      return next();
    }
    
    const resourceUserId = req.params[userIdField] || req.body[userIdField];
    
    if (resourceUserId && resourceUserId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only access your own resources'
      });
    }
    
    next();
  };
};

// Legacy middleware for compatibility
const authMiddleware = authenticateToken;
const roleMiddleware = requireRole;

// Tenant middleware for backwards compatibility
const tenantMiddleware = async (req, res, next) => {
  try {
    const subdomain = req.headers['x-tenant-subdomain'] || req.query.tenant;
    
    if (!subdomain) {
      return res.status(400).json({ message: 'Tenant subdomain required' });
    }

    const tenant = await Tenant.findOne({ 
      where: { domain: subdomain, status: 'active' }
    });
    
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    req.tenant = tenant;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  // New enterprise middleware
  authenticateToken,
  optionalAuth,
  requireRole,
  requirePermission,
  ensureTenantIsolation,
  requireTwoFactor,
  requireOwnership,
  
  // Legacy middleware for compatibility
  authMiddleware,
  roleMiddleware,
  tenantMiddleware,
  
  // Legacy exports
  authorize: requireRole
};
