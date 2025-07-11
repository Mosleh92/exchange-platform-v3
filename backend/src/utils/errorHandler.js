const logger = require('./logger');

/**
 * Enhanced Error Handler
 * Comprehensive error handling with proper logging and monitoring
 */
class ErrorHandler {
  /**
   * Handle application errors
   */
  static handleError(error, req, res, next) {
    // Log error with context
    const errorContext = {
        error: error.message,
      stack: error.stack,
      url: req?.url,
      method: req?.method,
      ip: req?.ip,
      userAgent: req?.headers['user-agent'],
      userId: req?.user?.id,
      tenantId: req?.tenantContext?.tenantId,
      timestamp: new Date().toISOString()
    };

    logger.error('Application Error:', errorContext);

    // Determine error type and response
    if (error.name === 'ValidationError') {
        return res.status(400).json({
        error: 'Validation Error',
        details: error.message,
        code: 'VALIDATION_ERROR'
        });
    }

    if (error.name === 'MongoError' && error.code === 11000) {
        return res.status(409).json({
        error: 'Duplicate Entry',
        details: 'A record with this information already exists',
        code: 'DUPLICATE_ENTRY'
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        error: 'Invalid ID Format',
        details: 'The provided ID is not valid',
        code: 'INVALID_ID'
        });
    }

    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
        error: 'Invalid Token',
        details: 'Authentication token is invalid',
        code: 'INVALID_TOKEN'
        });
    }

    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
        error: 'Token Expired',
        details: 'Authentication token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    // Default error response
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';

    return res.status(statusCode).json({
      error: message,
      code: error.code || 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        });
    }

  /**
   * Handle async errors
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Create custom error classes
   */
  static createError(message, statusCode = 500, code = 'CUSTOM_ERROR') {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.code = code;
    return error;
  }

  /**
   * Handle database connection errors
   */
  static handleDatabaseError(error) {
    logger.error('Database Error:', {
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });

    // Notify administrators for critical database errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      this.notifyAdmins('Critical Database Connection Error', error);
    }
  }

  /**
   * Handle security-related errors
   */
  static handleSecurityError(error, req) {
    const securityContext = {
      error: error.message,
      ip: req?.ip,
      userAgent: req?.headers['user-agent'],
      url: req?.url,
      method: req?.method,
      userId: req?.user?.id,
      timestamp: new Date().toISOString()
    };

    logger.warn('Security Alert:', securityContext);

    // Log security events for monitoring
    this.logSecurityEvent('SECURITY_ERROR', securityContext);
  }

  /**
   * Notify administrators of critical errors
   */
  static notifyAdmins(subject, error) {
    // Implementation for admin notification
    logger.error(`Admin Notification - ${subject}:`, error);
    
    // TODO: Implement email/SMS notification to admins
    // This could integrate with your notification service
  }

  /**
   * Log security events
   */
  static logSecurityEvent(eventType, context) {
    const securityLog = {
      eventType,
      ...context,
      severity: this.getSecuritySeverity(eventType),
      timestamp: new Date().toISOString()
    };

    logger.warn('Security Event:', securityLog);
  }

  /**
   * Get security event severity
   */
  static getSecuritySeverity(eventType) {
    const severityMap = {
      'AUTH_FAILURE': 'HIGH',
      'RATE_LIMIT_EXCEEDED': 'MEDIUM',
      'INVALID_TOKEN': 'MEDIUM',
      'PERMISSION_DENIED': 'LOW',
      'SECURITY_ERROR': 'HIGH'
    };

    return severityMap[eventType] || 'MEDIUM';
  }

  /**
   * Handle tenant-specific errors
   */
  static handleTenantError(error, tenantId) {
    const tenantError = {
      error: error.message,
      tenantId,
      timestamp: new Date().toISOString()
    };

    logger.error('Tenant Error:', tenantError);
    return tenantError;
  }

  /**
   * Handle financial transaction errors
   */
  static handleFinancialError(error, transactionId) {
    const financialError = {
      error: error.message,
      transactionId,
      timestamp: new Date().toISOString(),
      severity: 'CRITICAL'
    };

    logger.error('Financial Transaction Error:', financialError);
    
    // Notify financial administrators
    this.notifyAdmins('Financial Transaction Error', financialError);
    
    return financialError;
  }
}

module.exports = ErrorHandler;