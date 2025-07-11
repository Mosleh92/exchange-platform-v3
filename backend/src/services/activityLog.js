const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Activity Logging Service
 * Tracks and logs all user activities and system events
 */
class ActivityLogService {
    constructor() {
        this.actionTypes = {
            'LOGIN': 'ورود',
            'LOGOUT': 'خروج',
            'CREATE_TRANSACTION': 'ایجاد معامله',
            'UPDATE_TRANSACTION': 'ویرایش معامله',
            'DELETE_TRANSACTION': 'حذف معامله',
            'CREATE_USER': 'ایجاد کاربر',
            'UPDATE_USER': 'ویرایش کاربر',
            'DELETE_USER': 'حذف کاربر',
            'CREATE_TENANT': 'ایجاد صرافی',
            'UPDATE_TENANT': 'ویرایش صرافی',
            'PAYMENT_CREATED': 'ثبت پرداخت',
            'PAYMENT_VERIFIED': 'تایید پرداخت',
            'RATE_UPDATED': 'به‌روزرسانی نرخ',
            'REPORT_GENERATED': 'تولید گزارش',
            'BACKUP_CREATED': 'ایجاد پشتیبان',
            'SYSTEM_CONFIG_CHANGED': 'تغییر تنظیمات سیستم'
        };
    }

    /**
     * Log user activity
     */
    async logActivity(userId, actionType, details = {}, req = null) {
        try {
            const ActivityLog = mongoose.model('ActivityLog');
            
            const logEntry = new ActivityLog({
                userId,
                tenantId: details.tenantId || (req && req.user ? req.user.tenantId : null),
                branchId: details.branchId || (req && req.user ? req.user.branchId : null),
                actionType,
                actionDescription: this.actionTypes[actionType] || actionType,
                details: {
                    ...details,
                    userAgent: req ? req.get('User-Agent') : null,
                    ip: req ? req.ip : null,
                    method: req ? req.method : null,
                    path: req ? req.path : null,
                    timestamp: new Date()
                },
                metadata: {
                    sessionId: req ? req.sessionID : null,
                    requestId: req ? req.headers['x-request-id'] : null
                },
                timestamp: new Date(),
                severity: this.getSeverityLevel(actionType)
            });

            await logEntry.save();

            // Log to application logger for important activities
            if (this.isImportantActivity(actionType)) {
                logger.info('Important activity logged', {
                    userId,
                    actionType,
                    actionDescription: this.actionTypes[actionType],
                    details
                });
            }

            return logEntry;

        } catch (error) {
            logger.error('Error logging activity', { 
                error: error.message,
                userId,
                actionType 
            });
            throw error;
        }
    }

    /**
     * Get activity logs with filtering
     */
    async getActivityLogs(filters = {}, options = {}) {
        try {
            const ActivityLog = mongoose.model('ActivityLog');
            
            const {
                userId,
                tenantId,
                branchId,
                actionType,
                startDate,
                endDate,
                severity,
                page = 1,
                limit = 50,
                sortBy = 'timestamp',
                sortOrder = 'desc'
            } = { ...filters, ...options };

            // Build query
            const query = {};
            
            if (userId) query.userId = userId;
            if (tenantId) query.tenantId = tenantId;
            if (branchId) query.branchId = branchId;
            if (actionType) query.actionType = actionType;
            if (severity) query.severity = severity;
            
            if (startDate || endDate) {
                query.timestamp = {};
                if (startDate) query.timestamp.$gte = new Date(startDate);
                if (endDate) query.timestamp.$lte = new Date(endDate);
            }

            // Execute query with pagination
            const skip = (page - 1) * limit;
            const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

            const [logs, total] = await Promise.all([
                ActivityLog.find(query)
                    .populate('userId', 'name username role')
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                ActivityLog.countDocuments(query)
            ]);

            return {
                logs,
                pagination: {
                    current: page,
                    pages: Math.ceil(total / limit),
                    total,
                    limit
                }
            };

        } catch (error) {
            logger.error('Error fetching activity logs', { error: error.message });
            throw error;
        }
    }

    /**
     * Get activity statistics
     */
    async getActivityStatistics(tenantId, timeframe = '30d') {
        try {
            const ActivityLog = mongoose.model('ActivityLog');
            
            const endDate = new Date();
            const startDate = new Date();
            
            // Calculate start date based on timeframe
            switch (timeframe) {
                case '24h':
                    startDate.setHours(endDate.getHours() - 24);
                    break;
                case '7d':
                    startDate.setDate(endDate.getDate() - 7);
                    break;
                case '30d':
                    startDate.setDate(endDate.getDate() - 30);
                    break;
                case '90d':
                    startDate.setDate(endDate.getDate() - 90);
                    break;
                default:
                    startDate.setDate(endDate.getDate() - 30);
            }

            const matchQuery = {
                timestamp: { $gte: startDate, $lte: endDate }
            };
            
            if (tenantId) {
                matchQuery.tenantId = new mongoose.Types.ObjectId(tenantId);
            }

            const stats = await ActivityLog.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: {
                            actionType: '$actionType',
                            date: {
                                $dateToString: {
                                    format: '%Y-%m-%d',
                                    date: '$timestamp'
                                }
                            }
                        },
                        count: { $sum: 1 }
                    }
                },
                {
                    $group: {
                        _id: '$_id.actionType',
                        actionDescription: { $first: '$_id.actionType' },
                        totalCount: { $sum: '$count' },
                        dailyStats: {
                            $push: {
                                date: '$_id.date',
                                count: '$count'
                            }
                        }
                    }
                },
                { $sort: { totalCount: -1 } }
            ]);

            // Get user activity stats
            const userStats = await ActivityLog.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: '$userId',
                        activityCount: { $sum: 1 },
                        lastActivity: { $max: '$timestamp' }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                { $unwind: '$user' },
                {
                    $project: {
                        userId: '$_id',
                        userName: '$user.name',
                        activityCount: 1,
                        lastActivity: 1
                    }
                },
                { $sort: { activityCount: -1 } },
                { $limit: 10 }
            ]);

            // Get severity distribution
            const severityStats = await ActivityLog.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: '$severity',
                        count: { $sum: 1 }
                    }
                }
            ]);

            return {
                timeframe,
                period: {
                    startDate,
                    endDate
                },
                actionTypeStats: stats,
                topActiveUsers: userStats,
                severityDistribution: severityStats,
                totalActivities: stats.reduce((sum, stat) => sum + stat.totalCount, 0)
            };

        } catch (error) {
            logger.error('Error generating activity statistics', { error: error.message });
            throw error;
        }
    }

    /**
     * Export activity logs
     */
    async exportActivityLogs(filters = {}, format = 'json') {
        try {
            const { logs } = await this.getActivityLogs(filters, { limit: 10000 });
            
            if (format === 'csv') {
                return this.convertToCSV(logs);
            } else if (format === 'excel') {
                return this.convertToExcel(logs);
            }
            
            return logs;

        } catch (error) {
            logger.error('Error exporting activity logs', { error: error.message });
            throw error;
        }
    }

    /**
     * Clean old activity logs
     */
    async cleanOldLogs(retentionDays = 365) {
        try {
            const ActivityLog = mongoose.model('ActivityLog');
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            const result = await ActivityLog.deleteMany({
                timestamp: { $lt: cutoffDate }
            });

            logger.info('Old activity logs cleaned', {
                deletedCount: result.deletedCount,
                cutoffDate
            });

            return result;

        } catch (error) {
            logger.error('Error cleaning old logs', { error: error.message });
            throw error;
        }
    }

    /**
     * Get severity level for action type
     */
    getSeverityLevel(actionType) {
        const highSeverityActions = [
            'DELETE_USER', 'DELETE_TRANSACTION', 'DELETE_TENANT',
            'SYSTEM_CONFIG_CHANGED', 'BACKUP_CREATED'
        ];
        
        const mediumSeverityActions = [
            'CREATE_USER', 'UPDATE_USER', 'CREATE_TENANT', 'UPDATE_TENANT',
            'PAYMENT_VERIFIED', 'RATE_UPDATED'
        ];

        if (highSeverityActions.includes(actionType)) return 'HIGH';
        if (mediumSeverityActions.includes(actionType)) return 'MEDIUM';
        return 'LOW';
    }

    /**
     * Check if activity is important enough for application logging
     */
    isImportantActivity(actionType) {
        const importantActions = [
            'CREATE_TENANT', 'DELETE_TENANT', 'DELETE_USER',
            'SYSTEM_CONFIG_CHANGED', 'BACKUP_CREATED'
        ];
        return importantActions.includes(actionType);
    }

    /**
     * Convert logs to CSV format
     */
    convertToCSV(logs) {
        const headers = [
            'تاریخ', 'کاربر', 'عملیات', 'توضیحات', 'IP', 'شدت'
        ];
        
        const rows = logs.map(log => [
            new Date(log.timestamp).toLocaleString('fa-IR'),
            log.userId ? log.userId.name : 'سیستم',
            log.actionDescription,
            JSON.stringify(log.details),
            log.details.ip || '-',
            log.severity
        ]);

        return [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
    }

    /**
     * Convert logs to Excel format (placeholder)
     */
    convertToExcel(logs) {
        // This would require a library like xlsx
        // For now, return CSV format
        return this.convertToCSV(logs);
    }
}

module.exports = new ActivityLogService();