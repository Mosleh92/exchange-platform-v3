// backend/src/utils/sanitization.js
const validator = require('validator');
const DOMPurify = require('isomorphic-dompurify');

/**
 * Comprehensive Input Sanitization and Validation Utility
 * Protects against XSS, SQL injection, and other input-based attacks
 */
class SanitizationService {
    constructor() {
        this.xssOptions = {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
            ALLOWED_ATTR: [],
            KEEP_CONTENT: true
        };
    }

    /**
     * Sanitize string input against XSS
     */
    sanitizeString(input) {
        if (typeof input !== 'string') {
            return input;
        }

        // Remove potential XSS vectors
        let sanitized = DOMPurify.sanitize(input, this.xssOptions);
        
        // Additional escaping for safety
        sanitized = validator.escape(sanitized);
        
        // Remove SQL injection patterns
        sanitized = this.removeSqlInjectionPatterns(sanitized);
        
        return sanitized.trim();
    }

    /**
     * Sanitize email input
     */
    sanitizeEmail(email) {
        if (!email || typeof email !== 'string') {
            return email;
        }

        const sanitized = validator.normalizeEmail(email.toLowerCase().trim());
        return validator.isEmail(sanitized) ? sanitized : null;
    }

    /**
     * Sanitize phone number
     */
    sanitizePhone(phone) {
        if (!phone || typeof phone !== 'string') {
            return phone;
        }

        // Remove all non-digit characters except + for international format
        let sanitized = phone.replace(/[^\d+]/g, '');
        
        // Validate basic phone format
        if (validator.isMobilePhone(sanitized, 'any', { strictMode: false })) {
            return sanitized;
        }
        
        return null;
    }

    /**
     * Sanitize numeric input
     */
    sanitizeNumber(input, options = {}) {
        if (input === null || input === undefined) {
            return input;
        }

        const { min, max, decimals = 2 } = options;
        let num = parseFloat(input);
        
        if (isNaN(num)) {
            return null;
        }

        // Apply bounds
        if (min !== undefined && num < min) {
            num = min;
        }
        if (max !== undefined && num > max) {
            num = max;
        }

        // Round to specified decimals
        return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    /**
     * Sanitize financial amounts
     */
    sanitizeAmount(amount) {
        return this.sanitizeNumber(amount, { min: 0, decimals: 8 });
    }

    /**
     * Remove SQL injection patterns
     */
    removeSqlInjectionPatterns(input) {
        if (typeof input !== 'string') {
            return input;
        }

        // Common SQL injection patterns
        const sqlPatterns = [
            /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
            /(--|\#|\/\*|\*\/)/g,
            /(\bOR\b\s+\d+\s*=\s*\d+)/gi,
            /(\bAND\b\s+\d+\s*=\s*\d+)/gi,
            /(;|\||&)/g,
            /(<script|<\/script>|javascript:|vbscript:|onload=|onerror=)/gi
        ];

        let sanitized = input;
        sqlPatterns.forEach(pattern => {
            sanitized = sanitized.replace(pattern, '');
        });

        return sanitized;
    }

    /**
     * Sanitize object recursively
     */
    sanitizeObject(obj, fieldRules = {}) {
        if (!obj || typeof obj !== 'object') {
            return obj;
        }

        const sanitized = {};
        
        for (const [key, value] of Object.entries(obj)) {
            const rule = fieldRules[key] || 'string';
            
            if (Array.isArray(value)) {
                sanitized[key] = value.map(item => 
                    typeof item === 'object' ? this.sanitizeObject(item, fieldRules) : this.sanitizeByType(item, rule)
                );
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeObject(value, fieldRules);
            } else {
                sanitized[key] = this.sanitizeByType(value, rule);
            }
        }

        return sanitized;
    }

    /**
     * Sanitize value by type
     */
    sanitizeByType(value, type) {
        switch (type) {
            case 'email':
                return this.sanitizeEmail(value);
            case 'phone':
                return this.sanitizePhone(value);
            case 'number':
                return this.sanitizeNumber(value);
            case 'amount':
                return this.sanitizeAmount(value);
            case 'boolean':
                return Boolean(value);
            case 'string':
            default:
                return this.sanitizeString(value);
        }
    }

    /**
     * Validate and sanitize user input
     */
    validateAndSanitize(data, schema) {
        const errors = [];
        const sanitized = {};

        for (const [field, rules] of Object.entries(schema)) {
            const value = data[field];
            
            // Required validation
            if (rules.required && (value === undefined || value === null || value === '')) {
                errors.push({
                    field,
                    message: `${field} is required`,
                    code: 'REQUIRED'
                });
                continue;
            }

            // Skip sanitization if not required and empty
            if (!rules.required && (value === undefined || value === null || value === '')) {
                continue;
            }

            // Type validation and sanitization
            let sanitizedValue = this.sanitizeByType(value, rules.type || 'string');
            
            // Additional validations
            if (rules.minLength && sanitizedValue && sanitizedValue.length < rules.minLength) {
                errors.push({
                    field,
                    message: `${field} must be at least ${rules.minLength} characters`,
                    code: 'MIN_LENGTH'
                });
            }

            if (rules.maxLength && sanitizedValue && sanitizedValue.length > rules.maxLength) {
                errors.push({
                    field,
                    message: `${field} must not exceed ${rules.maxLength} characters`,
                    code: 'MAX_LENGTH'
                });
            }

            if (rules.pattern && sanitizedValue && !rules.pattern.test(sanitizedValue)) {
                errors.push({
                    field,
                    message: `${field} format is invalid`,
                    code: 'INVALID_FORMAT'
                });
            }

            sanitized[field] = sanitizedValue;
        }

        return {
            isValid: errors.length === 0,
            errors,
            data: sanitized
        };
    }

    /**
     * Sanitization middleware for Express
     */
    middleware(fieldRules = {}) {
        return (req, res, next) => {
            try {
                if (req.body) {
                    req.body = this.sanitizeObject(req.body, fieldRules);
                }
                
                if (req.query) {
                    req.query = this.sanitizeObject(req.query, fieldRules);
                }
                
                if (req.params) {
                    req.params = this.sanitizeObject(req.params, fieldRules);
                }
                
                next();
            } catch (error) {
                console.error('Sanitization error:', error);
                res.status(400).json({
                    success: false,
                    message: 'Invalid input data',
                    code: 'SANITIZATION_ERROR'
                });
            }
        };
    }
}

module.exports = new SanitizationService();