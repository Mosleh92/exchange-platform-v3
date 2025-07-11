const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Activity Logging Service
 * Comprehensive logging system for user activities and system events
 */
class ActivityLoggerService {
  constructor() {
    this.ActivityLog = require('../models/ActivityLog');
    this.logLevels = {
      INFO: 'info',
      WARN: 'warn',
      ERROR: 'error',
      SECURITY: 'security',
      AUDIT: 'audit'
    };
    
    this.activityTypes = {
      // Authentication activities
      LOGIN: 'login',
      LOGOUT: 'logout',
      FAILED_LOGIN: 'failed_login',
      PASSWORD_CHANGE: 'password_change',
      PASSWORD_RESET: 'password_reset',
      TWO_FA_ENABLED: '2fa_enabled',
      TWO_FA_DISABLED: '2fa_disabled',
      
      // Transaction activities
      TRANSACTION_CREATED: 'transaction_created',
      TRANSACTION_UPDATED: 'transaction_updated',
      TRANSACTION_APPROVED: 'transaction_approved',
      TRANSACTION_REJECTED: 'transaction_rejected',
      TRANSACTION_CANCELLED: 'transaction_cancelled',
      
      // User management activities
      USER_CREATED: 'user_created',
      USER_UPDATED: 'user_updated',
      USER_DELETED: 'user_deleted',
      USER_ACTIVATED: 'user_activated',
      USER_DEACTIVATED: 'user_deactivated',
      ROLE_CHANGED: 'role_changed',
      PERMISSIONS_UPDATED: 'permissions_updated',
      
      // System activities
      SETTINGS_UPDATED: 'settings_updated',
      BACKUP_CREATED: 'backup_created',
      SYSTEM_MAINTENANCE: 'system_maintenance',
      
      // Security activities
      SUSPICIOUS_ACTIVITY: 'suspicious_activity',
      FAILED_AUTHORIZATION: 'failed_authorization',
      SECURITY_VIOLATION: 'security_violation',
      
      // Business activities
      EXCHANGE_RATE_UPDATED: 'exchange_rate_updated',
      COMMISSION_UPDATED: 'commission_updated',
      REPORT_GENERATED: 'report_generated'
    };
  }

  /**
   * Log user activity
   * @param {string} userId - User ID
   * @param {string} activityType - Type of activity
   * @param {Object} details - Activity details
   * @param {Object} context - Request context (IP, user agent, etc.)
   */
  async logActivity(userId, activityType, details = {}, context = {}) {
    try {
      const activityLog = new this.ActivityLog({
        userId,
        tenantId: details.tenantId || context.tenantId,
        branchId: details.branchId || context.branchId,
        activityType,
        level: this.determineLogLevel(activityType),
        details: {
          ...details,
          timestamp: new Date(),
          sessionId: context.sessionId,
          requestId: context.requestId
        },
        metadata: {
          ip: context.ip,
          userAgent: context.userAgent,
          location: await this.getLocationFromIP(context.ip),
          device: this.parseDevice(context.userAgent)
        },
        timestamp: new Date(),
        processed: false
      });

      await activityLog.save();

      // Trigger real-time notifications for critical activities
      if (this.isCriticalActivity(activityType)) {
        await this.handleCriticalActivity(activityLog);
      }

      logger.info('Activity logged', {
        userId,
        activityType,
        logId: activityLog._id
      });

      return activityLog;

    } catch (error) {
      logger.error('Failed to log activity', {
        userId,
        activityType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Log system event
   * @param {string} eventType - Type of system event
   * @param {Object} details - Event details
   * @param {string} level - Log level
   */
  async logSystemEvent(eventType, details = {}, level = 'info') {
    try {
      const activityLog = new this.ActivityLog({
        userId: null, // System events don't have a specific user
        tenantId: details.tenantId || null,
        branchId: details.branchId || null,
        activityType: eventType,
        level,
        details: {
          ...details,
          timestamp: new Date(),
          source: 'system'
        },
        metadata: {
          server: process.env.SERVER_ID || 'unknown',
          environment: process.env.NODE_ENV || 'development',
          version: process.env.APP_VERSION || '1.0.0'
        },
        timestamp: new Date(),
        processed: false
      });

      await activityLog.save();

      logger.info('System event logged', {
        eventType,
        level,
        logId: activityLog._id
      });

      return activityLog;

    } catch (error) {
      logger.error('Failed to log system event', {
        eventType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get activity logs with filtering and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   */
  async getActivityLogs(filters = {}, pagination = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = pagination;

      const query = this.buildFilterQuery(filters);
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const logs = await this.ActivityLog
        .find(query)
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('userId', 'firstName lastName email')
        .lean();

      const total = await this.ActivityLog.countDocuments(query);

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
      logger.error('Failed to get activity logs', {
        filters,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get activity statistics
   * @param {Object} filters - Filter criteria
   */
  async getActivityStatistics(filters = {}) {
    try {
      const query = this.buildFilterQuery(filters);

      // Activity count by type
      const activityByType = await this.ActivityLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$activityType',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Activity count by user
      const activityByUser = await this.ActivityLog.aggregate([
        { $match: { ...query, userId: { $ne: null } } },
        {
          $group: {
            _id: '$userId',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        }
      ]);

      // Activity count by hour (last 24 hours)
      const hoursAgo24 = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const activityByHour = await this.ActivityLog.aggregate([
        {
          $match: {
            ...query,
            timestamp: { $gte: hoursAgo24 }
          }
        },
        {
          $group: {
            _id: {
              hour: { $hour: '$timestamp' },
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1, '_id.hour': 1 } }
      ]);

      // Security events count
      const securityEvents = await this.ActivityLog.countDocuments({
        ...query,
        level: 'security'
      });

      return {
        total: await this.ActivityLog.countDocuments(query),
        activityByType,
        activityByUser,
        activityByHour,
        securityEvents
      };

    } catch (error) {
      logger.error('Failed to get activity statistics', {
        filters,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Export activity logs
   * @param {Object} filters - Filter criteria
   * @param {string} format - Export format (csv, json)
   */
  async exportActivityLogs(filters = {}, format = 'csv') {
    try {
      const query = this.buildFilterQuery(filters);
      
      const logs = await this.ActivityLog
        .find(query)
        .populate('userId', 'firstName lastName email')
        .sort({ timestamp: -1 })
        .lean();

      if (format === 'csv') {
        return this.generateCSV(logs);
      } else if (format === 'json') {
        return JSON.stringify(logs, null, 2);
      } else {
        throw new Error('Unsupported export format');
      }

    } catch (error) {
      logger.error('Failed to export activity logs', {
        filters,
        format,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Clean up old logs
   * @param {number} retentionDays - Number of days to retain logs
   */
  async cleanupOldLogs(retentionDays = 90) {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      
      const result = await this.ActivityLog.deleteMany({
        timestamp: { $lt: cutoffDate },
        level: { $nin: ['security', 'audit'] } // Keep security and audit logs longer
      });

      logger.info('Old activity logs cleaned up', {
        retentionDays,
        deletedCount: result.deletedCount
      });

      return result.deletedCount;

    } catch (error) {
      logger.error('Failed to cleanup old logs', {
        retentionDays,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Build MongoDB query from filters
   */
  buildFilterQuery(filters) {
    const query = {};

    if (filters.userId) query.userId = filters.userId;
    if (filters.tenantId) query.tenantId = filters.tenantId;
    if (filters.branchId) query.branchId = filters.branchId;
    if (filters.activityType) query.activityType = filters.activityType;
    if (filters.level) query.level = filters.level;

    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
      if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
    }

    if (filters.ip) query['metadata.ip'] = filters.ip;

    return query;
  }

  /**
   * Determine log level based on activity type
   */
  determineLogLevel(activityType) {
    const securityActivities = [
      'failed_login', 'suspicious_activity', 'failed_authorization', 
      'security_violation', '2fa_disabled'
    ];
    
    const auditActivities = [
      'user_created', 'user_deleted', 'role_changed', 'permissions_updated',
      'settings_updated', 'exchange_rate_updated', 'commission_updated'
    ];

    if (securityActivities.includes(activityType)) {
      return this.logLevels.SECURITY;
    } else if (auditActivities.includes(activityType)) {
      return this.logLevels.AUDIT;
    } else {
      return this.logLevels.INFO;
    }
  }

  /**
   * Check if activity is critical
   */
  isCriticalActivity(activityType) {
    const criticalActivities = [
      'failed_login', 'suspicious_activity', 'security_violation',
      'user_deleted', 'settings_updated', 'system_maintenance'
    ];
    
    return criticalActivities.includes(activityType);
  }

  /**
   * Handle critical activity (notifications, alerts, etc.)
   */
  async handleCriticalActivity(activityLog) {
    // Implement real-time notifications here
    // Could integrate with WebSocket, email notifications, etc.
    logger.warn('Critical activity detected', {
      logId: activityLog._id,
      activityType: activityLog.activityType,
      userId: activityLog.userId
    });
  }

  /**
   * Get location from IP address (mock implementation)
   */
  async getLocationFromIP(ip) {
    // In a real implementation, you would use a service like MaxMind GeoIP
    if (!ip || ip === '127.0.0.1' || ip === '::1') {
      return { country: 'Local', city: 'Local' };
    }
    
    // Mock data
    return { country: 'Unknown', city: 'Unknown' };
  }

  /**
   * Parse device information from user agent
   */
  parseDevice(userAgent) {
    if (!userAgent) return { type: 'Unknown', os: 'Unknown', browser: 'Unknown' };
    
    // Simple parsing - in production, use a library like ua-parser-js
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    const isTablet = /iPad|Tablet/.test(userAgent);
    
    return {
      type: isTablet ? 'Tablet' : (isMobile ? 'Mobile' : 'Desktop'),
      os: this.extractOS(userAgent),
      browser: this.extractBrowser(userAgent)
    };
  }

  /**
   * Extract OS from user agent
   */
  extractOS(userAgent) {
    if (/Windows/.test(userAgent)) return 'Windows';
    if (/Mac OS/.test(userAgent)) return 'macOS';
    if (/Linux/.test(userAgent)) return 'Linux';
    if (/Android/.test(userAgent)) return 'Android';
    if (/iOS/.test(userAgent)) return 'iOS';
    return 'Unknown';
  }

  /**
   * Extract browser from user agent
   */
  extractBrowser(userAgent) {
    if (/Chrome/.test(userAgent)) return 'Chrome';
    if (/Firefox/.test(userAgent)) return 'Firefox';
    if (/Safari/.test(userAgent)) return 'Safari';
    if (/Edge/.test(userAgent)) return 'Edge';
    return 'Unknown';
  }

  /**
   * Generate CSV from logs
   */
  generateCSV(logs) {
    const headers = [
      'Timestamp', 'User', 'Activity Type', 'Level', 'IP', 'User Agent', 'Details'
    ];
    
    const rows = logs.map(log => [
      log.timestamp.toISOString(),
      log.userId ? `${log.userId.firstName} ${log.userId.lastName} (${log.userId.email})` : 'System',
      log.activityType,
      log.level,
      log.metadata?.ip || '',
      log.metadata?.userAgent || '',
      JSON.stringify(log.details)
    ]);

    return [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
  }
}

module.exports = new ActivityLoggerService();