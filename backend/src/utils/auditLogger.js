const logger = require('./logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Advanced audit logging system with comprehensive tracking
 */
class AuditLogger {
  constructor() {
    this.requestContext = new Map();
  }

  /**
   * Create audit log entry with comprehensive metadata
   * 
   * @param {Object} params - Audit log parameters
   * @param {string} params.action - Action performed
   * @param {string} params.resource - Resource affected
   * @param {string} params.tenantId - Tenant identifier
   * @param {string} params.userId - User identifier
   * @param {Object} params.payload - Request payload
   * @param {Object} params.result - Operation result
   * @param {string} params.ip - Client IP address
   * @param {string} params.userAgent - User agent string
   * @param {number} params.duration - Operation duration in ms
   * @param {string} params.status - Operation status (SUCCESS/FAILURE)
   * @param {string} params.errorMessage - Error message if failed
   * @param {Object} params.metadata - Additional metadata
   */
  async logAuditEvent({
    action,
    resource,
    tenantId,
    userId,
    payload = {},
    result = {},
    ip,
    userAgent,
    duration,
    status = 'SUCCESS',
    errorMessage,
    metadata = {}
  }) {
    try {
      const auditEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        action,
        resource,
        tenant_id: tenantId,
        user_id: userId,
        ip_address: ip,
        user_agent: userAgent,
        request_size: this.calculatePayloadSize(payload),
        response_size: this.calculatePayloadSize(result),
        duration_ms: duration,
        status,
        error_message: errorMessage,
        payload: this.sanitizePayload(payload),
        result: this.sanitizeResult(result),
        metadata: {
          ...metadata,
          session_id: this.getSessionId(),
          request_id: this.getRequestId(),
          api_version: this.getApiVersion(),
          environment: process.env.NODE_ENV
        }
      };

      // Log to database
      await this.saveToDatabase(auditEntry);
      
      // Log to console for development
      if (process.env.NODE_ENV === 'development') {
        this.logToConsole(auditEntry);
      }

      // Log to external monitoring service
      await this.logToMonitoringService(auditEntry);

    } catch (error) {
      logger.error('Failed to create audit log entry:', error);
    }
  }

  /**
   * Calculate payload size in bytes
   */
  calculatePayloadSize(payload) {
    try {
      return Buffer.byteLength(JSON.stringify(payload), 'utf8');
    } catch (error) {
      return 0;
    }
  }

  /**
   * Sanitize payload for logging (remove sensitive data)
   */
  sanitizePayload(payload) {
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    const sanitized = { ...payload };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Sanitize result for logging
   */
  sanitizeResult(result) {
    // Remove sensitive data from results
    const sensitiveFields = ['token', 'secret', 'key'];
    const sanitized = { ...result };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Get session ID from request context
   */
  getSessionId() {
    return this.requestContext.get('sessionId') || 'unknown';
  }

  /**
   * Get request ID from request context
   */
  getRequestId() {
    return this.requestContext.get('requestId') || uuidv4();
  }

  /**
   * Get API version
   */
  getApiVersion() {
    return process.env.API_VERSION || 'v1';
  }

  /**
   * Save audit entry to database
   */
  async saveToDatabase(auditEntry) {
    try {
      const db = require('../config/database');
      const query = `
        INSERT INTO audit_logs (
          id, timestamp, action, resource, tenant_id, user_id,
          ip_address, user_agent, request_size, response_size,
          duration_ms, status, error_message, payload, result, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `;

      const values = [
        auditEntry.id,
        auditEntry.timestamp,
        auditEntry.action,
        auditEntry.resource,
        auditEntry.tenant_id,
        auditEntry.user_id,
        auditEntry.ip_address,
        auditEntry.user_agent,
        auditEntry.request_size,
        auditEntry.response_size,
        auditEntry.duration_ms,
        auditEntry.status,
        auditEntry.error_message,
        JSON.stringify(auditEntry.payload),
        JSON.stringify(auditEntry.result),
        JSON.stringify(auditEntry.metadata)
      ];

      await db.query(query, values);
    } catch (error) {
      logger.error('Failed to save audit log to database:', error);
    }
  }

  /**
   * Log to console for development
   */
  logToConsole(auditEntry) {
    const logMessage = {
      type: 'AUDIT_LOG',
      action: auditEntry.action,
      resource: auditEntry.resource,
      tenant: auditEntry.tenant_id,
      user: auditEntry.user_id,
      ip: auditEntry.ip_address,
      duration: `${auditEntry.duration_ms}ms`,
      status: auditEntry.status,
      size: `${auditEntry.request_size}/${auditEntry.response_size} bytes`
    };

    if (auditEntry.status === 'SUCCESS') {
      logger.info('Audit Log:', logMessage);
    } else {
      logger.error('Audit Log (FAILURE):', logMessage);
    }
  }

  /**
   * Log to external monitoring service
   */
  async logToMonitoringService(auditEntry) {
    try {
      if (process.env.MONITORING_ENDPOINT) {
        await fetch(process.env.MONITORING_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.MONITORING_API_KEY}`
          },
          body: JSON.stringify(auditEntry)
        });
      }
    } catch (error) {
      logger.error('Failed to send audit log to monitoring service:', error);
    }
  }

  /**
   * Set request context for audit logging
   */
  setRequestContext(key, value) {
    this.requestContext.set(key, value);
  }

  /**
   * Clear request context
   */
  clearRequestContext() {
    this.requestContext.clear();
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(filters = {}) {
    try {
      const db = require('../config/database');
      let query = 'SELECT * FROM audit_logs WHERE 1=1';
      const values = [];
      let paramIndex = 1;

      if (filters.tenantId) {
        query += ` AND tenant_id = $${paramIndex++}`;
        values.push(filters.tenantId);
      }

      if (filters.userId) {
        query += ` AND user_id = $${paramIndex++}`;
        values.push(filters.userId);
      }

      if (filters.action) {
        query += ` AND action = $${paramIndex++}`;
        values.push(filters.action);
      }

      if (filters.resource) {
        query += ` AND resource = $${paramIndex++}`;
        values.push(filters.resource);
      }

      if (filters.status) {
        query += ` AND status = $${paramIndex++}`;
        values.push(filters.status);
      }

      if (filters.startDate) {
        query += ` AND timestamp >= $${paramIndex++}`;
        values.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND timestamp <= $${paramIndex++}`;
        values.push(filters.endDate);
      }

      query += ' ORDER BY timestamp DESC';

      if (filters.limit) {
        query += ` LIMIT $${paramIndex++}`;
        values.push(filters.limit);
      }

      const result = await db.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get audit logs:', error);
      return [];
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(tenantId, period = '30d') {
    try {
      const db = require('../config/database');
      const query = `
        SELECT 
          action,
          status,
          COUNT(*) as count,
          AVG(duration_ms) as avg_duration,
          AVG(request_size) as avg_request_size,
          AVG(response_size) as avg_response_size
        FROM audit_logs 
        WHERE tenant_id = $1 
        AND timestamp >= NOW() - INTERVAL '${period}'
        GROUP BY action, status
        ORDER BY count DESC
      `;

      const result = await db.query(query, [tenantId]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get audit statistics:', error);
      return [];
    }
  }

  /**
   * Clean old audit logs
   */
  async cleanOldAuditLogs(daysToKeep = 90) {
    try {
      const db = require('../config/database');
      const query = `
        DELETE FROM audit_logs 
        WHERE timestamp < NOW() - INTERVAL '${daysToKeep} days'
      `;

      const result = await db.query(query);
      logger.info(`Cleaned ${result.rowCount} old audit log entries`);
      return result.rowCount;
    } catch (error) {
      logger.error('Failed to clean old audit logs:', error);
      return 0;
    }
  }
}

// Singleton instance
const auditLogger = new AuditLogger();

module.exports = auditLogger; 