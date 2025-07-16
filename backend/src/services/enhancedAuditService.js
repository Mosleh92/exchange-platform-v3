const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * Enhanced Audit Service
 * Comprehensive audit logging for security and compliance
 */
class EnhancedAuditService {
  constructor() {
    this.eventTypes = {
      // Authentication events
      LOGIN_SUCCESS: 'LOGIN_SUCCESS',
      LOGIN_FAILED: 'LOGIN_FAILED',
      LOGOUT: 'LOGOUT',
      PASSWORD_CHANGE: 'PASSWORD_CHANGE',
      PASSWORD_RESET: 'PASSWORD_RESET',
      
      // Authorization events
      ACCESS_DENIED: 'ACCESS_DENIED',
      PERMISSION_VIOLATION: 'PERMISSION_VIOLATION',
      TENANT_ACCESS_VIOLATION: 'TENANT_ACCESS_VIOLATION',
      
      // Financial events
      TRANSACTION_CREATED: 'TRANSACTION_CREATED',
      TRANSACTION_MODIFIED: 'TRANSACTION_MODIFIED',
      TRANSACTION_DELETED: 'TRANSACTION_DELETED',
      BALANCE_CHANGED: 'BALANCE_CHANGED',
      ACCOUNT_CREATED: 'ACCOUNT_CREATED',
      ACCOUNT_MODIFIED: 'ACCOUNT_MODIFIED',
      
      // P2P events
      P2P_TRANSACTION_CREATED: 'P2P_TRANSACTION_CREATED',
      P2P_PAYMENT_ADDED: 'P2P_PAYMENT_ADDED',
      P2P_PAYMENT_CONFIRMED: 'P2P_PAYMENT_CONFIRMED',
      P2P_TRANSACTION_CANCELLED: 'P2P_TRANSACTION_CANCELLED',
      
      // Administrative events
      USER_CREATED: 'USER_CREATED',
      USER_MODIFIED: 'USER_MODIFIED',
      USER_DELETED: 'USER_DELETED',
      TENANT_CREATED: 'TENANT_CREATED',
      TENANT_MODIFIED: 'TENANT_MODIFIED',
      TENANT_DELETED: 'TENANT_DELETED',
      
      // Security events
      SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
      RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
      CSRF_VIOLATION: 'CSRF_VIOLATION',
      SQL_INJECTION_ATTEMPT: 'SQL_INJECTION_ATTEMPT',
      XSS_ATTEMPT: 'XSS_ATTEMPT',
      
      // System events
      SYSTEM_ERROR: 'SYSTEM_ERROR',
      DATABASE_ERROR: 'DATABASE_ERROR',
      EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR'
    };

    this.severityLevels = {
      LOW: 'LOW',
      MEDIUM: 'MEDIUM',
      HIGH: 'HIGH',
      CRITICAL: 'CRITICAL'
    };
  }

  /**
   * Log audit event
   */
  async logEvent(eventData) {
    try {
      const {
        eventType,
        userId,
        tenantId,
        action,
        resource,
        resourceId,
        details,
        severity = 'MEDIUM',
        ipAddress,
        userAgent,
        sessionId,
        requestId
      } = eventData;

      const auditLog = new AuditLog({
        eventType,
        userId,
        tenantId,
        action,
        resource,
        resourceId,
        details,
        severity,
        ipAddress,
        userAgent,
        sessionId,
        requestId,
        timestamp: new Date()
      });

      await auditLog.save();

      // Log to console for development
      if (process.env.NODE_ENV === 'development') {
        logger.info('Audit event logged', {
          eventType,
          userId,
          tenantId,
          action,
          severity
        });
      }

      // Send critical events to monitoring
      if (severity === 'CRITICAL' || severity === 'HIGH') {
        await this.sendToMonitoring(auditLog);
      }

      return auditLog;
    } catch (error) {
      logger.error('Audit logging error:', error);
      throw error;
    }
  }

  /**
   * Log authentication events
   */
  async logAuthenticationEvent(eventType, userData, requestData) {
    const { userId, tenantId, email } = userData;
    const { ipAddress, userAgent, sessionId } = requestData;

    await this.logEvent({
      eventType,
      userId,
      tenantId,
      action: 'AUTHENTICATION',
      resource: 'USER',
      resourceId: userId,
      details: {
        email,
        success: eventType === 'LOGIN_SUCCESS',
        ipAddress,
        userAgent
      },
      severity: eventType === 'LOGIN_FAILED' ? 'MEDIUM' : 'LOW',
      ipAddress,
      userAgent,
      sessionId
    });
  }

  /**
   * Log authorization events
   */
  async logAuthorizationEvent(eventType, userData, requestData, resourceData) {
    const { userId, tenantId } = userData;
    const { ipAddress, userAgent } = requestData;
    const { resource, resourceId, requiredPermissions } = resourceData;

    await this.logEvent({
      eventType,
      userId,
      tenantId,
      action: 'AUTHORIZATION',
      resource,
      resourceId,
      details: {
        requiredPermissions,
        violation: eventType !== 'ACCESS_GRANTED'
      },
      severity: eventType === 'ACCESS_DENIED' ? 'HIGH' : 'MEDIUM',
      ipAddress,
      userAgent
    });
  }

  /**
   * Log financial events
   */
  async logFinancialEvent(eventType, userData, transactionData) {
    const { userId, tenantId } = userData;
    const { transactionId, amount, currency, transactionType } = transactionData;

    await this.logEvent({
      eventType,
      userId,
      tenantId,
      action: 'FINANCIAL',
      resource: 'TRANSACTION',
      resourceId: transactionId,
      details: {
        amount,
        currency,
        transactionType,
        timestamp: new Date()
      },
      severity: 'HIGH',
      ipAddress: transactionData.ipAddress,
      userAgent: transactionData.userAgent
    });
  }

  /**
   * Log P2P events
   */
  async logP2PEvent(eventType, userData, p2pData) {
    const { userId, tenantId } = userData;
    const { transactionId, sellerId, buyerId, amount, currency } = p2pData;

    await this.logEvent({
      eventType,
      userId,
      tenantId,
      action: 'P2P_TRANSACTION',
      resource: 'P2P_TRANSACTION',
      resourceId: transactionId,
      details: {
        sellerId,
        buyerId,
        amount,
        currency,
        timestamp: new Date()
      },
      severity: 'HIGH',
      ipAddress: p2pData.ipAddress,
      userAgent: p2pData.userAgent
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(eventType, requestData, details) {
    const { ipAddress, userAgent, sessionId } = requestData;

    await this.logEvent({
      eventType,
      userId: null,
      tenantId: null,
      action: 'SECURITY',
      resource: 'SYSTEM',
      resourceId: null,
      details: {
        ...details,
        timestamp: new Date()
      },
      severity: 'CRITICAL',
      ipAddress,
      userAgent,
      sessionId
    });
  }

  /**
   * Log administrative events
   */
  async logAdministrativeEvent(eventType, adminData, targetData) {
    const { userId, tenantId } = adminData;
    const { resource, resourceId, changes } = targetData;

    await this.logEvent({
      eventType,
      userId,
      tenantId,
      action: 'ADMINISTRATIVE',
      resource,
      resourceId,
      details: {
        changes,
        timestamp: new Date()
      },
      severity: 'HIGH',
      ipAddress: adminData.ipAddress,
      userAgent: adminData.userAgent
    });
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(filters = {}) {
    try {
      const {
        userId,
        tenantId,
        eventType,
        severity,
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = filters;

      const query = {};

      if (userId) query.userId = userId;
      if (tenantId) query.tenantId = tenantId;
      if (eventType) query.eventType = eventType;
      if (severity) query.severity = severity;
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;

      const logs = await AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'email name')
        .populate('tenantId', 'name');

      const total = await AuditLog.countDocuments(query);

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Get audit logs error:', error);
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(tenantId, startDate, endDate) {
    try {
      const query = {
        timestamp: { $gte: new Date(startDate), $lte: new Date(endDate) }
      };

      if (tenantId) query.tenantId = tenantId;

      const stats = await AuditLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              eventType: '$eventType',
              severity: '$severity'
            },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.eventType',
            severities: {
              $push: {
                severity: '$_id.severity',
                count: '$count'
              }
            },
            totalCount: { $sum: '$count' }
          }
        }
      ]);

      return stats;
    } catch (error) {
      logger.error('Get audit statistics error:', error);
      throw error;
    }
  }

  /**
   * Detect suspicious activities
   */
  async detectSuspiciousActivities(tenantId) {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // Check for multiple failed login attempts
      const failedLogins = await AuditLog.find({
        eventType: 'LOGIN_FAILED',
        tenantId,
        timestamp: { $gte: oneHourAgo }
      });

      const failedLoginsByIP = {};
      failedLogins.forEach(log => {
        const ip = log.ipAddress;
        failedLoginsByIP[ip] = (failedLoginsByIP[ip] || 0) + 1;
      });

      // Check for unusual financial activities
      const financialEvents = await AuditLog.find({
        eventType: { $in: ['TRANSACTION_CREATED', 'BALANCE_CHANGED'] },
        tenantId,
        timestamp: { $gte: oneHourAgo }
      });

      const financialEventsByUser = {};
      financialEvents.forEach(log => {
        const userId = log.userId;
        financialEventsByUser[userId] = (financialEventsByUser[userId] || 0) + 1;
      });

      // Generate alerts for suspicious activities
      const alerts = [];

      Object.entries(failedLoginsByIP).forEach(([ip, count]) => {
        if (count > 5) {
          alerts.push({
            type: 'MULTIPLE_FAILED_LOGINS',
            severity: 'HIGH',
            details: { ip, count },
            timestamp: new Date()
          });
        }
      });

      Object.entries(financialEventsByUser).forEach(([userId, count]) => {
        if (count > 10) {
          alerts.push({
            type: 'UNUSUAL_FINANCIAL_ACTIVITY',
            severity: 'MEDIUM',
            details: { userId, count },
            timestamp: new Date()
          });
        }
      });

      return alerts;
    } catch (error) {
      logger.error('Detect suspicious activities error:', error);
      throw error;
    }
  }

  /**
   * Send critical events to monitoring
   */
  async sendToMonitoring(auditLog) {
    try {
      // This would integrate with your monitoring system
      // For now, we'll just log it
      logger.warn('Critical audit event detected', {
        eventType: auditLog.eventType,
        severity: auditLog.severity,
        userId: auditLog.userId,
        tenantId: auditLog.tenantId,
        details: auditLog.details
      });

      // You could send to external monitoring services here
      // await monitoringService.sendAlert(auditLog);
    } catch (error) {
      logger.error('Send to monitoring error:', error);
    }
  }

  /**
   * Export audit logs
   */
  async exportAuditLogs(filters = {}, format = 'json') {
    try {
      const { logs } = await this.getAuditLogs({ ...filters, limit: 10000 });

      if (format === 'csv') {
        return this.convertToCSV(logs);
      }

      return logs;
    } catch (error) {
      logger.error('Export audit logs error:', error);
      throw error;
    }
  }

  /**
   * Convert logs to CSV format
   */
  convertToCSV(logs) {
    const headers = [
      'Timestamp',
      'Event Type',
      'User ID',
      'Tenant ID',
      'Action',
      'Resource',
      'Resource ID',
      'Severity',
      'IP Address',
      'Details'
    ];

    const rows = logs.map(log => [
      log.timestamp,
      log.eventType,
      log.userId,
      log.tenantId,
      log.action,
      log.resource,
      log.resourceId,
      log.severity,
      log.ipAddress,
      JSON.stringify(log.details)
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * Clean up old audit logs
   */
  async cleanupOldLogs(retentionDays = 90) {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      const result = await AuditLog.deleteMany({
        timestamp: { $lt: cutoffDate },
        severity: { $ne: 'CRITICAL' } // Keep critical logs longer
      });

      logger.info(`Cleaned up ${result.deletedCount} old audit logs`);
      return result.deletedCount;
    } catch (error) {
      logger.error('Cleanup old logs error:', error);
      throw error;
    }
  }
}

module.exports = new EnhancedAuditService(); 