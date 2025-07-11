// backend/src/controllers/bulkTenant.controller.js
const TenantAutomationService = require('../services/tenantAutomation');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

class BulkTenantController {
    /**
     * Create single tenant with automation
     */
    async createTenant(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'اطلاعات ورودی نامعتبر است',
                    errors: errors.array()
                });
            }

            // Validate tenant data
            const validationErrors = TenantAutomationService.validateTenantData(req.body);
            if (validationErrors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'اطلاعات ورودی نامعتبر است',
                    errors: validationErrors
                });
            }

            const result = await TenantAutomationService.createTenantAutomated(req.body);

            // Log tenant creation
            req.auditLog = {
                action: 'CREATE_TENANT',
                resource: 'TENANT',
                resourceId: result.tenant._id,
                details: `صرافی جدید ${result.tenant.name} ایجاد شد`,
                metadata: {
                    subdomain: result.tenant.subdomain,
                    plan: result.tenant.plan.type,
                    adminEmail: result.adminUser.email
                }
            };

            res.status(201).json({
                success: true,
                message: 'صرافی با موفقیت ایجاد شد',
                data: {
                    tenant: {
                        id: result.tenant._id,
                        name: result.tenant.name,
                        subdomain: result.tenant.subdomain,
                        domain: result.tenant.domain,
                        plan: result.tenant.plan.type,
                        status: result.tenant.status
                    },
                    adminUser: result.adminUser,
                    loginUrl: result.loginUrl,
                    setupCompleted: true
                }
            });

        } catch (error) {
            logger.error('Failed to create tenant:', error);
            
            res.status(500).json({
                success: false,
                message: error.message || 'خطا در ایجاد صرافی'
            });
        }
    }

    /**
     * Bulk create tenants
     */
    async bulkCreateTenants(req, res) {
        try {
            const { tenants } = req.body;

            if (!Array.isArray(tenants) || tenants.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'لیست صرافی‌ها نباید خالی باشد'
                });
            }

            if (tenants.length > 10) {
                return res.status(400).json({
                    success: false,
                    message: 'حداکثر 10 صرافی در هر درخواست قابل ایجاد است'
                });
            }

            // Validate all tenant data first
            const allErrors = [];
            for (let i = 0; i < tenants.length; i++) {
                const errors = TenantAutomationService.validateTenantData(tenants[i]);
                if (errors.length > 0) {
                    allErrors.push({
                        index: i,
                        tenant: tenants[i].name || `صرافی ${i + 1}`,
                        errors
                    });
                }
            }

            if (allErrors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'خطا در اعتبارسنجی داده‌ها',
                    validationErrors: allErrors
                });
            }

            const result = await TenantAutomationService.bulkCreateTenants(tenants);

            // Log bulk creation
            req.auditLog = {
                action: 'BULK_CREATE_TENANTS',
                resource: 'TENANT',
                details: `ایجاد دسته‌ای ${result.total} صرافی - موفق: ${result.successCount}, ناموفق: ${result.errorCount}`,
                metadata: {
                    total: result.total,
                    successful: result.successCount,
                    failed: result.errorCount
                }
            };

            res.status(201).json({
                success: true,
                message: `${result.successCount} صرافی از ${result.total} با موفقیت ایجاد شد`,
                data: {
                    summary: {
                        total: result.total,
                        successful: result.successCount,
                        failed: result.errorCount
                    },
                    successful: result.successful.map(item => ({
                        tenant: {
                            id: item.tenant._id,
                            name: item.tenant.name,
                            subdomain: item.tenant.subdomain,
                            loginUrl: item.loginUrl
                        }
                    })),
                    failed: result.failed
                }
            });

        } catch (error) {
            logger.error('Bulk tenant creation failed:', error);
            
            res.status(500).json({
                success: false,
                message: 'خطا در ایجاد دسته‌ای صرافی‌ها'
            });
        }
    }

    /**
     * Create tenant from template
     */
    async createFromTemplate(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'اطلاعات ورودی نامعتبر است',
                    errors: errors.array()
                });
            }

            const { templateName, customData } = req.body;

            const result = await TenantAutomationService.createFromTemplate(templateName, customData);

            // Log template-based creation
            req.auditLog = {
                action: 'CREATE_TENANT_FROM_TEMPLATE',
                resource: 'TENANT',
                resourceId: result.tenant._id,
                details: `صرافی ${result.tenant.name} از قالب ${templateName} ایجاد شد`,
                metadata: {
                    template: templateName,
                    subdomain: result.tenant.subdomain
                }
            };

            res.status(201).json({
                success: true,
                message: 'صرافی از قالب با موفقیت ایجاد شد',
                data: {
                    tenant: {
                        id: result.tenant._id,
                        name: result.tenant.name,
                        subdomain: result.tenant.subdomain,
                        domain: result.tenant.domain,
                        plan: result.tenant.plan.type
                    },
                    template: templateName,
                    loginUrl: result.loginUrl
                }
            });

        } catch (error) {
            logger.error('Template-based tenant creation failed:', error);
            
            res.status(500).json({
                success: false,
                message: error.message || 'خطا در ایجاد صرافی از قالب'
            });
        }
    }

    /**
     * Get available templates
     */
    async getTemplates(req, res) {
        try {
            const templates = [
                {
                    id: 'exchange-basic',
                    name: 'صرافی پایه',
                    description: 'صرافی با امکانات پایه برای شروع',
                    businessType: 'exchange',
                    plan: 'basic',
                    features: ['reports'],
                    suitable: 'شرکت‌های کوچک و استارت‌آپ‌ها'
                },
                {
                    id: 'remittance-pro',
                    name: 'حواله حرفه‌ای',
                    description: 'سیستم حواله با امکانات پیشرفته',
                    businessType: 'remittance',
                    plan: 'professional',
                    features: ['reports', 'api', 'remittance'],
                    suitable: 'شرکت‌های حواله و انتقال پول'
                },
                {
                    id: 'crypto-enterprise',
                    name: 'رمزارز سازمانی',
                    description: 'پلتفرم کامل معامله رمزارز',
                    businessType: 'crypto',
                    plan: 'enterprise',
                    features: ['reports', 'api', 'p2p', 'remittance', 'crypto'],
                    suitable: 'صرافی‌های بزرگ و موسسات مالی'
                }
            ];

            res.json({
                success: true,
                message: 'قالب‌های موجود دریافت شد',
                data: { templates }
            });

        } catch (error) {
            logger.error('Failed to get templates:', error);
            
            res.status(500).json({
                success: false,
                message: 'خطا در دریافت قالب‌ها'
            });
        }
    }

    /**
     * Generate subdomain suggestion
     */
    async suggestSubdomain(req, res) {
        try {
            const { name } = req.query;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'نام صرافی الزامی است'
                });
            }

            const suggestion = TenantAutomationService.generateSubdomainSuggestion(name);

            res.json({
                success: true,
                data: { suggestion }
            });

        } catch (error) {
            logger.error('Failed to generate subdomain suggestion:', error);
            
            res.status(500).json({
                success: false,
                message: 'خطا در تولید پیشنهاد دامنه'
            });
        }
    }

    /**
     * Check subdomain availability
     */
    async checkSubdomainAvailability(req, res) {
        try {
            const { subdomain } = req.params;

            if (!subdomain) {
                return res.status(400).json({
                    success: false,
                    message: 'دامنه فرعی الزامی است'
                });
            }

            if (!/^[a-z0-9-]+$/.test(subdomain)) {
                return res.status(400).json({
                    success: false,
                    message: 'دامنه فرعی نامعتبر است',
                    available: false
                });
            }

            const Tenant = require('../models/Tenant');
            const existing = await Tenant.findOne({ subdomain });

            res.json({
                success: true,
                data: {
                    subdomain,
                    available: !existing,
                    domain: `${subdomain}.${process.env.DOMAIN}`
                }
            });

        } catch (error) {
            logger.error('Failed to check subdomain availability:', error);
            
            res.status(500).json({
                success: false,
                message: 'خطا در بررسی دسترسی دامنه'
            });
        }
    }

    /**
     * Get tenant creation status
     */
    async getTenantStatus(req, res) {
        try {
            const { tenantId } = req.params;

            const Tenant = require('../models/Tenant');
            const tenant = await Tenant.findById(tenantId)
                .select('name subdomain status subscription plan createdAt')
                .lean();

            if (!tenant) {
                return res.status(404).json({
                    success: false,
                    message: 'صرافی یافت نشد'
                });
            }

            res.json({
                success: true,
                data: { tenant }
            });

        } catch (error) {
            logger.error('Failed to get tenant status:', error);
            
            res.status(500).json({
                success: false,
                message: 'خطا در دریافت وضعیت صرافی'
            });
        }
    }

    /**
     * Preview tenant configuration
     */
    async previewConfiguration(req, res) {
        try {
            const tenantData = req.body;

            // Validate data
            const errors = TenantAutomationService.validateTenantData(tenantData);
            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'اطلاعات ورودی نامعتبر است',
                    errors
                });
            }

            const planLimits = TenantAutomationService.getPlanLimits(tenantData.plan);
            const planFeatures = TenantAutomationService.getPlanFeatures(tenantData.plan);

            const preview = {
                tenant: {
                    name: tenantData.name,
                    subdomain: tenantData.subdomain,
                    domain: `${tenantData.subdomain}.${process.env.DOMAIN}`,
                    businessType: tenantData.businessType,
                    baseCurrency: tenantData.currency
                },
                plan: {
                    type: tenantData.plan,
                    limits: planLimits,
                    features: { ...planFeatures, ...tenantData.features }
                },
                admin: {
                    name: `${tenantData.admin.firstName} ${tenantData.admin.lastName}`,
                    email: tenantData.admin.email,
                    phone: tenantData.admin.phone
                },
                estimatedSetupTime: '2-3 دقیقه',
                trialPeriod: '30 روز'
            };

            res.json({
                success: true,
                message: 'پیش‌نمایش تنظیمات صرافی',
                data: { preview }
            });

        } catch (error) {
            logger.error('Failed to preview configuration:', error);
            
            res.status(500).json({
                success: false,
                message: 'خطا در پیش‌نمایش تنظیمات'
            });
        }
    }
}

module.exports = new BulkTenantController();