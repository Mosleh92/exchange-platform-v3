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