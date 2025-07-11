// backend/src/middleware/inputValidation.js
const { body, query, param, validationResult } = require('express-validator');
const DOMPurify = require('isomorphic-dompurify');
const logger = require('../utils/logger');

/**
 * Enhanced Input Validation and Sanitization Middleware
 * Provides comprehensive request validation, sanitization, and security checks
 */
class InputValidationMiddleware {
  constructor() {
    this.initializeValidationRules();
  }

  /**
   * Initialize common validation rules
   */
  initializeValidationRules() {
    this.commonRules = {
      email: body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required')
        .custom(this.checkEmailSafety),

      password: body('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be 8-128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number and special character'),

      amount: body('amount')
        .isFloat({ min: 0.01, max: 999999999 })
        .withMessage('Amount must be between 0.01 and 999,999,999')
        .custom(this.validatePrecision),

      currency: body('currency')
        .isLength({ min: 3, max: 3 })
        .isAlpha()
        .toUpperCase()
        .withMessage('Currency must be 3-letter code'),

      phoneNumber: body('phoneNumber')
        .optional()
        .isMobilePhone()
        .withMessage('Valid phone number required'),

      tenantId: body('tenantId')
        .optional()
        .isMongoId()
        .withMessage('Valid tenant ID required'),

      pagination: [
        query('page')
          .optional()
          .isInt({ min: 1, max: 1000 })
          .withMessage('Page must be between 1 and 1000'),
        query('limit')
          .optional()
          .isInt({ min: 1, max: 100 })
          .withMessage('Limit must be between 1 and 100')
      ]
    };

    this.securityPatterns = [
      // XSS patterns
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /data:text\/html/gi,
      
      // SQL injection patterns
      /(\%27)|(\')|(\-\-)|(\%23)|(#)/gi,
      /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/gi,
      /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/gi,
      
      // Command injection patterns
      /(\||;|&|`|\$\(|\${)/gi,
      
      // NoSQL injection patterns
      /\$where/gi,
      /\$ne/gi,
      /\$regex/gi
    ];
  }

  /**
   * Sanitize all request data
   */
  sanitizeRequest = (req, res, next) => {
    try {
      // Sanitize body
      if (req.body) {
        req.body = this.sanitizeObject(req.body);
      }

      // Sanitize query parameters
      if (req.query) {
        req.query = this.sanitizeObject(req.query);
      }

      // Sanitize URL parameters
      if (req.params) {
        req.params = this.sanitizeObject(req.params);
      }

      // Sanitize headers (selected ones)
      if (req.headers) {
        req.headers = this.sanitizeHeaders(req.headers);
      }

      next();
    } catch (error) {
      logger.error('Request sanitization failed:', error);
      res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Request contains invalid data'
      });
    }
  };

  /**
   * Recursively sanitize object
   */
  sanitizeObject(obj) {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeString(key);
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Sanitize string values
   */
  sanitizeString(str) {
    if (typeof str !== 'string') {
      return str;
    }

    // Basic XSS protection
    let sanitized = DOMPurify.sanitize(str, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [] 
    });

    // Additional security patterns
    for (const pattern of this.securityPatterns) {
      if (pattern.test(sanitized)) {
        logger.warn('Potentially malicious input detected', { 
          input: str.substring(0, 100),
          pattern: pattern.toString()
        });
        
        // Remove the malicious content
        sanitized = sanitized.replace(pattern, '');
      }
    }

    // Trim whitespace
    sanitized = sanitized.trim();

    // Limit length to prevent DoS
    if (sanitized.length > 10000) {
      sanitized = sanitized.substring(0, 10000);
      logger.warn('Input truncated due to length', { originalLength: str.length });
    }

    return sanitized;
  }

  /**
   * Sanitize selected headers
   */
  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    
    // Headers to sanitize
    const headersToSanitize = [
      'user-agent',
      'referer',
      'x-forwarded-for',
      'x-real-ip'
    ];

    for (const header of headersToSanitize) {
      if (sanitized[header]) {
        sanitized[header] = this.sanitizeString(sanitized[header]);
      }
    }

    return sanitized;
  }

  /**
   * Validate request and handle errors
   */
  handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }));

      logger.warn('Validation errors', {
        path: req.path,
        method: req.method,
        errors: formattedErrors,
        ip: req.ip
      });

      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formattedErrors
      });
    }

    next();
  };

  /**
   * Custom validation for email safety
   */
  checkEmailSafety = async (email) => {
    // Check for suspicious email patterns
    const suspiciousPatterns = [
      /temp/i,
      /disposable/i,
      /10minutemail/i,
      /guerrillamail/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(email)) {
        throw new Error('Suspicious email domain detected');
      }
    }

    return true;
  };

  /**
   * Validate decimal precision for amounts
   */
  validatePrecision = (value) => {
    const decimals = (value.toString().split('.')[1] || '').length;
    if (decimals > 8) {
      throw new Error('Amount precision cannot exceed 8 decimal places');
    }
    return true;
  };

  /**
   * File upload validation
   */
  validateFileUpload = (allowedTypes = [], maxSize = 5 * 1024 * 1024) => {
    return (req, res, next) => {
      if (!req.file && !req.files) {
        return next();
      }

      const files = req.files || [req.file];
      
      for (const file of files) {
        // Check file size
        if (file.size > maxSize) {
          return res.status(400).json({
            error: 'FILE_TOO_LARGE',
            message: `File size exceeds ${maxSize / (1024 * 1024)}MB limit`
          });
        }

        // Check file type
        if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
          return res.status(400).json({
            error: 'INVALID_FILE_TYPE',
            message: 'File type not allowed',
            allowedTypes
          });
        }

        // Check file name for security
        if (this.hasUnsafeFileName(file.originalname)) {
          return res.status(400).json({
            error: 'UNSAFE_FILENAME',
            message: 'File name contains unsafe characters'
          });
        }
      }

      next();
    };
  };

  /**
   * Check for unsafe file names
   */
  hasUnsafeFileName(filename) {
    const unsafePatterns = [
      /\.\./,  // Directory traversal
      /[<>:"|?*]/,  // Invalid characters
      /^\./,  // Hidden files
      /\.exe$|\.bat$|\.cmd$|\.scr$/i  // Executable files
    ];

    return unsafePatterns.some(pattern => pattern.test(filename));
  }

  /**
   * Rate limiting based on request content
   */
  contentBasedRateLimit = (req, res, next) => {
    const contentComplexity = this.calculateContentComplexity(req);
    
    if (contentComplexity > 1000) {
      logger.warn('High complexity request detected', {
        complexity: contentComplexity,
        path: req.path,
        ip: req.ip
      });
      
      return res.status(429).json({
        error: 'REQUEST_TOO_COMPLEX',
        message: 'Request content is too complex'
      });
    }

    next();
  };

  /**
   * Calculate request content complexity
   */
  calculateContentComplexity(req) {
    let complexity = 0;
    
    // Body complexity
    if (req.body) {
      complexity += JSON.stringify(req.body).length;
      complexity += this.countNestedObjects(req.body) * 10;
    }

    // Query complexity
    if (req.query) {
      complexity += Object.keys(req.query).length * 5;
    }

    // File complexity
    if (req.files) {
      complexity += req.files.length * 100;
    }

    return complexity;
  };

  /**
   * Count nested objects in data
   */
  countNestedObjects(obj, depth = 0) {
    if (depth > 10) return 100; // Prevent infinite recursion
    
    let count = 0;
    
    if (typeof obj === 'object' && obj !== null) {
      count += 1;
      
      if (Array.isArray(obj)) {
        for (const item of obj) {
          count += this.countNestedObjects(item, depth + 1);
        }
      } else {
        for (const value of Object.values(obj)) {
          count += this.countNestedObjects(value, depth + 1);
        }
      }
    }
    
    return count;
  }

  /**
   * Validation schemas for specific endpoints
   */
  getValidationSchemas() {
    return {
      // User registration
      userRegistration: [
        this.commonRules.email,
        this.commonRules.password,
        body('firstName')
          .isLength({ min: 1, max: 50 })
          .matches(/^[A-Za-z\s]+$/)
          .withMessage('First name must contain only letters'),
        body('lastName')
          .isLength({ min: 1, max: 50 })
          .matches(/^[A-Za-z\s]+$/)
          .withMessage('Last name must contain only letters'),
        this.commonRules.phoneNumber,
        body('dateOfBirth')
          .optional()
          .isISO8601()
          .custom(this.validateAge)
      ],

      // Login
      login: [
        this.commonRules.email,
        body('password').notEmpty().withMessage('Password is required')
      ],

      // Transaction creation
      createTransaction: [
        this.commonRules.amount,
        this.commonRules.currency,
        body('recipientEmail')
          .isEmail()
          .normalizeEmail()
          .withMessage('Valid recipient email required'),
        body('description')
          .optional()
          .isLength({ max: 500 })
          .withMessage('Description must be under 500 characters')
      ],

      // Account operations
      accountOperation: [
        this.commonRules.amount,
        this.commonRules.currency,
        body('operationType')
          .isIn(['deposit', 'withdraw', 'transfer'])
          .withMessage('Invalid operation type')
      ]
    };
  }

  /**
   * Validate age for registration
   */
  validateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    const age = today.getFullYear() - birthDate.getFullYear();
    
    if (age < 18) {
      throw new Error('Must be at least 18 years old');
    }
    
    if (age > 120) {
      throw new Error('Invalid date of birth');
    }
    
    return true;
  };

  /**
   * Create validation middleware for specific schema
   */
  validate(schemaName) {
    const schemas = this.getValidationSchemas();
    const schema = schemas[schemaName];
    
    if (!schema) {
      throw new Error(`Validation schema '${schemaName}' not found`);
    }
    
    return [
      ...schema,
      this.handleValidationErrors
    ];
  }
}

module.exports = new InputValidationMiddleware();