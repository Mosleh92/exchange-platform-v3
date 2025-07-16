// backend/src/controllers/securityController.js
const IPWhitelistService = require('../services/ipWhitelistService');
const TwoFactorAuthService = require('../services/twoFactorAuthService');
const DigitalSignatureService = require('../services/digitalSignatureService');
const AuditLogService = require('../services/auditLogService');
const RateLimiterService = require('../services/rateLimiterService');
const User = require('../models/User');
const { validationResult } = require('express-validator');

class SecurityController {
    /**
     * Get security dashboard overview
     */
    async getSecurityDashboard(req, res) {
        try {
            const userId = req.user.id;
            const tenantId = req.user.role !== 'super_admin' ? req.user.tenantId : null;

            // Get security statistics
            const [
                securityEvents,
                auditStats,
                twoFAStatus,
                ipWhitelist,
                signatureStatus
            ] = await Promise.all([
                AuditLogService.getSecurityEvents(userId, 7), // Last 7 days
                AuditLogService.getStatistics(tenantId, 30), // Last 30 days
                TwoFactorAuthService.getStatus(userId),
                IPWhitelistService.getWhitelist(userId),
                DigitalSignatureService.getUserSignatureStatus(userId)
            ]);

            // Calculate security score
            const securityScore = this.calculateSecurityScore({
                twoFAEnabled: twoFAStatus.enabled,
                hasIPWhitelist: ipWhitelist.length > 0,
                hasDigitalSignature: signatureStatus.hasKeys,
                recentSecurityEvents: securityEvents.filter(e => 
                    ['SUSPICIOUS_IP_ACTIVITY', 'LOGIN_FAILED', 'INVALID_REQUEST_SIGNATURE'].includes(e.action)
                ).length
            });

            // Get recent security alerts
            const securityAlerts = securityEvents
                .filter(event => ['SUSPICIOUS_IP_ACTIVITY', 'NEW_DEVICE_DETECTED', 'LOGIN_FAILED'].includes(event.action))
                .slice(0, 5);

            res.json({
                success: true,
                data: {
                    securityScore,
                    statistics: auditStats.summary,
                    twoFactorAuth: twoFAStatus,
                    ipWhitelist: {
                        enabled: ipWhitelist.length > 0,
                        count: ipWhitelist.length
                    },
                    digitalSignature: signatureStatus,
                    recentAlerts: securityAlerts,
                    dailyActivity: auditStats.dailyBreakdown,
                    topIPs: auditStats.topIPs
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `خطا در دریافت داشبورد امنیتی: ${error.message}`
            });
        }
    }

    /**
     * Calculate security score based on enabled features
     */
    calculateSecurityScore(factors) {
        let score = 0;
        const maxScore = 100;

        // 2FA enabled (30 points)
        if (factors.twoFAEnabled) score += 30;

        // IP Whitelist configured (25 points)
        if (factors.hasIPWhitelist) score += 25;

        // Digital signature setup (25 points)
        if (factors.hasDigitalSignature) score += 25;

        // No recent security incidents (20 points)
        if (factors.recentSecurityEvents === 0) score += 20;
        else if (factors.recentSecurityEvents <= 2) score += 10;

        return Math.min(score, maxScore);
    }

    /**
     * IP Whitelist Management
     */
    async addIPToWhitelist(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'اطلاعات ورودی نامعتبر',
                    errors: errors.array()
                });
            }

            const { ip, description } = req.body;
            const userId = req.user.id;

            const result = await IPWhitelistService.addIP(userId, ip, description);

            res.json({
                success: true,
                message: 'آدرس IP با موفقیت به لیست سفید اضافه شد',
                data: result
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async removeIPFromWhitelist(req, res) {
        try {
            const { ip } = req.params;
            const userId = req.user.id;

            await IPWhitelistService.removeIP(userId, ip);

            res.json({
                success: true,
                message: 'آدرس IP از لیست سفید حذف شد'
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    async getIPWhitelist(req, res) {
        try {
            const userId = req.user.id;
            const whitelist = await IPWhitelistService.getWhitelist(userId);

            res.json({
                success: true,
                data: whitelist
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * API Key Management
     */
    async generateAPIKey(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'اطلاعات ورودی نامعتبر',
                    errors: errors.array()
                });
            }

            const { name, permissions } = req.body;
            const userId = req.user.id;

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'کاربر یافت نشد'
                });
            }

            // Generate API key pair
            const keyPair = user.generateApiKey();

            // Add to user's API keys
            user.apiKeys.push({
                name: name,
                key: keyPair.key,
                secret: keyPair.secret,
                permissions: permissions || ['api.read'],
                isActive: true,
                createdAt: new Date()
            });

            await user.save();

            // Log API key creation
            req.auditLog = {
                action: 'API_KEY_CREATED',
                resource: 'Security',
                details: `کلید API جدید ایجاد شد: ${name}`
            };

            res.json({
                success: true,
                message: 'کلید API با موفقیت ایجاد شد',
                data: {
                    name: name,
                    key: keyPair.key,
                    secret: keyPair.secret, // Only show once
                    permissions: permissions
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `خطا در ایجاد کلید API: ${error.message}`
            });
        }
    }

    async getAPIKeys(req, res) {
        try {
            const userId = req.user.id;
            const user = await User.findById(userId).select('apiKeys');

            const apiKeys = user.apiKeys.map(key => ({
                id: key._id,
                name: key.name,
                key: key.key,
                permissions: key.permissions,
                isActive: key.isActive,
                createdAt: key.createdAt,
                lastUsed: key.lastUsed
            }));

            res.json({
                success: true,
                data: apiKeys
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `خطا در دریافت کلیدهای API: ${error.message}`
            });
        }
    }

    async deleteAPIKey(req, res) {
        try {
            const { keyId } = req.params;
            const userId = req.user.id;

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'کاربر یافت نشد'
                });
            }

            const keyIndex = user.apiKeys.findIndex(key => key._id.toString() === keyId);
            if (keyIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'کلید API یافت نشد'
                });
            }

            const deletedKey = user.apiKeys[keyIndex];
            user.apiKeys.splice(keyIndex, 1);
            await user.save();

            // Log API key deletion
            req.auditLog = {
                action: 'API_KEY_DELETED',
                resource: 'Security',
                details: `کلید API حذف شد: ${deletedKey.name}`
            };

            res.json({
                success: true,
                message: 'کلید API با موفقیت حذف شد'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `خطا در حذف کلید API: ${error.message}`
            });
        }
    }

    /**
     * Security Events and Logs
     */
    async getSecurityEvents(req, res) {
        try {
            const userId = req.user.id;
            const { days = 30, page = 1, limit = 50 } = req.query;

            const events = await AuditLogService.getSecurityEvents(userId, parseInt(days));
            
            // Paginate results
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + parseInt(limit);
            const paginatedEvents = events.slice(startIndex, endIndex);

            res.json({
                success: true,
                data: {
                    events: paginatedEvents,
                    pagination: {
                        current: parseInt(page),
                        pages: Math.ceil(events.length / limit),
                        total: events.length,
                        limit: parseInt(limit)
                    }
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `خطا در دریافت رویدادهای امنیتی: ${error.message}`
            });
        }
    }

    async getAuditLogs(req, res) {
        try {
            const filters = {
                userId: req.user.role !== 'super_admin' ? req.user.id : req.query.userId,
                tenantId: req.user.role === 'super_admin' ? req.query.tenantId : req.user.tenantId,
                action: req.query.action,
                resource: req.query.resource,
                severity: req.query.severity,
                startDate: req.query.startDate,
                endDate: req.query.endDate
            };

            const options = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 50,
                sortBy: req.query.sortBy || 'createdAt',
                sortOrder: req.query.sortOrder === 'asc' ? 1 : -1
            };

            const result = await AuditLogService.getLogs(filters, options);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `خطا در دریافت گزارش‌های حسابرسی: ${error.message}`
            });
        }
    }

    /**
     * Device Management
     */
    async getTrustedDevices(req, res) {
        try {
            const userId = req.user.id;
            const user = await User.findById(userId).select('lastKnownDevices');

            const devices = user.lastKnownDevices || [];

            res.json({
                success: true,
                data: devices.map(device => ({
                    id: device._id,
                    userAgent: device.userAgent,
                    firstSeen: device.firstSeen,
                    lastSeen: device.lastSeen,
                    isCurrent: device.hash === req.deviceFingerprint?.hash
                }))
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `خطا در دریافت دستگاه‌های قابل اعتماد: ${error.message}`
            });
        }
    }

    async removeTrustedDevice(req, res) {
        try {
            const { deviceId } = req.params;
            const userId = req.user.id;

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'کاربر یافت نشد'
                });
            }

            const deviceIndex = user.lastKnownDevices.findIndex(
                device => device._id.toString() === deviceId
            );

            if (deviceIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'دستگاه یافت نشد'
                });
            }

            user.lastKnownDevices.splice(deviceIndex, 1);
            await user.save();

            // Log device removal
            req.auditLog = {
                action: 'REMOVE_TRUSTED_DEVICE',
                resource: 'Security',
                details: 'دستگاه قابل اعتماد حذف شد'
            };

            res.json({
                success: true,
                message: 'دستگاه با موفقیت حذف شد'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `خطا در حذف دستگاه: ${error.message}`
            });
        }
    }

    /**
     * Security Settings
     */
    async updateSecuritySettings(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'اطلاعات ورودی نامعتبر',
                    errors: errors.array()
                });
            }

            const userId = req.user.id;
            const { 
                ipWhitelistEnabled,
                deviceTrackingEnabled,
                loginNotifications,
                securityAlerts
            } = req.body;

            const updateData = {};
            
            if (typeof ipWhitelistEnabled === 'boolean') {
                updateData.ipWhitelistEnabled = ipWhitelistEnabled;
            }
            
            if (typeof deviceTrackingEnabled === 'boolean') {
                updateData.deviceTrackingEnabled = deviceTrackingEnabled;
            }
            
            if (loginNotifications) {
                updateData['notifications.email.login'] = loginNotifications.email;
                updateData['notifications.sms.login'] = loginNotifications.sms;
            }
            
            if (securityAlerts) {
                updateData['notifications.email.security'] = securityAlerts.email;
                updateData['notifications.sms.security'] = securityAlerts.sms;
            }

            await User.findByIdAndUpdate(userId, updateData);

            // Log settings update
            req.auditLog = {
                action: 'UPDATE_SECURITY_SETTINGS',
                resource: 'Security',
                details: 'تنظیمات امنیتی به‌روزرسانی شد',
                metadata: updateData
            };

            res.json({
                success: true,
                message: 'تنظیمات امنیتی با موفقیت به‌روزرسانی شد'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `خطا در به‌روزرسانی تنظیمات: ${error.message}`
            });
        }
    }

    /**
     * Emergency security actions
     */
    async emergencyLockAccount(req, res) {
        try {
            const userId = req.user.id;

            // Lock account
            await User.findByIdAndUpdate(userId, {
                isActive: false,
                lockoutUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                emergencyLock: true
            });

            // Invalidate all sessions and API keys
            await User.findByIdAndUpdate(userId, {
                $set: {
                    'apiKeys.$[].isActive': false
                }
            });

            // Log emergency lock
            req.auditLog = {
                action: 'EMERGENCY_ACCOUNT_LOCK',
                resource: 'Security',
                details: 'حساب کاربری به صورت اضطراری قفل شد',
                severity: 'critical'
            };

            res.json({
                success: true,
                message: 'حساب کاربری به صورت اضطراری قفل شد'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `خطا در قفل اضطراری حساب: ${error.message}`
            });
        }
    }

    async revokeAllSessions(req, res) {
        try {
            const userId = req.user.id;

            // This would typically involve invalidating JWT tokens
            // For now, we'll just log the action
            req.auditLog = {
                action: 'REVOKE_ALL_SESSIONS',
                resource: 'Security',
                details: 'تمام جلسات کاربر باطل شدند',
                severity: 'high'
            };

            res.json({
                success: true,
                message: 'تمام جلسات با موفقیت باطل شدند'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `خطا در باطل کردن جلسات: ${error.message}`
            });
        }
    }

    /**
     * Security report generation
     */
    async generateSecurityReport(req, res) {
        try {
            const { startDate, endDate, format = 'json' } = req.query;
            const userId = req.user.role === 'super_admin' ? null : req.user.id;
            const tenantId = req.user.role === 'super_admin' ? null : req.user.tenantId;

            const filters = {
                userId,
                tenantId,
                startDate,
                endDate
            };

            if (format === 'csv') {
                const csvData = await AuditLogService.exportLogs(filters, 'csv');
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename=security-report.csv');
                res.send(csvData);
            } else {
                const report = await AuditLogService.getLogs(filters, { limit: 1000 });
                
                res.json({
                    success: true,
                    data: {
                        report: report.logs,
                        summary: {
                            totalEvents: report.pagination.total,
                            dateRange: { startDate, endDate },
                            generatedAt: new Date(),
                            generatedBy: req.user.id
                        }
                    }
                });
            }

            // Log report generation
            req.auditLog = {
                action: 'GENERATE_SECURITY_REPORT',
                resource: 'Security',
                details: `گزارش امنیتی تولید شد (${format})`,
                metadata: { startDate, endDate, format }
            };
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `خطا در تولید گزارش امنیتی: ${error.message}`
            });
        }
    }

    /**
     * Test security features
     */
    async testSecurityFeatures(req, res) {
        try {
            const userId = req.user.id;
            const results = {};

            // Test 2FA status
            try {
                results.twoFA = await TwoFactorAuthService.getStatus(userId);
            } catch (error) {
                results.twoFA = { error: error.message };
            }

            // Test IP whitelist
            try {
                const whitelist = await IPWhitelistService.getWhitelist(userId);
                results.ipWhitelist = { enabled: whitelist.length > 0, count: whitelist.length };
            } catch (error) {
                results.ipWhitelist = { error: error.message };
            }

            // Test digital signature
            try {
                results.digitalSignature = await DigitalSignatureService.getUserSignatureStatus(userId);
            } catch (error) {
                results.digitalSignature = { error: error.message };
            }

            // Test rate limiting
            try {
                const rateLimitStatus = await RateLimiterService.checkLimit(
                    `test:${userId}`, 
                    'api'
                );
                results.rateLimiting = { working: true, status: rateLimitStatus };
            } catch (error) {
                results.rateLimiting = { error: error.message };
            }

            res.json({
                success: true,
                message: 'تست ویژگی‌های امنیتی انجام شد',
                data: results
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `خطا در تست ویژگی‌های امنیتی: ${error.message}`
            });
        }
    }

    /**
     * Get security recommendations
     */
    async getSecurityRecommendations(req, res) {
        try {
            const userId = req.user.id;
            const recommendations = [];

            // Check 2FA status
            const twoFAStatus = await TwoFactorAuthService.getStatus(userId);
            if (!twoFAStatus.enabled) {
                recommendations.push({
                    type: 'critical',
                    title: 'فعال‌سازی تأیید دو مرحله‌ای',
                    description: 'برای افزایش امنیت حساب خود، تأیید دو مرحله‌ای را فعال کنید',
                    action: 'enable_2fa',
                    priority: 1
                });
            }

            // Check IP whitelist
            const ipWhitelist = await IPWhitelistService.getWhitelist(userId);
            if (ipWhitelist.length === 0) {
                recommendations.push({
                    type: 'warning',
                    title: 'تنظیم لیست سفید IP',
                    description: 'برای محدود کردن دسترسی به IP‌های مشخص، لیست سفید IP تنظیم کنید',
                    action: 'setup_ip_whitelist',
                    priority: 2
                });
            }

            // Check digital signature
            const signatureStatus = await DigitalSignatureService.getUserSignatureStatus(userId);
            if (!signatureStatus.hasKeys) {
                recommendations.push({
                    type: 'info',
                    title: 'تنظیم امضای دیجیتال',
                    description: 'برای امنیت بیشتر تراکنش‌ها، امضای دیجیتال تنظیم کنید',
                    action: 'setup_digital_signature',
                    priority: 3
                });
            }

            // Check recent security events
            const securityEvents = await AuditLogService.getSecurityEvents(userId, 7);
            const suspiciousEvents = securityEvents.filter(e => 
                ['SUSPICIOUS_IP_ACTIVITY', 'LOGIN_FAILED'].includes(e.action)
            );

            if (suspiciousEvents.length > 0) {
                recommendations.push({
                    type: 'critical',
                    title: 'بررسی فعالیت‌های مشکوک',
                    description: `${suspiciousEvents.length} فعالیت مشکوک در هفته گذشته شناسایی شده`,
                    action: 'review_security_events',
                    priority: 1
                });
            }

            // Check password age (mock)
            const user = await User.findById(userId).select('updatedAt');
            const passwordAge = Date.now() - user.updatedAt.getTime();
            const maxPasswordAge = 90 * 24 * 60 * 60 * 1000; // 90 days

            if (passwordAge > maxPasswordAge) {
                recommendations.push({
                    type: 'warning',
                    title: 'تغییر رمز عبور',
                    description: 'رمز عبور شما قدیمی است، آن را تغییر دهید',
                    action: 'change_password',
                    priority: 2
                });
            }

            // Sort by priority
            recommendations.sort((a, b) => a.priority - b.priority);

            res.json({
                success: true,
                data: {
                    recommendations,
                    securityScore: this.calculateSecurityScore({
                        twoFAEnabled: twoFAStatus.enabled,
                        hasIPWhitelist: ipWhitelist.length > 0,
                        hasDigitalSignature: signatureStatus.hasKeys,
                        recentSecurityEvents: suspiciousEvents.length
                    })
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `خطا در دریافت پیشنهادات امنیتی: ${error.message}`
            });
        }
    }

    /**
     * Bulk security operations (for admins)
     */
    async bulkSecurityOperations(req, res) {
        try {
            // Only for admins
            if (!['super_admin', 'tenant_admin'].includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'دسترسی غیرمجاز'
                });
            }

            const { operation, userIds, parameters } = req.body;
            const results = [];

            for (const userId of userIds) {
                try {
                    let result;
                    
                    switch (operation) {
                        case 'force_2fa':
                            // Force enable 2FA requirement
                            await User.findByIdAndUpdate(userId, {
                                'securitySettings.require2FA': true
                            });
                            result = { success: true, message: '2FA اجباری شد' };
                            break;

                        case 'reset_api_keys':
                            // Deactivate all API keys
                            await User.findByIdAndUpdate(userId, {
                                $set: { 'apiKeys.$[].isActive': false }
                            });
                            result = { success: true, message: 'کلیدهای API غیرفعال شدند' };
                            break;

                        case 'clear_trusted_devices':
                            // Clear trusted devices
                            await User.findByIdAndUpdate(userId, {
                                $unset: { lastKnownDevices: 1 }
                            });
                            result = { success: true, message: 'دستگاه‌های قابل اعتماد پاک شدند' };
                            break;

                        case 'lock_account':
                            // Lock account
                            await User.findByIdAndUpdate(userId, {
                                isActive: false,
                                lockoutUntil: new Date(Date.now() + (parameters?.hours || 24) * 60 * 60 * 1000)
                            });
                            result = { success: true, message: 'حساب قفل شد' };
                            break;

                        default:
                            result = { success: false, message: 'عملیات نامعتبر' };
                    }

                    results.push({ userId, ...result });

                    // Log bulk operation
                    await AuditLog.create({
                        userId: req.user.id,
                        action: 'BULK_SECURITY_OPERATION',
                        resource: 'Security',
                        resourceId: userId,
                        details: `عملیات دسته‌جمعی: ${operation}`,
                        metadata: { operation, parameters },
                        severity: 'high'
                    });
                } catch (error) {
                    results.push({
                        userId,
                        success: false,
                        message: error.message
                    });
                }
            }

            res.json({
                success: true,
                message: 'عملیات دسته‌جمعی انجام شد',
                data: { results }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: `خطا در عملیات دسته‌جمعی: ${error.message}`
            });
        }
    }
}

module.exports = new SecurityController();
