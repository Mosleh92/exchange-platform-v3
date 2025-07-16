 copilot/fix-62378d25-cbd6-4e65-a205-dbd7675c9ecb
const { logger, securityLogger } = require('../utils/logger');

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
  }
}

class TenantIsolationError extends AppError {
  constructor(message = 'تجاوز از حریم امنیتی تشخیص داده شد') {
    super(message, 403, 'TENANT_ISOLATION_VIOLATION');
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'احراز هویت نیاز است') {
    super(message, 401, 'AUTHENTICATION_REQUIRED');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'دسترسی کافی ندارید') {
    super(message, 403, 'INSUFFICIENT_PERMISSIONS');
  }
}

class ResourceNotFoundError extends AppError {
  constructor(resource = 'منبع') {
    super(`${resource} یافت نشد`, 404, 'RESOURCE_NOT_FOUND');
    this.resource = resource;
  }
}

class RateLimitError extends AppError {
  constructor(message = 'تعداد درخواست‌ها از حد مجاز بیشتر است') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

class DatabaseError extends AppError {
  constructor(message = 'خطا در پایگاه داده') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

// Handle specific Mongoose errors
const handleCastErrorDB = (err) => {
  const message = `شناسه نامعتبر: ${err.value}`;
  return new AppError(message, 400, 'INVALID_ID');
};

const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `مقدار تکراری برای فیلد ${field}: ${value}`;
  return new AppError(message, 400, 'DUPLICATE_FIELD');
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `داده‌های نامعتبر: ${errors.join('. ')}`;
  return new ValidationError(message);
};

const handleJWTError = () =>
  new AuthenticationError('توکن نامعتبر است. لطفا دوباره وارد شوید');

const handleJWTExpiredError = () =>
  new AuthenticationError('توکن منقضی شده است. لطفا دوباره وارد شوید');

// Send error response in development
const sendErrorDev = (err, req, res) => {
  logger.error('Development Error', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    user: req.user
  });

  res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack,
    code: err.code
  });
};

// Send error response in production
const sendErrorProd = (err, req, res) => {
  // Log security-related errors
  if (err.code === 'TENANT_ISOLATION_VIOLATION') {
    securityLogger.logTenantIsolationViolation(req, req.body.tenantId || req.params.tenantId);
  }
  
  if (err.code === 'AUTHENTICATION_REQUIRED' || err.code === 'INSUFFICIENT_PERMISSIONS') {
    securityLogger.logUnauthorizedAccess(req, req.originalUrl);
  }

  // Operational, trusted error: send message to client
  if (err.isOperational) {
    logger.warn('Operational Error', {
      message: err.message,
      code: err.code,
      statusCode: err.statusCode,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      user: req.user
    });

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('Unexpected Error', {
      error: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      user: req.user
    });

    res.status(500).json({
      success: false,
      message: 'خطای سرور! لطفا با پشتیبانی تماس بگیرید',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

// Global error handling middleware
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  let error = { ...err };
  error.message = err.message;

  // Handle specific error types
  if (error.name === 'CastError') error = handleCastErrorDB(error);
  if (error.code === 11000) error = handleDuplicateFieldsDB(error);
  if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
  if (error.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

  // Handle mongoose timeout errors
  if (error.name === 'MongooseError' && error.message.includes('timed out')) {
    error = new DatabaseError('عملیات پایگاه داده زمان زیادی طول کشید');
  }

  // Handle rate limiting errors
  if (error.statusCode === 429) {
    error = new RateLimitError();
  }

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, req, res);
  } else {
    sendErrorProd(error, req, res);
  }
};

// Async error wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// 404 handler
const notFound = (req, res, next) => {
  const err = new ResourceNotFoundError(`صفحه ${req.originalUrl}`);
  next(err);
};

// Validation middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      return next(new ValidationError(message));
    }
    next();
  };
};

// Tenant access validation
const validateTenantAccess = (req, res, next) => {
  const requestedTenantId = req.params.tenantId || req.body.tenantId || req.query.tenantId;
  
  if (requestedTenantId && req.user.role !== 'super_admin') {
    if (!req.user.tenantId || req.user.tenantId.toString() !== requestedTenantId.toString()) {
      return next(new TenantIsolationError());
    }
  }
  
  next();
};

module.exports = {
  AppError,
  ValidationError,
  TenantIsolationError,
  AuthenticationError,
  AuthorizationError,
  ResourceNotFoundError,
  RateLimitError,
  DatabaseError,
  globalErrorHandler,
  catchAsync,
  notFound,
  validateRequest,
  validateTenantAccess
};
=======
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
 main
