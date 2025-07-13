const logger = require('../utils/logger');
const EnhancedAuditService = require('../services/enhancedAuditService');

/**
 * Enhanced Error Handler Middleware
 * Handles all application errors with proper tenant isolation and logging
 */
class EnhancedErrorHandler {
  constructor() {
    this.auditService = EnhancedAuditService;
  }

  /**
   * Main error handler middleware
   */
  handleError(err, req, res, next) {
    // Extract request information
    const { method, url, headers, body, user, tenantId } = req;
    const clientIP = this.getClientIP(req);
    const userAgent = headers['user-agent'];

    // Log error with context
    this.logError(err, {
      method,
      url,
      clientIP,
      userAgent,
      userId: user?.id,
      tenantId,
      body: this.sanitizeRequestBody(body)
    });

    // Handle specific error types
    if (this.isTenantError(err)) {
      return this.handleTenantError(err, req, res);
    }

    if (this.isValidationError(err)) {
      return this.handleValidationError(err, req, res);
    }

    if (this.isAuthenticationError(err)) {
      return this.handleAuthenticationError(err, req, res);
    }

    if (this.isAuthorizationError(err)) {
      return this.handleAuthorizationError(err, req, res);
    }

    if (this.isDatabaseError(err)) {
      return this.handleDatabaseError(err, req, res);
    }

    if (this.isRateLimitError(err)) {
      return this.handleRateLimitError(err, req, res);
    }

    // Default error response
    return this.handleGenericError(err, req, res);
  }

  /**
   * Handle tenant-specific errors
   */
  handleTenantError(err, req, res) {
    const errorResponse = {
      error: 'TENANT_VIOLATION',
      message: 'Access denied: Invalid tenant access',
      details: {
        requestedTenant: req.headers['x-tenant-id'],
        userTenant: req.user?.tenantId,
        timestamp: new Date().toISOString()
      },
      code: 'TENANT_ACCESS_DENIED'
    };

    // Log tenant violation
    this.auditService.logEvent({
      eventType: 'TENANT_VIOLATION',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      action: 'UNAUTHORIZED_TENANT_ACCESS',
      resource: 'TENANT',
      resourceId: req.headers['x-tenant-id'],
      details: {
        requestedTenant: req.headers['x-tenant-id'],
        userTenant: req.user?.tenantId,
        ip: this.getClientIP(req),
        userAgent: req.headers['user-agent']
      },
      severity: 'CRITICAL'
    });

    return res.status(403).json(errorResponse);
  }

  /**
   * Handle validation errors
   */
  handleValidationError(err, req, res) {
    const validationErrors = this.extractValidationErrors(err);
    
    const errorResponse = {
      error: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: validationErrors,
      code: 'INVALID_INPUT'
    };

    return res.status(400).json(errorResponse);
  }

  /**
   * Handle authentication errors
   */
  handleAuthenticationError(err, req, res) {
    const errorResponse = {
      error: 'AUTHENTICATION_ERROR',
      message: 'Authentication failed',
      details: {
        reason: err.message || 'Invalid credentials',
        timestamp: new Date().toISOString()
      },
      code: 'AUTH_FAILED'
    };

    // Log authentication failure
    this.auditService.logEvent({
      eventType: 'AUTHENTICATION_FAILURE',
      userId: null,
      tenantId: req.headers['x-tenant-id'],
      action: 'LOGIN_ATTEMPT',
      resource: 'AUTH',
      resourceId: null,
      details: {
        ip: this.getClientIP(req),
        userAgent: req.headers['user-agent'],
        reason: err.message
      },
      severity: 'MEDIUM'
    });

    return res.status(401).json(errorResponse);
  }

  /**
   * Handle authorization errors
   */
  handleAuthorizationError(err, req, res) {
    const errorResponse = {
      error: 'AUTHORIZATION_ERROR',
      message: 'Access denied: Insufficient permissions',
      details: {
        requiredRole: err.requiredRole,
        userRole: req.user?.role,
        resource: err.resource,
        action: err.action,
        timestamp: new Date().toISOString()
      },
      code: 'INSUFFICIENT_PERMISSIONS'
    };

    // Log authorization failure
    this.auditService.logEvent({
      eventType: 'AUTHORIZATION_FAILURE',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      action: 'UNAUTHORIZED_ACCESS',
      resource: err.resource || 'UNKNOWN',
      resourceId: err.resourceId,
      details: {
        requiredRole: err.requiredRole,
        userRole: req.user?.role,
        ip: this.getClientIP(req)
      },
      severity: 'HIGH'
    });

    return res.status(403).json(errorResponse);
  }

  /**
   * Handle database errors
   */
  handleDatabaseError(err, req, res) {
    let errorResponse = {
      error: 'DATABASE_ERROR',
      message: 'Database operation failed',
      code: 'DB_ERROR'
    };

    // Handle specific database errors
    if (err.code === 11000) {
      errorResponse = {
        error: 'DUPLICATE_ERROR',
        message: 'Resource already exists',
        details: {
          field: Object.keys(err.keyPattern)[0],
          value: Object.values(err.keyValue)[0]
        },
        code: 'DUPLICATE_ENTRY'
      };
      return res.status(409).json(errorResponse);
    }

    if (err.code === 121) {
      errorResponse = {
        error: 'VALIDATION_ERROR',
        message: 'Document validation failed',
        details: err.errors,
        code: 'VALIDATION_FAILED'
      };
      return res.status(400).json(errorResponse);
    }

    // Log database error
    this.auditService.logEvent({
      eventType: 'DATABASE_ERROR',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      action: 'DB_OPERATION_FAILED',
      resource: 'DATABASE',
      resourceId: null,
      details: {
        errorCode: err.code,
        errorMessage: err.message,
        operation: req.method + ' ' + req.url
      },
      severity: 'HIGH'
    });

    return res.status(500).json(errorResponse);
  }

  /**
   * Handle rate limit errors
   */
  handleRateLimitError(err, req, res) {
    const errorResponse = {
      error: 'RATE_LIMIT_ERROR',
      message: 'Too many requests',
      details: {
        limit: err.limit,
        remaining: err.remaining,
        resetTime: err.resetTime,
        retryAfter: err.retryAfter
      },
      code: 'RATE_LIMIT_EXCEEDED'
    };

    res.set('Retry-After', err.retryAfter);
    return res.status(429).json(errorResponse);
  }

  /**
   * Handle generic errors
   */
  handleGenericError(err, req, res) {
    const errorResponse = {
      error: 'INTERNAL_ERROR',
      message: 'An internal server error occurred',
      details: {
        timestamp: new Date().toISOString(),
        requestId: req.id || 'unknown'
      },
      code: 'INTERNAL_SERVER_ERROR'
    };

    // Log critical error
    this.auditService.logEvent({
      eventType: 'SYSTEM_ERROR',
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      action: 'UNHANDLED_ERROR',
      resource: 'SYSTEM',
      resourceId: null,
      details: {
        errorMessage: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
      },
      severity: 'CRITICAL'
    });

    return res.status(500).json(errorResponse);
  }

  /**
   * Check if error is tenant-related
   */
  isTenantError(err) {
    return err.name === 'InvalidTenantAccessException' ||
           err.message?.includes('tenant') ||
           err.code === 'TENANT_VIOLATION';
  }

  /**
   * Check if error is validation-related
   */
  isValidationError(err) {
    return err.name === 'ValidationError' ||
           err.name === 'CastError' ||
           err.code === 121;
  }

  /**
   * Check if error is authentication-related
   */
  isAuthenticationError(err) {
    return err.name === 'JsonWebTokenError' ||
           err.name === 'TokenExpiredError' ||
           err.message?.includes('authentication') ||
           err.code === 'AUTH_FAILED';
  }

  /**
   * Check if error is authorization-related
   */
  isAuthorizationError(err) {
    return err.name === 'InsufficientPermissionsException' ||
           err.message?.includes('permission') ||
           err.message?.includes('role') ||
           err.code === 'INSUFFICIENT_PERMISSIONS';
  }

  /**
   * Check if error is database-related
   */
  isDatabaseError(err) {
    return err.name === 'MongoError' ||
           err.name === 'MongooseError' ||
           err.code === 11000 ||
           err.code === 121;
  }

  /**
   * Check if error is rate limit-related
   */
  isRateLimitError(err) {
    return err.name === 'RateLimitError' ||
           err.code === 'RATE_LIMIT_EXCEEDED';
  }

  /**
   * Extract validation errors from mongoose errors
   */
  extractValidationErrors(err) {
    const errors = {};
    
    if (err.errors) {
      Object.keys(err.errors).forEach(field => {
        errors[field] = err.errors[field].message;
      });
    }
    
    return errors;
  }

  /**
   * Get client IP address
   */
  getClientIP(req) {
    return req.headers['x-forwarded-for'] ||
           req.headers['x-real-ip'] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           req.ip;
  }

  /**
   * Sanitize request body for logging
   */
  sanitizeRequestBody(body) {
    if (!body) return {};
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * Log error with context
   */
  logError(err, context) {
    logger.error('Application error occurred', {
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
        code: err.code
      },
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Create custom error classes
   */
  static createTenantError(message, tenantId) {
    const error = new Error(message);
    error.name = 'InvalidTenantAccessException';
    error.tenantId = tenantId;
    error.code = 'TENANT_VIOLATION';
    return error;
  }

  static createAuthorizationError(message, requiredRole, resource) {
    const error = new Error(message);
    error.name = 'InsufficientPermissionsException';
    error.requiredRole = requiredRole;
    error.resource = resource;
    error.code = 'INSUFFICIENT_PERMISSIONS';
    return error;
  }

  static createRateLimitError(message, limit, remaining, resetTime) {
    const error = new Error(message);
    error.name = 'RateLimitError';
    error.limit = limit;
    error.remaining = remaining;
    error.resetTime = resetTime;
    error.retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
    error.code = 'RATE_LIMIT_EXCEEDED';
    return error;
  }
}

module.exports = new EnhancedErrorHandler(); 