const express = require('express');
const router = express.Router();
const activityLogService = require('../services/activityLog');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * Activity Log Routes
 * Handles activity tracking and reporting
 */

/**
 * @route GET /api/activity-log
 * @desc Get activity logs with filtering
 * @access Private
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const {
            userId,
            actionType,
            startDate,
            endDate,
            severity,
            page = 1,
            limit = 50,
            sortBy = 'timestamp',
            sortOrder = 'desc'
        } = req.query;

        // Build filters based on user role and permissions
        const filters = {};
        
        // Restrict access based on user role
        if (req.user.role === 'SuperAdmin') {
            // SuperAdmin can see all logs
            if (userId) filters.userId = userId;
        } else if (req.user.role === 'TenantAdmin') {
            // TenantAdmin can see logs for their tenant
            filters.tenantId = req.user.tenantId;
            if (userId) filters.userId = userId;
        } else if (req.user.role === 'BranchAdmin') {
            // BranchAdmin can see logs for their branch
            filters.tenantId = req.user.tenantId;
            filters.branchId = req.user.branchId;
            if (userId) filters.userId = userId;
        } else {
            // Regular users can only see their own logs
            filters.userId = req.user.id;
        }

        // Add other filters
        if (actionType) filters.actionType = actionType;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (severity) filters.severity = severity;

        const options = {
            page: parseInt(page),
            limit: parseInt(limit),
            sortBy,
            sortOrder
        };

        const result = await activityLogService.getActivityLogs(filters, options);

        res.json({
            success: true,
            data: result.logs,
            pagination: result.pagination
        });

    } catch (error) {
        logger.error('Error fetching activity logs', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'خطا در دریافت لاگ فعالیت‌ها',
            error: error.message
        });
    }
});

/**
 * @route GET /api/activity-log/statistics
 * @desc Get activity statistics
 * @access Private
 */
router.get('/statistics', authMiddleware, async (req, res) => {
    try {
        const { timeframe = '30d' } = req.query;
        
        // Determine tenant based on user role
        let tenantId = null;
        if (req.user.role !== 'SuperAdmin') {
            tenantId = req.user.tenantId;
        }

        const statistics = await activityLogService.getActivityStatistics(tenantId, timeframe);

        res.json({
            success: true,
            data: statistics
        });

    } catch (error) {
        logger.error('Error generating activity statistics', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'خطا در تولید آمار فعالیت‌ها',
            error: error.message
        });
    }
});

/**
 * @route POST /api/activity-log/export
 * @desc Export activity logs
 * @access Private (Admin roles only)
 */
router.post('/export', authMiddleware, async (req, res) => {
    try {
        // Check permissions
        if (!['SuperAdmin', 'TenantAdmin', 'BranchAdmin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'دسترسی به صادرات گزارش ندارید'
            });
        }

        const {
            userId,
            actionType,
            startDate,
            endDate,
            severity,
            format = 'json'
        } = req.body;

        // Build filters based on user role
        const filters = {};
        
        if (req.user.role === 'TenantAdmin') {
            filters.tenantId = req.user.tenantId;
        } else if (req.user.role === 'BranchAdmin') {
            filters.tenantId = req.user.tenantId;
            filters.branchId = req.user.branchId;
        }

        // Add other filters
        if (userId) filters.userId = userId;
        if (actionType) filters.actionType = actionType;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (severity) filters.severity = severity;

        const exportData = await activityLogService.exportActivityLogs(filters, format);

        // Log the export activity
        await activityLogService.logActivity(
            req.user.id,
            'REPORT_GENERATED',
            {
                reportType: 'activity_log_export',
                format,
                filters,
                tenantId: req.user.tenantId,
                branchId: req.user.branchId
            },
            req
        );

        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=activity-log.csv');
            res.send(exportData);
        } else {
            res.json({
                success: true,
                data: exportData,
                message: 'گزارش با موفقیت صادر شد'
            });
        }

    } catch (error) {
        logger.error('Error exporting activity logs', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'خطا در صادرات گزارش',
            error: error.message
        });
    }
});

/**
 * @route POST /api/activity-log/log
 * @desc Manually log an activity (for testing or special cases)
 * @access Private (Admin roles only)
 */
router.post('/log', authMiddleware, async (req, res) => {
    try {
        // Check permissions
        if (!['SuperAdmin', 'TenantAdmin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'دسترسی به ثبت فعالیت دستی ندارید'
            });
        }

        const { userId, actionType, details } = req.body;

        if (!actionType) {
            return res.status(400).json({
                success: false,
                message: 'نوع فعالیت الزامی است'
            });
        }

        const logEntry = await activityLogService.logActivity(
            userId || req.user.id,
            actionType,
            {
                ...details,
                tenantId: req.user.tenantId,
                branchId: req.user.branchId,
                manualLog: true,
                loggedBy: req.user.id
            },
            req
        );

        res.status(201).json({
            success: true,
            message: 'فعالیت با موفقیت ثبت شد',
            data: logEntry
        });

    } catch (error) {
        logger.error('Error logging manual activity', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'خطا در ثبت فعالیت',
            error: error.message
        });
    }
});

/**
 * @route DELETE /api/activity-log/cleanup
 * @desc Clean old activity logs
 * @access Private (SuperAdmin only)
 */
router.delete('/cleanup', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'SuperAdmin') {
            return res.status(403).json({
                success: false,
                message: 'فقط مدیران کل می‌توانند لاگ‌ها را پاک کنند'
            });
        }

        const { retentionDays = 365 } = req.body;

        const result = await activityLogService.cleanOldLogs(retentionDays);

        // Log the cleanup activity
        await activityLogService.logActivity(
            req.user.id,
            'SYSTEM_CONFIG_CHANGED',
            {
                action: 'activity_log_cleanup',
                retentionDays,
                deletedCount: result.deletedCount
            },
            req
        );

        res.json({
            success: true,
            message: `${result.deletedCount} رکورد قدیمی حذف شد`,
            data: {
                deletedCount: result.deletedCount,
                retentionDays
            }
        });

    } catch (error) {
        logger.error('Error cleaning activity logs', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'خطا در پاکسازی لاگ‌ها',
            error: error.message
        });
    }
});

/**
 * @route GET /api/activity-log/user/:userId
 * @desc Get activity logs for specific user
 * @access Private
 */
router.get('/user/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        // Check permissions
        if (req.user.role === 'Viewer' || req.user.role === 'Operator') {
            // Can only view their own logs
            if (userId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'فقط می‌توانید لاگ خود را مشاهده کنید'
                });
            }
        }

        const filters = { userId };
        
        // Apply tenant/branch restrictions
        if (req.user.role !== 'SuperAdmin') {
            filters.tenantId = req.user.tenantId;
            
            if (req.user.role === 'BranchAdmin') {
                filters.branchId = req.user.branchId;
            }
        }

        const options = {
            page: parseInt(page),
            limit: parseInt(limit)
        };

        const result = await activityLogService.getActivityLogs(filters, options);

        res.json({
            success: true,
            data: result.logs,
            pagination: result.pagination
        });

    } catch (error) {
        logger.error('Error fetching user activity logs', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'خطا در دریافت لاگ کاربر',
            error: error.message
        });
    }
});

module.exports = router;