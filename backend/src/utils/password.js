const bcrypt = require('bcrypt');
const logger = require('./logger');

// Password hashing configuration
const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 * @param {string} password - The password to hash
 * @returns {Promise<string>} The hashed password
 */
const hashPassword = async (password) => {
    try {
        const salt = await bcrypt.genSalt(SALT_ROUNDS);
        return await bcrypt.hash(password, salt);
    } catch (error) {
        logger.error('Password hashing error:', error);
        throw new Error('خطا در رمزنگاری رمز عبور');
    }
};

/**
 * Compare a password with a hash
 * @param {string} password - The password to compare
 * @param {string} hash - The hash to compare against
 * @returns {Promise<boolean>} Whether the password matches the hash
 */
const comparePassword = async (password, hash) => {
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        logger.error('Password comparison error:', error);
        throw new Error('خطا در بررسی رمز عبور');
    }
};

/**
 * Validate password strength
 * @param {string} password - The password to validate
 * @returns {Object} Validation result with isValid and message
 */
const validatePasswordStrength = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
        return {
            isValid: false,
            message: 'رمز عبور باید حداقل 8 کاراکتر باشد'
        };
    }

    if (!hasUpperCase) {
        return {
            isValid: false,
            message: 'رمز عبور باید شامل حروف بزرگ باشد'
        };
    }

    if (!hasLowerCase) {
        return {
            isValid: false,
            message: 'رمز عبور باید شامل حروف کوچک باشد'
        };
    }

    if (!hasNumbers) {
        return {
            isValid: false,
            message: 'رمز عبور باید شامل اعداد باشد'
        };
    }

    if (!hasSpecialChar) {
        return {
            isValid: false,
            message: 'رمز عبور باید شامل کاراکترهای خاص باشد'
        };
    }

    return {
        isValid: true,
        message: 'رمز عبور معتبر است'
    };
};

module.exports = {
    hashPassword,
    comparePassword,
    validatePasswordStrength
}; 