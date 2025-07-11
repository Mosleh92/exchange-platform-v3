// services/encryptionService.js - AES-256 Encryption for Sensitive Data
const crypto = require('crypto');
const logger = require('../utils/logger');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.tagLength = 16; // 128 bits
    this.saltLength = 64; // 512 bits
  }

  /**
   * Get encryption key from environment or generate one
   * @param {string} keyName - Name of the key (for key rotation)
   * @returns {Buffer} - Encryption key
   */
  getEncryptionKey(keyName = 'default') {
    const envKey = process.env[`ENCRYPTION_KEY_${keyName.toUpperCase()}`] || process.env.ENCRYPTION_KEY;
    
    if (!envKey) {
      throw new Error(`Encryption key not found: ${keyName}`);
    }

    // If key is base64 encoded
    if (envKey.length === 44 && envKey.endsWith('=')) {
      return Buffer.from(envKey, 'base64');
    }

    // If key is hex encoded
    if (envKey.length === 64) {
      return Buffer.from(envKey, 'hex');
    }

    // Generate key from string using PBKDF2
    const salt = Buffer.from('exchange-platform-v3-salt', 'utf8');
    return crypto.pbkdf2Sync(envKey, salt, 100000, this.keyLength, 'sha256');
  }

  /**
   * Encrypt sensitive data
   * @param {string} plaintext - Data to encrypt
   * @param {string} keyName - Key identifier for key rotation
   * @returns {Object} - Encrypted data with metadata
   */
  encrypt(plaintext, keyName = 'default') {
    try {
      if (!plaintext) {
        throw new Error('No data provided for encryption');
      }

      const key = this.getEncryptionKey(keyName);
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, key);
      cipher.setAAD(Buffer.from('exchange-platform-v3', 'utf8'));

      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      const authTag = cipher.getAuthTag();

      const result = {
        encrypted,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        keyName,
        algorithm: this.algorithm,
        timestamp: Date.now()
      };

      logger.debug('Data encrypted successfully', {
        keyName,
        dataLength: plaintext.length,
        algorithm: this.algorithm
      });

      return result;
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive data
   * @param {Object} encryptedData - Encrypted data with metadata
   * @returns {string} - Decrypted plaintext
   */
  decrypt(encryptedData) {
    try {
      if (!encryptedData || typeof encryptedData !== 'object') {
        throw new Error('Invalid encrypted data format');
      }

      const { encrypted, iv, authTag, keyName = 'default', algorithm } = encryptedData;

      if (!encrypted || !iv || !authTag) {
        throw new Error('Missing required encryption components');
      }

      // Verify algorithm compatibility
      if (algorithm && algorithm !== this.algorithm) {
        logger.warn('Algorithm mismatch during decryption', {
          expected: this.algorithm,
          provided: algorithm
        });
      }

      const key = this.getEncryptionKey(keyName);
      const decipher = crypto.createDecipher(this.algorithm, key);
      
      decipher.setAAD(Buffer.from('exchange-platform-v3', 'utf8'));
      decipher.setAuthTag(Buffer.from(authTag, 'base64'));

      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      logger.debug('Data decrypted successfully', {
        keyName,
        algorithm: algorithm || this.algorithm
      });

      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt personal information (PII)
   * @param {Object} personalInfo - Personal information object
   * @returns {Object} - Encrypted personal information
   */
  encryptPersonalInfo(personalInfo) {
    const encryptedInfo = {};
    const sensitiveFields = [
      'firstName', 'lastName', 'phone', 'dateOfBirth',
      'address', 'nationalId', 'passportNumber', 'bankAccount'
    ];

    for (const [key, value] of Object.entries(personalInfo)) {
      if (sensitiveFields.includes(key) && value) {
        if (typeof value === 'object') {
          encryptedInfo[key] = this.encryptObject(value, 'personal');
        } else {
          encryptedInfo[key] = this.encrypt(String(value), 'personal');
        }
      } else {
        encryptedInfo[key] = value; // Non-sensitive data remains as is
      }
    }

    return encryptedInfo;
  }

  /**
   * Decrypt personal information (PII)
   * @param {Object} encryptedPersonalInfo - Encrypted personal information
   * @returns {Object} - Decrypted personal information
   */
  decryptPersonalInfo(encryptedPersonalInfo) {
    const decryptedInfo = {};

    for (const [key, value] of Object.entries(encryptedPersonalInfo)) {
      if (value && typeof value === 'object' && value.encrypted) {
        if (value.isObject) {
          decryptedInfo[key] = this.decryptObject(value);
        } else {
          decryptedInfo[key] = this.decrypt(value);
        }
      } else {
        decryptedInfo[key] = value; // Non-encrypted data
      }
    }

    return decryptedInfo;
  }

  /**
   * Encrypt financial data
   * @param {Object} financialData - Financial information
   * @returns {Object} - Encrypted financial data
   */
  encryptFinancialData(financialData) {
    const encryptedData = {};
    const sensitiveFields = [
      'accountNumber', 'routingNumber', 'iban', 'swiftCode',
      'cardNumber', 'cvv', 'balance', 'creditLimit'
    ];

    for (const [key, value] of Object.entries(financialData)) {
      if (sensitiveFields.includes(key) && value !== null && value !== undefined) {
        encryptedData[key] = this.encrypt(String(value), 'financial');
      } else {
        encryptedData[key] = value;
      }
    }

    return encryptedData;
  }

  /**
   * Decrypt financial data
   * @param {Object} encryptedFinancialData - Encrypted financial data
   * @returns {Object} - Decrypted financial data
   */
  decryptFinancialData(encryptedFinancialData) {
    const decryptedData = {};

    for (const [key, value] of Object.entries(encryptedFinancialData)) {
      if (value && typeof value === 'object' && value.encrypted) {
        decryptedData[key] = this.decrypt(value);
      } else {
        decryptedData[key] = value;
      }
    }

    return decryptedData;
  }

  /**
   * Encrypt API keys and secrets
   * @param {Object} apiData - API keys and secrets
   * @returns {Object} - Encrypted API data
   */
  encryptApiKeys(apiData) {
    const encryptedData = {};
    const sensitiveFields = ['key', 'secret', 'token', 'privateKey', 'password'];

    for (const [key, value] of Object.entries(apiData)) {
      if (sensitiveFields.includes(key) && value) {
        encryptedData[key] = this.encrypt(String(value), 'api');
      } else {
        encryptedData[key] = value;
      }
    }

    return encryptedData;
  }

  /**
   * Decrypt API keys and secrets
   * @param {Object} encryptedApiData - Encrypted API data
   * @returns {Object} - Decrypted API data
   */
  decryptApiKeys(encryptedApiData) {
    const decryptedData = {};

    for (const [key, value] of Object.entries(encryptedApiData)) {
      if (value && typeof value === 'object' && value.encrypted) {
        decryptedData[key] = this.decrypt(value);
      } else {
        decryptedData[key] = value;
      }
    }

    return decryptedData;
  }

  /**
   * Encrypt complex objects
   * @param {Object} obj - Object to encrypt
   * @param {string} keyName - Key identifier
   * @returns {Object} - Encrypted object metadata
   */
  encryptObject(obj, keyName = 'default') {
    const serialized = JSON.stringify(obj);
    const encrypted = this.encrypt(serialized, keyName);
    return {
      ...encrypted,
      isObject: true
    };
  }

  /**
   * Decrypt complex objects
   * @param {Object} encryptedObj - Encrypted object metadata
   * @returns {Object} - Decrypted object
   */
  decryptObject(encryptedObj) {
    const decryptedString = this.decrypt(encryptedObj);
    return JSON.parse(decryptedString);
  }

  /**
   * Generate a new encryption key
   * @returns {string} - Base64 encoded encryption key
   */
  generateKey() {
    const key = crypto.randomBytes(this.keyLength);
    return key.toString('base64');
  }

  /**
   * Rotate encryption keys for existing data
   * @param {Object} encryptedData - Data encrypted with old key
   * @param {string} oldKeyName - Old key identifier
   * @param {string} newKeyName - New key identifier
   * @returns {Object} - Data encrypted with new key
   */
  rotateKey(encryptedData, oldKeyName, newKeyName) {
    try {
      // Decrypt with old key
      const decrypted = this.decrypt({
        ...encryptedData,
        keyName: oldKeyName
      });

      // Encrypt with new key
      const reencrypted = this.encrypt(decrypted, newKeyName);

      logger.info('Key rotation completed', {
        oldKeyName,
        newKeyName,
        algorithm: this.algorithm
      });

      return reencrypted;
    } catch (error) {
      logger.error('Key rotation failed:', error);
      throw error;
    }
  }

  /**
   * Hash sensitive data for comparison without decryption
   * @param {string} data - Data to hash
   * @param {string} salt - Optional salt
   * @returns {string} - Hashed data
   */
  hashData(data, salt = 'exchange-platform-v3') {
    return crypto.createHash('sha256')
      .update(data + salt)
      .digest('hex');
  }

  /**
   * Verify encrypted data integrity
   * @param {Object} encryptedData - Encrypted data to verify
   * @returns {boolean} - True if data is valid
   */
  verifyIntegrity(encryptedData) {
    try {
      this.decrypt(encryptedData);
      return true;
    } catch (error) {
      logger.warn('Data integrity check failed:', error.message);
      return false;
    }
  }

  /**
   * Secure delete - overwrite sensitive data in memory
   * @param {Buffer|string} data - Data to securely delete
   */
  secureDelete(data) {
    if (Buffer.isBuffer(data)) {
      data.fill(0);
    }
    // For strings, we can't actually overwrite them in JavaScript
    // This is more of a placeholder for best practices documentation
  }
}

// Singleton instance
const encryptionService = new EncryptionService();

module.exports = encryptionService;