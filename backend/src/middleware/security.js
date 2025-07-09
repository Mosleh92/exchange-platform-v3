// backend/src/middleware/security.js
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const { validationResult } = require('express-validator');
const AuditLog = require('../models/AuditLog');

// ===== TENANT ISOLATION MIDDLEWARE =====
const tenantIsolationMiddleware = async (req, res, next) => {
  try {
    // Skip for public routes
    if (req.path.includes('/auth/') || req.path.includes('/public/')) {
      return next();
    }

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Enhanced user context
    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      branchId: decoded.branchId,
      role: decoded.role,
      permissions: decoded.permissions || [],
      email: decoded.email
    };

    // Base query filter for tenant isolation
    req.tenantFilter = { tenantId: req.user.tenantId };
    
    // Add branch filter for staff roles
    if (['STAFF', 'BRANCH_MANAGER'].includes(req.user.role)) {
      req.branchFilter = { 
        tenantId: req.user.tenantId,
        branchId: req.user.branchId 
      };
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ===== ROLE-BASED ACCESS CONTROL =====
const rbacMiddleware = (requiredRole, requiredPermissions = []) => {
  return async (req, res, next) => {
    try {
      const { role, permissions } = req.user;

      // Role hierarchy
      const roleHierarchy = {
        'SUPER_ADMIN': 5,
        'TENANT_ADMIN': 4,
        'BRANCH_MANAGER': 3,
        'STAFF': 2,
        'CUSTOMER': 1
      };

      // Check role level
      if (roleHierarchy[role] < roleHierarchy[requiredRole]) {
        await logSecurityEvent(req, 'RBAC_VIOLATION', `Insufficient role: ${role} < ${requiredRole}`);
        return res.status(403).json({ error: 'Insufficient role privileges' });
      }

      // Check specific permissions
      if (requiredPermissions.length > 0) {
        const hasPermission = requiredPermissions.every(perm => 
          permissions.includes(perm)
        );
        
        if (!hasPermission) {
          await logSecurityEvent(req, 'PERMISSION_VIOLATION', `Missing permissions: ${requiredPermissions.join(', ')}`);
          return res.status(403).json({ error: 'Missing required permissions' });
        }
      }

      next();
    } catch (error) {
      console.error('RBAC Middleware Error:', error);
      return res.status(500).json({ error: 'Authorization error' });
    }
  };
};

// ===== AUDIT LOGGING MIDDLEWARE =====
const auditLoggingMiddleware = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log sensitive operations
    if (req.method !== 'GET' && req.user) {
      logAuditEvent(req, res.statusCode, data);
    }
    
    return originalSend.call(this, data);
  };

  next();
};

// ===== RATE LIMITING =====
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      return `${req.user?.tenantId || 'anonymous'}-${req.ip}`;
    },
    handler: (req, res) => {
      logSecurityEvent(req, 'RATE_LIMIT_EXCEEDED', `IP: ${req.ip}`);
      res.status(429).json({ error: message });
    }
  });
};

// Rate limit configurations
const generalRateLimit = createRateLimit(15 * 60 * 1000, 100, 'Too many requests');
const authRateLimit = createRateLimit(15 * 60 * 1000, 5, 'Too many authentication attempts');
const balanceRateLimit = createRateLimit(60 * 1000, 10, 'Too many balance operations');

// ===== INPUT VALIDATION MIDDLEWARE =====
const validateInput = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// ===== SECURITY SANITIZATION =====
const sanitizeInput = (req, res, next) => {
  // Remove NoSQL injection attempts
  mongoSanitize()(req, res, () => {
    // Remove XSS attempts
    xss()(req, res, next);
  });
};

// ===== SECURITY HEADERS =====
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: ["no-referrer"] },
  xssFilter: true,
});

// ===== HELPER FUNCTIONS =====
const logSecurityEvent = async (req, eventType, details) => {
  try {
    await AuditLog.create({
      userId: req.user?.userId,
      tenantId: req.user?.tenantId,
      branchId: req.user?.branchId,
      role: req.user?.role,
      eventType,
      details,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.originalUrl,
      method: req.method,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Audit logging error:', error);
  }
};

const logAuditEvent = async (req, statusCode, responseData) => {
  try {
    // Only log sensitive operations
    const sensitiveEndpoints = [
      '/balance',
      '/transaction',
      '/exchange-rate',
      '/user',
      '/admin',
      '/transfer'
    ];

    const isSensitive = sensitiveEndpoints.some(endpoint => 
      req.originalUrl.includes(endpoint)
    );

    if (isSensitive) {
      await AuditLog.create({
        userId: req.user.userId,
        tenantId: req.user.tenantId,
        branchId: req.user.branchId,
        role: req.user.role,
        eventType: 'API_ACCESS',
        details: {
          endpoint: req.originalUrl,
          method: req.method,
          statusCode,
          requestBody: req.body,
          queryParams: req.query
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date()
      });
    }
  } catch (error) {
    console.error('Audit logging error:', error);
  }
};

module.exports = {
  tenantIsolationMiddleware,
  rbacMiddleware,
  auditLoggingMiddleware,
  generalRateLimit,
  authRateLimit,
  balanceRateLimit,
  validateInput,
  sanitizeInput,
  securityHeaders,
  logSecurityEvent,
  logAuditEvent
};
