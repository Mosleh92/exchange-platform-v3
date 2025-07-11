const logger = require('../utils/logger');

/**
 * Comprehensive Error Handling Middleware
 * Handles all types of errors and provides proper error responses
 */
class ErrorHandlerMiddleware {
  constructor() {
    this.initializeErrorTypes();
  }

  /**
   * Initialize error types and their handling
   */
  initializeErrorTypes() {
    this.errorTypes = {
      ValidationError: {
        statusCode: 400,
        message: 'Validation failed',
        logLevel: 'warn'
      },
      AuthenticationError: {
        statusCode: 401,
        message: 'Authentication failed',
        logLevel: 'warn'
      },
      AuthorizationError: {
        statusCode: 403,
        message: 'Access denied',
        logLevel: 'warn'
      },
      NotFoundError: {
        statusCode: 404,
        message: 'Resource not found',
        logLevel: 'info'
      },
      ConflictError: {
        statusCode: 409,
        message: 'Resource conflict',
        logLevel: 'warn'
      },
      RateLimitError: {
        statusCode: 429,
        message: 'Too many requests',
        logLevel: 'warn'
      },
      DatabaseError: {
        statusCode: 500,
        message: 'Database operation failed',
        logLevel: 'error'
      },
      ExternalServiceError: {
        statusCode: 502,
        message: 'External service unavailable',
        logLevel: 'error'
      },
      NetworkError: {
        statusCode: 503,
        message: 'Service temporarily unavailable',
        logLevel: 'error'
      },
      InternalServerError: {
        statusCode: 500,
        message: 'Internal server error',
        logLevel: 'error'
      }
    };
  }

  /**
   * Main error handler middleware
   */
  handleError(error, req, res, next) {
    try {
      // Determine error type
      const errorType = this.determineErrorType(error);
      const errorConfig = this.errorTypes[errorType] || this.errorTypes.InternalServerError;

      // Log error with appropriate level
      this.logError(error, req, errorConfig.logLevel);

      // Create error response
      const errorResponse = this.createErrorResponse(error, errorConfig, req);

      // Send error response
      res.status(errorConfig.statusCode).json(errorResponse);

      // Emit error event for monitoring
      this.emitErrorEvent(error, req, errorConfig);

    } catch (handlerError) {
      // Fallback error handling
      logger.error('Error handler failed:', handlerError);
      res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Determine error type based on error object
   */
  determineErrorType(error) {
    if (error.name === 'ValidationError' || error.message?.includes('validation')) {
      return 'ValidationError';
    }

    if (error.name === 'JsonWebTokenError' || error.message?.includes('token')) {
      return 'AuthenticationError';
    }

    if (error.name === 'UnauthorizedError' || error.message?.includes('unauthorized')) {
      return 'AuthorizationError';
    }

    if (error.code === 'ENOTFOUND' || error.message?.includes('not found')) {
      return 'NotFoundError';
    }

    if (error.code === 'ER_DUP_ENTRY' || error.message?.includes('duplicate')) {
      return 'ConflictError';
    }

    if (error.message?.includes('rate limit') || error.message?.includes('too many requests')) {
      return 'RateLimitError';
    }

    if (error.code?.startsWith('ER_') || error.message?.includes('database')) {
      return 'DatabaseError';
    }

    if (error.code === 'ECONNREFUSED' || error.message?.includes('external service')) {
      return 'ExternalServiceError';
    }

    if (error.code === 'ENETUNREACH' || error.message?.includes('network')) {
      return 'NetworkError';
    }

    return 'InternalServerError';
  }

  /**
   * Create standardized error response
   */
  createErrorResponse(error, errorConfig, req) {
    const response = {
      error: errorConfig.message,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      requestId: req.requestId
    };

    // Add error details in development
    if (process.env.NODE_ENV === 'development') {
      response.details = {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code
      };
    }

    // Add validation errors if present
    if (error.details && Array.isArray(error.details)) {
      response.validationErrors = error.details;
    }

    // Add retry information for rate limit errors
    if (errorConfig.statusCode === 429) {
      response.retryAfter = error.retryAfter || 60;
    }

    return response;
  }

  /**
   * Log error with appropriate level
   */
  logError(error, req, logLevel) {
    const logData = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      request: {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
        tenantId: req.headers['tenant-id']
      },
      timestamp: new Date().toISOString()
    };

    switch (logLevel) {
      case 'error':
        logger.error('Application error:', logData);
        break;
      case 'warn':
        logger.warn('Application warning:', logData);
        break;
      case 'info':
        logger.info('Application info:', logData);
        break;
      default:
        logger.error('Application error:', logData);
    }
  }

  /**
   * Emit error event for monitoring
   */
  emitErrorEvent(error, req, errorConfig) {
    const errorEvent = {
      type: errorConfig.statusCode >= 500 ? 'ERROR' : 'WARNING',
      statusCode: errorConfig.statusCode,
      message: error.message,
      path: req.path,
      method: req.method,
      userId: req.user?.id,
      tenantId: req.headers['tenant-id'],
      timestamp: new Date().toISOString()
    };

    // Emit event for monitoring service
    if (global.monitoringService) {
      global.monitoringService.emit('errorOccurred', errorEvent);
    }
  }

  /**
   * Handle async errors
   */
  handleAsync(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Handle database transaction errors
   */
  handleDatabaseError(error, req, res, next) {
    // Rollback transaction if active
    if (req.dbTransaction) {
      req.dbTransaction.rollback();
    }

    // Log database error
    logger.error('Database error:', {
      error: error.message,
      code: error.code,
      sql: error.sql,
      path: req.path,
      userId: req.user?.id
    });

    // Create database-specific error response
    const errorResponse = {
      error: 'Database operation failed',
      message: 'Unable to complete the requested operation',
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    };

    // Add more details in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = {
        code: error.code,
        sql: error.sql
      };
    }

    res.status(500).json(errorResponse);
  }

  /**
   * Handle validation errors
   */
  handleValidationError(error, req, res, next) {
    const validationErrors = error.details?.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    })) || [];

    const errorResponse = {
      error: 'Validation failed',
      message: 'The provided data is invalid',
      validationErrors,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    };

    res.status(400).json(errorResponse);
  }

  /**
   * Handle authentication errors
   */
  handleAuthenticationError(error, req, res, next) {
    const errorResponse = {
      error: 'Authentication failed',
      message: 'Invalid credentials or token',
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    };

    // Add specific details for different auth errors
    if (error.name === 'JsonWebTokenError') {
      errorResponse.message = 'Invalid or expired token';
    } else if (error.name === 'TokenExpiredError') {
      errorResponse.message = 'Token has expired';
    }

    res.status(401).json(errorResponse);
  }

  /**
   * Handle authorization errors
   */
  handleAuthorizationError(error, req, res, next) {
    const errorResponse = {
      error: 'Access denied',
      message: 'You do not have permission to perform this action',
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      requiredPermissions: error.requiredPermissions || []
    };

    res.status(403).json(errorResponse);
  }

  /**
   * Handle rate limit errors
   */
  handleRateLimitError(error, req, res, next) {
    const errorResponse = {
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: error.retryAfter || 60,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    };

    res.status(429).json(errorResponse);
  }

  /**
   * Handle external service errors
   */
  handleExternalServiceError(error, req, res, next) {
    const errorResponse = {
      error: 'External service unavailable',
      message: 'Unable to complete request due to external service issues',
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    };

    // Add service-specific information
    if (error.service) {
      errorResponse.service = error.service;
    }

    res.status(502).json(errorResponse);
  }

  /**
   * Handle WebSocket errors
   */
  handleWebSocketError(error, socket) {
    logger.error('WebSocket error:', {
      error: error.message,
      socketId: socket.id,
      userId: socket.userId,
      tenantId: socket.tenantId
    });

    // Send error to client
    socket.emit('error', {
      error: 'Connection error',
      message: 'An error occurred with the connection'
    });

    // Close connection if critical error
    if (error.critical) {
      socket.disconnect();
    }
  }

  /**
   * Handle unhandled promise rejections
   */
  handleUnhandledRejection(reason, promise) {
    logger.error('Unhandled promise rejection:', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise
    });

    // Emit event for monitoring
    if (global.monitoringService) {
      global.monitoringService.emit('unhandledRejection', {
        reason: reason?.message || reason,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle uncaught exceptions
   */
  handleUncaughtException(error) {
    logger.error('Uncaught exception:', {
      error: error.message,
      stack: error.stack
    });

    // Emit event for monitoring
    if (global.monitoringService) {
      global.monitoringService.emit('uncaughtException', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Graceful shutdown
    process.exit(1);
  }

  /**
   * Initialize global error handlers
   */
  initializeGlobalHandlers() {
    process.on('unhandledRejection', this.handleUnhandledRejection);
    process.on('uncaughtException', this.handleUncaughtException);
  }

  /**
   * Create custom error classes
   */
  createCustomErrors() {
    class ValidationError extends Error {
      constructor(message, details) {
        super(message);
        this.name = 'ValidationError';
        this.details = details;
      }
    }

    class AuthenticationError extends Error {
      constructor(message) {
        super(message);
        this.name = 'AuthenticationError';
      }
    }

    class AuthorizationError extends Error {
      constructor(message, requiredPermissions = []) {
        super(message);
        this.name = 'AuthorizationError';
        this.requiredPermissions = requiredPermissions;
      }
    }

    class NotFoundError extends Error {
      constructor(message) {
        super(message);
        this.name = 'NotFoundError';
      }
    }

    class ConflictError extends Error {
      constructor(message) {
        super(message);
        this.name = 'ConflictError';
      }
    }

    class RateLimitError extends Error {
      constructor(message, retryAfter = 60) {
        super(message);
        this.name = 'RateLimitError';
        this.retryAfter = retryAfter;
      }
    }

    class DatabaseError extends Error {
      constructor(message, code, sql) {
        super(message);
        this.name = 'DatabaseError';
        this.code = code;
        this.sql = sql;
      }
    }

    class ExternalServiceError extends Error {
      constructor(message, service) {
        super(message);
        this.name = 'ExternalServiceError';
        this.service = service;
      }
    }

    return {
      ValidationError,
      AuthenticationError,
      AuthorizationError,
      NotFoundError,
      ConflictError,
      RateLimitError,
      DatabaseError,
      ExternalServiceError
    };
  }
}

module.exports = new ErrorHandlerMiddleware();
