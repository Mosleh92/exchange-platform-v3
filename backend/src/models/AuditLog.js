// backend/src/models/AuditLog.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    // User who performed the action
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Tenant context
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant'
    },
    
    // Action details
    action: {
        type: String,
        required: true,
        enum: [
            // Authentication
            'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'PASSWORD_RESET',
            
            // 2FA
            'ENABLE_2FA', 'DISABLE_2FA', 'USE_2FA', 'REGENERATE_BACKUP_CODES',
            
            // IP Security
            'ADD_IP_WHITELIST', 'REMOVE_IP_WHITELIST', 'ENABLE_IP_WHITELIST', 
            'DISABLE_IP_WHITELIST', 'SUSPICIOUS_IP_ACTIVITY',
            
            // User Management
            'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'ACTIVATE_USER', 'DEACTIVATE_USER',
            
            // Financial
            'CREATE_TRANSACTION', 'UPDATE_TRANSACTION', 'DELETE_TRANSACTION', 
            'APPROVE_TRANSACTION', 'REJECT_TRANSACTION',
            
            // Wallet
            'CREATE_WALLET', 'UPDATE_WALLET', 'DEPOSIT', 'WITHDRAWAL',
            
            // Trading
            'CREATE_ORDER', 'UPDATE_ORDER', 'CANCEL_ORDER', 'EXECUTE_ORDER',
            
            // KYC
            'SUBMIT_KYC', 'APPROVE_KYC', 'REJECT_KYC', 'UPDATE_KYC',
            
            // System
            'SYSTEM_CONFIG_CHANGE', 'BACKUP_CREATED', 'BACKUP_RESTORED',
            
            // API
            'API_KEY_CREATED', 'API_KEY_DELETED', 'API_REQUEST',
            
            // Documents
            'UPLOAD_DOCUMENT', 'DELETE_DOCUMENT', 'APPROVE_DOCUMENT', 'REJECT_DOCUMENT',
            
            // General
            'CREATE', 'READ', 'UPDATE', 'DELETE', 'OTHER'
        ]
    },
    
    // Resource information
    resource: {
        type: String,
        required: true
    },
    resourceId: {
        type: String // Can be ObjectId string or other identifier
    },
    
    // Action description
    details: {
        type: String,
        required: true
    },
    
    // Additional metadata
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    
    // Request information
    ipAddress: String,
    userAgent: String,
    requestMethod: String,
    requestUrl: String,
    
    // Response information
    statusCode: Number,
    responseTime: Number, // in milliseconds
    
    // Severity level
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    
    // Tags for categorization
    tags: [String],
    
    // Session information
    sessionId: String,
    
    // Geographic information
    location: {
        country: String,
        region: String,
        city: String,
        coordinates: {
            latitude: Number,
            longitude: Number
        }
    }
}, {
    timestamps: true,
    index: true
});

// Indexes for better query performance
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ tenantId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });
auditLogSchema.index({ ipAddress: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 }); // For time-based queries
auditLogSchema.index({ tags: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

// backend/src/services/auditLogService.js
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { getRealIP } = require('../middleware/ipWhitelistMiddleware');

class AuditLogService {
    /**
     * Create audit log entry
     */
    async log(data) {
        try {
            const logEntry = new AuditLog({
                userId: data.userId,
                tenantId: data.tenantId,
                action: data.action,
                resource: data.resource,
                resourceId: data.resourceId,
                details: data.details,
                metadata: data.metadata || {},
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
                requestMethod: data.requestMethod,
                requestUrl: data.requestUrl,
                statusCode: data.statusCode,
                responseTime: data.responseTime,
                severity: data.severity || 'medium',
                tags: data.tags || [],
                sessionId: data.sessionId,
                location: data.location
            });

            await logEntry.save();
            return logEntry;
        } catch (error) {
            console.error('خطا در ثبت audit log:', error);
            throw error;
        }
    }

    /**
     * Get audit logs with filters
     */
    async getLogs(filters = {}, options = {}) {
        try {
            const {
                userId,
                tenantId,
                action,
                resource,
                severity,
                startDate,
                endDate,
                ipAddress,
                tags
            } = filters;

            const {
                page = 1,
                limit = 50,
                sortBy = 'createdAt',
                sortOrder = -1
            } = options;

            // Build query
            const query = {};
            
            if (userId) query.userId = userId;
            if (tenantId) query.tenantId = tenantId;
            if (action) query.action = action;
            if (resource) query.resource = resource;
            if (severity) query.severity = severity;
            if (ipAddress) query.ipAddress = ipAddress;
            if (tags && tags.length > 0) query.tags = { $in: tags };
            
            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate) query.createdAt.$gte = new Date(startDate);
                if (endDate) query.createdAt.$lte = new Date(endDate);
            }

            // Execute query with pagination
            const skip = (page - 1) * limit;
            const sort = { [sortBy]: sortOrder };

            const [logs, total] = await Promise.all([
                AuditLog.find(query)
                    .populate('userId', 'firstName lastName email')
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                AuditLog.countDocuments(query)
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
            throw new Error(`خطا در دریافت audit logs: ${error.message}`);
        }
    }

    /**
     * Get security events for a user
     */
    async getSecurityEvents(userId, days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const securityActions = [
                'LOGIN', 'LOGIN_FAILED', 'ENABLE_2FA', 'DISABLE_2FA',
                'ADD_IP_WHITELIST', 'REMOVE_IP_WHITELIST', 'SUSPICIOUS_IP_ACTIVITY',
                'PASSWORD_CHANGE', 'API_KEY_CREATED', 'API_KEY_DELETED'
            ];

            const events = await AuditLog.find({
                userId: userId,
                action: { $in: securityActions },
                createdAt: { $gte: startDate }
            })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

            return events;
        } catch (error) {
            throw new Error(`خطا در دریافت رویدادهای امنیتی: ${error.message}`);
        }
    }

    /**
     * Get statistics for dashboard
     */
    async getStatistics(tenantId = null, days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const matchQuery = {
                createdAt: { $gte: startDate }
            };

            if (tenantId) {
                matchQuery.tenantId = tenantId;
            }

            const stats = await AuditLog.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: null,
                        totalEvents: { $sum: 1 },
                        loginEvents: {
                            $sum: { $cond: [{ $eq: ['$action', 'LOGIN'] }, 1, 0] }
                        },
                        failedLogins: {
                            $sum: { $cond: [{ $eq: ['$action', 'LOGIN_FAILED'] }, 1, 0] }
                        },
                        securityEvents: {
                            $sum: {
                                $cond: [
                                    {
                                        $in: ['$action', [
                                            'ENABLE_2FA', 'DISABLE_2FA', 'SUSPICIOUS_IP_ACTIVITY',
                                            'ADD_IP_WHITELIST', 'REMOVE_IP_WHITELIST'
                                        ]]
                                    }, 1, 0
                                ]
                            }
                        },
                        highSeverityEvents: {
                            $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] }
                        },
                        criticalEvents: {
                            $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
                        }
                    }
                }
            ]);

            // Get daily breakdown
            const dailyStats = await AuditLog.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        count: { $sum: 1 },
                        loginCount: {
                            $sum: { $cond: [{ $eq: ['$action', 'LOGIN'] }, 1, 0] }
                        },
                        failedLoginCount: {
                            $sum: { $cond: [{ $eq: ['$action', 'LOGIN_FAILED'] }, 1, 0] }
                        }
                    }
                },
                { $sort: { _id: 1 } }
            ]);

            // Get top IP addresses
            const topIPs = await AuditLog.aggregate([
                { $match: { ...matchQuery, ipAddress: { $exists: true } } },
                {
                    $group: {
                        _id: '$ipAddress',
                        count: { $sum: 1 },
                        lastSeen: { $max: '$createdAt' }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]);

            return {
                summary: stats[0] || {
                    totalEvents: 0,
                    loginEvents: 0,
                    failedLogins: 0,
                    securityEvents: 0,
                    highSeverityEvents: 0,
                    criticalEvents: 0
                },
                dailyBreakdown: dailyStats,
                topIPs: topIPs
            };
        } catch (error) {
            throw new Error(`خطا در دریافت آمار: ${error.message}`);
        }
    }

    /**
     * Search audit logs
     */
    async searchLogs(searchTerm, filters = {}, options = {}) {
        try {
            const {
                page = 1,
                limit = 50
            } = options;

            const query = {
                $or: [
                    { details: { $regex: searchTerm, $options: 'i' } },
                    { action: { $regex: searchTerm, $options: 'i' } },
                    { resource: { $regex: searchTerm, $options: 'i' } }
                ]
            };

            // Apply additional filters
            if (filters.userId) query.userId = filters.userId;
            if (filters.tenantId) query.tenantId = filters.tenantId;
            if (filters.startDate || filters.endDate) {
                query.createdAt = {};
                if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
                if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
            }

            const skip = (page - 1) * limit;

            const [logs, total] = await Promise.all([
                AuditLog.find(query)
                    .populate('userId', 'firstName lastName email')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                AuditLog.countDocuments(query)
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
            throw new Error(`خطا در جستجوی audit logs: ${error.message}`);
        }
    }

    /**
     * Export audit logs
     */
    async exportLogs(filters = {}, format = 'csv') {
        try {
            const query = {};
            
            if (filters.userId) query.userId = filters.userId;
            if (filters.tenantId) query.tenantId = filters.tenantId;
            if (filters.startDate || filters.endDate) {
                query.createdAt = {};
                if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
                if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
            }

            const logs = await AuditLog.find(query)
                .populate('userId', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .limit(10000) // Limit for performance
                .lean();

            if (format === 'csv') {
                return this.convertToCSV(logs);
            } else if (format === 'json') {
                return JSON.stringify(logs, null, 2);
            }

            throw new Error('فرمت نامعتبر برای خروجی');
        } catch (error) {
            throw new Error(`خطا در خروجی audit logs: ${error.message}`);
        }
    }

    /**
     * Convert logs to CSV format
     */
    convertToCSV(logs) {
        const headers = [
            'تاریخ',
            'کاربر',
            'عملیات',
            'منبع',
            'جزئیات',
            'آدرس IP',
            'سطح خطر'
        ];

        const rows = logs.map(log => [
            new Date(log.createdAt).toLocaleString('fa-IR'),
            log.userId ? `${log.userId.firstName} ${log.userId.lastName}` : 'نامشخص',
            log.action,
            log.resource,
            log.details,
            log.ipAddress || 'نامشخص',
            log.severity
        ]);

        return [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
    }

    /**
     * Clean old audit logs
     */
    async cleanOldLogs(daysToKeep = 365) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            const result = await AuditLog.deleteMany({
                createdAt: { $lt: cutoffDate },
                severity: { $nin: ['high', 'critical'] } // Keep high/critical logs longer
            });

            return {
                deletedCount: result.deletedCount,
                cutoffDate
            };
        } catch (error) {
            throw new Error(`خطا در پاک‌سازی audit logs: ${error.message}`);
        }
    }

    /**
     * Get failed login attempts for an IP
     */
    async getFailedLoginAttempts(ipAddress, hours = 24) {
        try {
            const startDate = new Date();
            startDate.setHours(startDate.getHours() - hours);

            const attempts = await AuditLog.countDocuments({
                action: 'LOGIN_FAILED',
                ipAddress: ipAddress,
                createdAt: { $gte: startDate }
            });

            return attempts;
        } catch (error) {
            throw new Error(`خطا در دریافت تلاش‌های ناموفق ورود: ${error.message}`);
        }
    }

    /**
     * Create middleware for automatic logging
     */
    createMiddleware() {
        return async (req, res, next) => {
            const startTime = Date.now();
            
            // Store original send method
            const originalSend = res.send;
            
            res.send = function(data) {
                const responseTime = Date.now() - startTime;
                
                // Log after response if there's audit info
                if (req.auditLog && req.user) {
                    setImmediate(async () => {
                        try {
                            await auditLogService.log({
                                userId: req.user.id,
                                tenantId: req.user.tenantId,
                                action: req.auditLog.action,
                                resource: req.auditLog.resource,
                                resourceId: req.auditLog.resourceId,
                                details: req.auditLog.details,
                                metadata: req.auditLog.metadata || {},
                                ipAddress: getRealIP(req),
                                userAgent: req.headers['user-agent'],
                                requestMethod: req.method,
                                requestUrl: req.originalUrl,
                                statusCode: res.statusCode,
                                responseTime: responseTime,
                                severity: req.auditLog.severity || 'medium',
                                tags: req.auditLog.tags || [],
                                sessionId: req.sessionID
                            });
                        } catch (error) {
                            console.error('خطا در ثبت خودکار audit log:', error);
                        }
                    });
                }
                
                originalSend.call(this, data);
            };
            
            next();
        };
    }
}

const auditLogService = new AuditLogService();
module.exports = auditLogService;
