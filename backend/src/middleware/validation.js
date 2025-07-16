const Joi = require('joi');
const logger = require('../utils/logger');
const xss = require('xss');

/**
 * Comprehensive Input Validation Middleware
 * Handles input validation, sanitization, and security checks
 */
class ValidationMiddleware {
  constructor() {
    this.initializeValidationSchemas();
  }

  /**
   * Initialize validation schemas for different endpoints
   */
  initializeValidationSchemas() {
    // User registration schema
    this.userRegistrationSchema = Joi.object({
      email: Joi.string().email().required().max(255),
      password: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required(),
      firstName: Joi.string().min(2).max(50).pattern(/^[a-zA-Z\s]+$/).required(),
      lastName: Joi.string().min(2).max(50).pattern(/^[a-zA-Z\s]+$/).required(),
      phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).required(),
      dateOfBirth: Joi.date().max('now').required(),
      nationality: Joi.string().length(2).required(),
      address: Joi.object({
        street: Joi.string().min(5).max(255).required(),
        city: Joi.string().min(2).max(100).required(),
        state: Joi.string().min(2).max(100).required(),
        country: Joi.string().length(2).required(),
        postalCode: Joi.string().min(3).max(20).required()
      }).required()
    });

    // User login schema
    this.userLoginSchema = Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
      twoFactorCode: Joi.string().length(6).optional(),
      rememberMe: Joi.boolean().default(false)
    });

    // Transaction creation schema
    this.transactionSchema = Joi.object({
      amount: Joi.number().positive().max(1000000).precision(2).required(),
      currency: Joi.string().length(3).uppercase().required(),
      type: Joi.string().valid('BUY', 'SELL', 'TRANSFER', 'WITHDRAWAL', 'DEPOSIT').required(),
      description: Joi.string().max(500).optional(),
      recipientId: Joi.string().uuid().optional(),
      paymentMethod: Joi.string().valid('BANK_TRANSFER', 'CREDIT_CARD', 'CRYPTO', 'CHECK').optional()
    });

    // Order creation schema
    this.orderSchema = Joi.object({
      symbol: Joi.string().pattern(/^[A-Z]{3}\/[A-Z]{3}$/).required(),
      side: Joi.string().valid('BUY', 'SELL').required(),
      quantity: Joi.number().positive().max(1000000).precision(8).required(),
      price: Joi.number().positive().max(1000000).precision(2).optional(),
      orderType: Joi.string().valid('MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT').required(),
      timeInForce: Joi.string().valid('GTC', 'IOC', 'FOK').default('GTC'),
      stopPrice: Joi.number().positive().max(1000000).precision(2).optional()
    });

    // Payment schema
    this.paymentSchema = Joi.object({
      amount: Joi.number().positive().max(1000000).precision(2).required(),
      currency: Joi.string().length(3).uppercase().required(),
      paymentMethod: Joi.string().valid('BANK_TRANSFER', 'CREDIT_CARD', 'CRYPTO', 'CHECK').required(),
      description: Joi.string().max(500).optional(),
      metadata: Joi.object().optional()
    });

    // KYC verification schema
    this.kycSchema = Joi.object({
      firstName: Joi.string().min(2).max(50).pattern(/^[a-zA-Z\s]+$/).required(),
      lastName: Joi.string().min(2).max(50).pattern(/^[a-zA-Z\s]+$/).required(),
      dateOfBirth: Joi.date().max('now').required(),
      nationality: Joi.string().length(2).required(),
      idType: Joi.string().valid('PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID').required(),
      idNumber: Joi.string().min(5).max(50).required(),
      address: Joi.object({
        street: Joi.string().min(5).max(255).required(),
        city: Joi.string().min(2).max(100).required(),
        state: Joi.string().min(2).max(100).required(),
        country: Joi.string().length(2).required(),
        postalCode: Joi.string().min(3).max(20).required()
      }).required(),
      phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).required(),
      email: Joi.string().email().required()
    });

    // File upload schema
    this.fileUploadSchema = Joi.object({
      fileType: Joi.string().valid('IMAGE', 'DOCUMENT', 'VIDEO').required(),
      maxSize: Joi.number().max(10 * 1024 * 1024).default(5 * 1024 * 1024), // 5MB default
      allowedExtensions: Joi.array().items(Joi.string()).default(['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'])
    });

    // Search and filter schema
    this.searchSchema = Joi.object({
      query: Joi.string().max(255).optional(),
      page: Joi.number().integer().min(1).max(1000).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      sortBy: Joi.string().valid('created_at', 'updated_at', 'amount', 'status').default('created_at'),
      sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
      filters: Joi.object().optional()
    });
  }

  /**
   * Validate request body with schema
   */
  validateBody(schema) {
    return (req, res, next) => {
      try {
        const { error, value } = schema.validate(req.body, {
          abortEarly: false,
          stripUnknown: true,
          allowUnknown: false
        });

        if (error) {
          const validationErrors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }));

          logger.warn('Validation failed', {
            ip: req.ip,
            path: req.path,
            errors: validationErrors
          });

          return res.status(400).json({
            error: 'Validation failed',
            details: validationErrors
          });
        }

        // Sanitize validated data
        req.body = this.sanitizeData(value);
        next();

      } catch (error) {
        logger.error('Validation error:', error);
        return res.status(500).json({
          error: 'Internal server error',
          message: 'Failed to validate request'
        });
      }
    };
  }

  /**
   * Validate query parameters
   */
  validateQuery(schema) {
    return (req, res, next) => {
      try {
        const { error, value } = schema.validate(req.query, {
          abortEarly: false,
          stripUnknown: true,
          allowUnknown: false
        });

        if (error) {
          const validationErrors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }));

          logger.warn('Query validation failed', {
            ip: req.ip,
            path: req.path,
            errors: validationErrors
          });

          return res.status(400).json({
            error: 'Invalid query parameters',
            details: validationErrors
          });
        }

        // Sanitize validated data
        req.query = this.sanitizeData(value);
        next();

      } catch (error) {
        logger.error('Query validation error:', error);
        return res.status(500).json({
          error: 'Internal server error',
          message: 'Failed to validate query parameters'
        });
      }
    };
  }

  /**
   * Validate URL parameters
   */
  validateParams(schema) {
    return (req, res, next) => {
      try {
        const { error, value } = schema.validate(req.params, {
          abortEarly: false,
          stripUnknown: true,
          allowUnknown: false
        });

        if (error) {
          const validationErrors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }));

          logger.warn('Parameter validation failed', {
            ip: req.ip,
            path: req.path,
            errors: validationErrors
          });

          return res.status(400).json({
            error: 'Invalid URL parameters',
            details: validationErrors
          });
        }

        // Sanitize validated data
        req.params = this.sanitizeData(value);
        next();

      } catch (error) {
        logger.error('Parameter validation error:', error);
        return res.status(500).json({
          error: 'Internal server error',
          message: 'Failed to validate URL parameters'
        });
      }
    };
  }

  /**
   * Sanitize data to prevent XSS and injection attacks
   */
  sanitizeData(data) {
    if (typeof data === 'string') {
      return this.sanitizeString(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeData(value);
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Sanitize string to prevent XSS
   */
  sanitizeString(str) {
    if (typeof str !== 'string') {
      return str;
    }

    // Remove potentially dangerous characters and patterns
    return str
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/data:/gi, '') // Remove data: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
      .trim();
  }

  /**
   * Validate file upload
   */
  validateFileUpload(schema) {
    return (req, res, next) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            error: 'No file uploaded',
            message: 'File is required'
          });
        }

        const { error, value } = schema.validate({
          fileType: req.body.fileType,
          maxSize: req.body.maxSize,
          allowedExtensions: req.body.allowedExtensions
        });

        if (error) {
          return res.status(400).json({
            error: 'Invalid file upload parameters',
            details: error.details
          });
        }

        // Validate file size
        if (req.file.size > value.maxSize) {
          return res.status(400).json({
            error: 'File too large',
            message: `File size must be less than ${value.maxSize / (1024 * 1024)}MB`
          });
        }

        // Validate file extension
        const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
        if (!value.allowedExtensions.includes(fileExtension)) {
          return res.status(400).json({
            error: 'Invalid file type',
            message: `Only ${value.allowedExtensions.join(', ')} files are allowed`
          });
        }

        // Validate file content
        this.validateFileContent(req.file, value.fileType)
          .then(() => next())
          .catch(error => {
            return res.status(400).json({
              error: 'Invalid file content',
              message: error.message
            });
          });

      } catch (error) {
        logger.error('File validation error:', error);
        return res.status(500).json({
          error: 'Internal server error',
          message: 'Failed to validate file'
        });
      }
    };
  }

  /**
   * Validate file content
   */
  async validateFileContent(file, fileType) {
    // Check file magic numbers for common file types
    const magicNumbers = {
      'IMAGE': {
        'jpg': [0xFF, 0xD8, 0xFF],
        'jpeg': [0xFF, 0xD8, 0xFF],
        'png': [0x89, 0x50, 0x4E, 0x47],
        'gif': [0x47, 0x49, 0x46]
      },
      'DOCUMENT': {
        'pdf': [0x25, 0x50, 0x44, 0x46],
        'doc': [0xD0, 0xCF, 0x11, 0xE0],
        'docx': [0x50, 0x4B, 0x03, 0x04]
      }
    };

    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    const expectedMagicNumbers = magicNumbers[fileType]?.[fileExtension];

    if (expectedMagicNumbers) {
      const buffer = file.buffer.slice(0, expectedMagicNumbers.length);
      const fileMagicNumbers = Array.from(buffer);

      const isValid = expectedMagicNumbers.every((byte, index) => 
        fileMagicNumbers[index] === byte
      );

      if (!isValid) {
        throw new Error(`Invalid ${fileType.toLowerCase()} file format`);
      }
    }
  }

  /**
   * Validate UUID parameters
   */
  validateUUID(paramName) {
    const uuidSchema = Joi.object({
      [paramName]: Joi.string().uuid().required()
    });

    return this.validateParams(uuidSchema);
  }

  /**
   * Validate numeric ID parameters
   */
  validateNumericID(paramName) {
    const idSchema = Joi.object({
      [paramName]: Joi.number().integer().positive().required()
    });

    return this.validateParams(idSchema);
  }

  /**
   * Validate pagination parameters
   */
  validatePagination() {
    const paginationSchema = Joi.object({
      page: Joi.number().integer().min(1).max(1000).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      sortBy: Joi.string().valid('created_at', 'updated_at', 'amount', 'status').default('created_at'),
      sortOrder: Joi.string().valid('asc', 'desc').default('desc')
    });

    return this.validateQuery(paginationSchema);
  }

  /**
   * Validate date range parameters
   */
  validateDateRange() {
    const dateRangeSchema = Joi.object({
      startDate: Joi.date().iso().max('now').required(),
      endDate: Joi.date().iso().min(Joi.ref('startDate')).max('now').required()
    });

    return this.validateQuery(dateRangeSchema);
  }

  /**
   * Get validation schemas
   */
  getSchemas() {
    return {
      userRegistration: this.userRegistrationSchema,
      userLogin: this.userLoginSchema,
      transaction: this.transactionSchema,
      order: this.orderSchema,
      payment: this.paymentSchema,
      kyc: this.kycSchema,
      fileUpload: this.fileUploadSchema,
      search: this.searchSchema
    };
  }
}

module.exports = new ValidationMiddleware(); 