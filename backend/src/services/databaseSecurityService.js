// backend/src/services/databaseSecurityService.js
const crypto = require('crypto');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Database Security Service
 * Provides field-level encryption, audit logging, and query validation
 */
class DatabaseSecurityService {
  constructor() {
    this.encryptionKey = process.env.DB_ENCRYPTION_KEY;
    this.algorithm = 'aes-256-gcm';
    this.auditCollection = 'audit_logs';
    
    if (!this.encryptionKey) {
      logger.warn('DB_ENCRYPTION_KEY not set, encryption features disabled');
    }

    this.sensitiveFields = [
      'ssn',
      'bankAccount',
      'creditCard',
      'phone',
      'address',
      'taxId',
      'passport',
      'driversLicense'
    ];

    this.initializeEncryption();
  }

  /**
   * Initialize encryption system
   */
  initializeEncryption() {
    if (!this.encryptionKey) {
      return;
    }

    // Derive keys for different purposes
    this.masterKey = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    this.auditKey = crypto.scryptSync(this.encryptionKey, 'audit_salt', 32);
  }

  /**
   * Encrypt sensitive field data
   */
  encryptField(data, fieldName) {
    if (!this.encryptionKey || !data) {
      return data;
    }

    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.algorithm, this.masterKey);
      cipher.setAAD(Buffer.from(fieldName, 'utf8'));

      let encrypted = cipher.update(data.toString(), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return {
        encrypted: true,
        data: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        field: fieldName
      };
    } catch (error) {
      logger.error('Field encryption failed:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt sensitive field data
   */
  decryptField(encryptedData, fieldName) {
    if (!this.encryptionKey || !encryptedData || !encryptedData.encrypted) {
      return encryptedData;
    }

    try {
      const decipher = crypto.createDecipher(this.algorithm, this.masterKey);
      decipher.setAAD(Buffer.from(fieldName, 'utf8'));
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Field decryption failed:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Process document for encryption before saving
   */
  encryptSensitiveData(document, schema = null) {
    if (!this.encryptionKey || !document) {
      return document;
    }

    const processedDoc = { ...document };

    for (const field of this.sensitiveFields) {
      if (processedDoc[field] && typeof processedDoc[field] === 'string') {
        processedDoc[field] = this.encryptField(processedDoc[field], field);
      }
    }

    // Process nested objects
    for (const [key, value] of Object.entries(processedDoc)) {
      if (value && typeof value === 'object' && !value.encrypted) {
        if (Array.isArray(value)) {
          processedDoc[key] = value.map(item => 
            typeof item === 'object' ? this.encryptSensitiveData(item) : item
          );
        } else {
          processedDoc[key] = this.encryptSensitiveData(value);
        }
      }
    }

    return processedDoc;
  }

  /**
   * Process document for decryption after loading
   */
  decryptSensitiveData(document) {
    if (!this.encryptionKey || !document) {
      return document;
    }

    const processedDoc = { ...document };

    for (const field of this.sensitiveFields) {
      if (processedDoc[field] && processedDoc[field].encrypted) {
        try {
          processedDoc[field] = this.decryptField(processedDoc[field], field);
        } catch (error) {
          logger.error(`Failed to decrypt field ${field}:`, error);
          processedDoc[field] = '[DECRYPTION_FAILED]';
        }
      }
    }

    // Process nested objects
    for (const [key, value] of Object.entries(processedDoc)) {
      if (value && typeof value === 'object' && !value.encrypted) {
        if (Array.isArray(value)) {
          processedDoc[key] = value.map(item => 
            typeof item === 'object' ? this.decryptSensitiveData(item) : item
          );
        } else {
          processedDoc[key] = this.decryptSensitiveData(value);
        }
      }
    }

    return processedDoc;
  }

  /**
   * Log database audit events
   */
  async logAuditEvent(eventData) {
    try {
      const auditRecord = {
        timestamp: new Date(),
        eventId: crypto.randomUUID(),
        eventType: eventData.eventType,
        userId: eventData.userId,
        tenantId: eventData.tenantId,
        action: eventData.action,
        resource: eventData.resource,
        resourceId: eventData.resourceId,
        details: eventData.details || {},
        ipAddress: eventData.ipAddress,
        userAgent: eventData.userAgent,
        sessionId: eventData.sessionId,
        severity: eventData.severity || 'INFO',
        
        // Add checksum for integrity
        checksum: this.generateChecksum(eventData)
      };

      // Encrypt sensitive audit data
      if (auditRecord.details && typeof auditRecord.details === 'object') {
        auditRecord.details = this.encryptAuditDetails(auditRecord.details);
      }

      // Store in audit collection
      const AuditLog = mongoose.model(this.auditCollection, new mongoose.Schema({}, { strict: false }));
      await AuditLog.create(auditRecord);

      logger.debug('Audit event logged', { eventId: auditRecord.eventId });
    } catch (error) {
      logger.error('Failed to log audit event:', error);
      // Don't throw error to avoid breaking main operation
    }
  }

  /**
   * Generate checksum for audit record integrity
   */
  generateChecksum(data) {
    if (!this.auditKey) {
      return null;
    }

    const content = JSON.stringify(data);
    return crypto
      .createHmac('sha256', this.auditKey)
      .update(content)
      .digest('hex');
  }

  /**
   * Verify audit record integrity
   */
  verifyAuditIntegrity(auditRecord) {
    if (!this.auditKey || !auditRecord.checksum) {
      return false;
    }

    const { checksum, ...recordData } = auditRecord;
    const expectedChecksum = this.generateChecksum(recordData);
    
    return checksum === expectedChecksum;
  }

  /**
   * Encrypt audit details
   */
  encryptAuditDetails(details) {
    if (!this.auditKey) {
      return details;
    }

    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-cbc', this.auditKey);
      
      let encrypted = cipher.update(JSON.stringify(details), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return {
        encrypted: true,
        data: encrypted,
        iv: iv.toString('hex')
      };
    } catch (error) {
      logger.error('Audit details encryption failed:', error);
      return details;
    }
  }

  /**
   * Decrypt audit details
   */
  decryptAuditDetails(encryptedDetails) {
    if (!this.auditKey || !encryptedDetails.encrypted) {
      return encryptedDetails;
    }

    try {
      const decipher = crypto.createDecipher('aes-256-cbc', this.auditKey);
      
      let decrypted = decipher.update(encryptedDetails.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted);
    } catch (error) {
      logger.error('Audit details decryption failed:', error);
      return '[DECRYPTION_FAILED]';
    }
  }

  /**
   * Validate database queries for security
   */
  validateQuery(query, operation = 'find') {
    const validation = {
      valid: true,
      warnings: [],
      blocked: false
    };

    // Check for potential injection patterns
    const suspiciousPatterns = [
      /\$where/i,
      /javascript:/i,
      /eval\(/i,
      /function\(/i,
      /this\./i
    ];

    const queryString = JSON.stringify(query);
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(queryString)) {
        validation.valid = false;
        validation.blocked = true;
        validation.warnings.push(`Suspicious pattern detected: ${pattern}`);
      }
    }

    // Check for overly broad queries
    if (operation === 'find' && (!query || Object.keys(query).length === 0)) {
      validation.warnings.push('Potentially broad query detected');
    }

    // Check for unindexed field queries
    const unindexedFields = ['description', 'notes', 'comments'];
    for (const field of unindexedFields) {
      if (query[field] && typeof query[field] === 'string') {
        validation.warnings.push(`Query on unindexed field: ${field}`);
      }
    }

    return validation;
  }

  /**
   * Sanitize query parameters
   */
  sanitizeQuery(query) {
    if (!query || typeof query !== 'object') {
      return query;
    }

    const sanitized = {};

    for (const [key, value] of Object.entries(query)) {
      // Remove dangerous operators
      if (key.startsWith('$') && !this.isAllowedOperator(key)) {
        logger.warn(`Blocked dangerous operator: ${key}`);
        continue;
      }

      // Sanitize string values
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' ? this.sanitizeString(item) : item
        );
      } else if (value && typeof value === 'object') {
        sanitized[key] = this.sanitizeQuery(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Check if MongoDB operator is allowed
   */
  isAllowedOperator(operator) {
    const allowedOperators = [
      '$eq', '$ne', '$gt', '$gte', '$lt', '$lte',
      '$in', '$nin', '$exists', '$type', '$regex',
      '$and', '$or', '$not', '$nor',
      '$elemMatch', '$size', '$all',
      '$set', '$unset', '$inc', '$push', '$pull'
    ];

    return allowedOperators.includes(operator);
  }

  /**
   * Sanitize string values
   */
  sanitizeString(value) {
    if (typeof value !== 'string') {
      return value;
    }

    // Remove potential script injections
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  /**
   * Monitor database performance and security
   */
  async getSecurityMetrics() {
    try {
      const metrics = {
        timestamp: new Date(),
        encryptionEnabled: !!this.encryptionKey,
        auditRecords: 0,
        suspiciousQueries: 0,
        encryptedFields: this.sensitiveFields.length
      };

      // Get audit record count
      if (mongoose.connection.readyState === 1) {
        const AuditLog = mongoose.model(this.auditCollection, new mongoose.Schema({}, { strict: false }));
        metrics.auditRecords = await AuditLog.countDocuments({
          timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });
      }

      return metrics;
    } catch (error) {
      logger.error('Failed to get security metrics:', error);
      return null;
    }
  }

  /**
   * Rotate encryption keys (for key management)
   */
  async rotateEncryptionKeys() {
    if (!this.encryptionKey) {
      throw new Error('Encryption not enabled');
    }

    logger.warn('Key rotation not implemented - requires careful migration');
    throw new Error('Key rotation requires manual intervention');
  }

  /**
   * Setup database security middleware for Mongoose
   */
  setupMongooseMiddleware() {
    if (!this.encryptionKey) {
      return;
    }

    // Pre-save middleware for encryption
    mongoose.plugin(function(schema) {
      schema.pre('save', function() {
        if (this.isNew || this.isModified()) {
          this.constructor.encryptSensitiveData(this);
        }
      });

      schema.post('findOne', function(doc) {
        if (doc) {
          this.constructor.decryptSensitiveData(doc);
        }
      });

      schema.post('find', function(docs) {
        if (docs && Array.isArray(docs)) {
          docs.forEach(doc => this.constructor.decryptSensitiveData(doc));
        }
      });
    });
  }
}

module.exports = new DatabaseSecurityService();