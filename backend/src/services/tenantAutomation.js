// backend/src/services/tenantAutomation.js
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Branch = require('../models/Branch');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const logger = require('../utils/logger');

class TenantAutomationService {
    /**
     * Create a new tenant with automated setup
     */
    async createTenantAutomated(tenantData) {
        const session = await require('mongoose').startSession();
        session.startTransaction();

        try {
            // 1. Create tenant
            const tenant = await this.createTenant(tenantData, session);
            
            // 2. Create admin user
            const adminUser = await this.createAdminUser(tenant._id, tenantData.admin, session);
            
            // 3. Create default branch
            const defaultBranch = await this.createDefaultBranch(tenant._id, session);
            
            // 4. Setup default configurations
            await this.setupDefaultConfigurations(tenant._id, tenantData.config, session);
            
            // 5. Apply feature configurations
            await this.applyFeatureConfigurations(tenant._id, tenantData.features, session);

            await session.commitTransaction();
            
            logger.info('Tenant created successfully', { 
                tenantId: tenant._id, 
                subdomain: tenant.subdomain 
            });

            return {
                tenant,
                adminUser: {
                    id: adminUser._id,
                    email: adminUser.email,
                    // Don't return password
                },
                defaultBranch,
                loginUrl: `https://${tenant.subdomain}.${process.env.DOMAIN}/login`
            };

        } catch (error) {
            await session.abortTransaction();
            logger.error('Failed to create tenant', { error: error.message, tenantData });
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Create tenant record
     */
    async createTenant(tenantData, session) {
        // Check if subdomain is available
        const existingTenant = await Tenant.findOne({ 
            subdomain: tenantData.subdomain 
        }).session(session);

        if (existingTenant) {
            throw new Error('Subdomain already exists');
        }

        const tenant = new Tenant({
            name: tenantData.name,
            subdomain: tenantData.subdomain,
            domain: `${tenantData.subdomain}.${process.env.DOMAIN}`,
            businessType: tenantData.businessType || 'exchange',
            baseCurrency: tenantData.currency || 'USD',
            plan: {
                type: tenantData.plan || 'basic',
                maxUsers: this.getPlanLimits(tenantData.plan).maxUsers,
                maxBranches: this.getPlanLimits(tenantData.plan).maxBranches,
                features: this.getPlanFeatures(tenantData.plan)
            },
            settings: {
                branding: {
                    primaryColor: tenantData.branding?.primaryColor || '#3b82f6',
                    secondaryColor: tenantData.branding?.secondaryColor || '#64748b',
                    logo: tenantData.branding?.logo || null
                },
                features: tenantData.features || {},
                locale: 'fa',
                timezone: 'Asia/Tehran'
            },
            status: 'active',
            subscription: {
                plan: tenantData.plan || 'basic',
                status: 'trial',
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
                autoRenew: true
            }
        });

        return await tenant.save({ session });
    }

    /**
     * Create admin user for tenant
     */
    async createAdminUser(tenantId, adminData, session) {
        const hashedPassword = await bcrypt.hash(adminData.password, 12);

        const adminUser = new User({
            email: adminData.email,
            password: hashedPassword,
            firstName: adminData.firstName,
            lastName: adminData.lastName,
            phone: adminData.phone,
            role: 'tenant_admin',
            tenantId: tenantId,
            isActive: true,
            isVerified: true,
            permissions: this.getTenantAdminPermissions(),
            profile: {
                department: 'Management',
                position: 'Administrator'
            }
        });

        return await adminUser.save({ session });
    }

    /**
     * Create default branch
     */
    async createDefaultBranch(tenantId, session) {
        const branch = new Branch({
            name: 'دفتر مرکزی',
            code: 'MAIN',
            tenantId: tenantId,
            isMainBranch: true,
            status: 'active',
            address: {
                street: '',
                city: '',
                state: '',
                country: 'Iran',
                zipCode: ''
            },
            contact: {
                phone: '',
                email: '',
                website: ''
            },
            businessHours: {
                monday: { open: '08:00', close: '17:00', closed: false },
                tuesday: { open: '08:00', close: '17:00', closed: false },
                wednesday: { open: '08:00', close: '17:00', closed: false },
                thursday: { open: '08:00', close: '17:00', closed: false },
                friday: { open: '08:00', close: '12:00', closed: false },
                saturday: { open: '08:00', close: '17:00', closed: false },
                sunday: { open: '08:00', close: '17:00', closed: true }
            },
            settings: {
                allowTransactions: true,
                allowP2P: true,
                allowRemittance: true,
                requireApproval: false
            }
        });

        return await branch.save({ session });
    }

    /**
     * Setup default configurations
     */
    async setupDefaultConfigurations(tenantId, config, session) {
        // Create default exchange rates if needed
        if (config?.setupRates) {
            await this.setupDefaultRates(tenantId, session);
        }

        // Create default commission structures
        await this.setupDefaultCommissions(tenantId, session);

        // Setup default limits
        await this.setupDefaultLimits(tenantId, config?.limits, session);
    }

    /**
     * Apply feature configurations
     */
    async applyFeatureConfigurations(tenantId, features, session) {
        if (!features) return;

        // Update tenant with feature settings
        await Tenant.updateOne(
            { _id: tenantId },
            { 
                $set: { 
                    'settings.features': features,
                    'plan.features': features
                } 
            },
            { session }
        );
    }

    /**
     * Get plan limits based on plan type
     */
    getPlanLimits(planType) {
        const limits = {
            basic: {
                maxUsers: 10,
                maxBranches: 1,
                maxTransactionsPerDay: 100,
                maxTransactionAmount: 10000
            },
            professional: {
                maxUsers: 50,
                maxBranches: 5,
                maxTransactionsPerDay: 1000,
                maxTransactionAmount: 100000
            },
            enterprise: {
                maxUsers: -1, // unlimited
                maxBranches: -1,
                maxTransactionsPerDay: -1,
                maxTransactionAmount: -1
            }
        };

        return limits[planType] || limits.basic;
    }

    /**
     * Get plan features based on plan type
     */
    getPlanFeatures(planType) {
        const features = {
            basic: {
                reports: true,
                api: false,
                p2p: false,
                remittance: false,
                crypto: false,
                multiCurrency: false,
                customBranding: false
            },
            professional: {
                reports: true,
                api: true,
                p2p: true,
                remittance: true,
                crypto: false,
                multiCurrency: true,
                customBranding: false
            },
            enterprise: {
                reports: true,
                api: true,
                p2p: true,
                remittance: true,
                crypto: true,
                multiCurrency: true,
                customBranding: true
            }
        };

        return features[planType] || features.basic;
    }

    /**
     * Get tenant admin permissions
     */
    getTenantAdminPermissions() {
        return [
            'tenant.read',
            'tenant.update',
            'user.create',
            'user.read',
            'user.update',
            'user.delete',
            'branch.create',
            'branch.read',
            'branch.update',
            'branch.delete',
            'transaction.create',
            'transaction.read',
            'transaction.update',
            'transaction.approve',
            'report.read',
            'report.export',
            'settings.read',
            'settings.update'
        ];
    }

    /**
     * Setup default exchange rates
     */
    async setupDefaultRates(tenantId, session) {
        const ExchangeRate = require('../models/ExchangeRate');
        
        const defaultRates = [
            { from: 'USD', to: 'EUR', rate: 0.85, spread: 0.02 },
            { from: 'EUR', to: 'USD', rate: 1.18, spread: 0.02 },
            { from: 'USD', to: 'AED', rate: 3.67, spread: 0.015 },
            { from: 'AED', to: 'USD', rate: 0.27, spread: 0.015 }
        ];

        for (const rateData of defaultRates) {
            const rate = new ExchangeRate({
                ...rateData,
                tenantId,
                isActive: true,
                updatedBy: 'system',
                validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            });
            
            await rate.save({ session });
        }
    }

    /**
     * Setup default commission structures
     */
    async setupDefaultCommissions(tenantId, session) {
        const CommissionStructure = require('../models/CommissionStructure');
        
        const defaultCommissions = [
            {
                name: 'صرافی پایه',
                type: 'exchange',
                structure: {
                    type: 'percentage',
                    value: 0.5, // 0.5%
                    minAmount: 1,
                    maxAmount: 100
                },
                isDefault: true
            },
            {
                name: 'حواله پایه',
                type: 'remittance',
                structure: {
                    type: 'fixed',
                    value: 10, // $10 fixed
                    minAmount: 5,
                    maxAmount: 50
                },
                isDefault: true
            }
        ];

        for (const commissionData of defaultCommissions) {
            const commission = new CommissionStructure({
                ...commissionData,
                tenantId,
                isActive: true,
                createdBy: 'system'
            });
            
            await commission.save({ session });
        }
    }

    /**
     * Setup default limits
     */
    async setupDefaultLimits(tenantId, limitsConfig, session) {
        const TenantLimit = require('../models/TenantLimit');
        
        const defaultLimits = {
            daily: {
                maxTransactions: limitsConfig?.maxTransactionsPerDay || 100,
                maxAmount: limitsConfig?.maxTransactionAmount || 10000
            },
            monthly: {
                maxTransactions: (limitsConfig?.maxTransactionsPerDay || 100) * 30,
                maxAmount: (limitsConfig?.maxTransactionAmount || 10000) * 30
            },
            user: {
                maxTransactionsPerDay: 10,
                maxAmountPerTransaction: 1000,
                maxDailyAmount: 5000
            }
        };

        const limits = new TenantLimit({
            tenantId,
            limits: defaultLimits,
            isActive: true
        });
        
        await limits.save({ session });
    }

    /**
     * Bulk tenant creation from templates
     */
    async bulkCreateTenants(tenantsData) {
        const results = [];
        const errors = [];

        for (const tenantData of tenantsData) {
            try {
                const result = await this.createTenantAutomated(tenantData);
                results.push(result);
            } catch (error) {
                errors.push({
                    tenantData,
                    error: error.message
                });
            }
        }

        return {
            successful: results,
            failed: errors,
            total: tenantsData.length,
            successCount: results.length,
            errorCount: errors.length
        };
    }

    /**
     * Create tenant from template
     */
    async createFromTemplate(templateName, customData) {
        const templates = {
            'exchange-basic': {
                businessType: 'exchange',
                plan: 'basic',
                features: {
                    reports: true,
                    api: false,
                    p2p: false,
                    remittance: false,
                    crypto: false
                }
            },
            'remittance-pro': {
                businessType: 'remittance',
                plan: 'professional',
                features: {
                    reports: true,
                    api: true,
                    p2p: false,
                    remittance: true,
                    crypto: false
                }
            },
            'crypto-enterprise': {
                businessType: 'crypto',
                plan: 'enterprise',
                features: {
                    reports: true,
                    api: true,
                    p2p: true,
                    remittance: true,
                    crypto: true
                }
            }
        };

        const template = templates[templateName];
        if (!template) {
            throw new Error('Template not found');
        }

        const tenantData = {
            ...template,
            ...customData
        };

        return await this.createTenantAutomated(tenantData);
    }

    /**
     * Generate subdomain suggestion
     */
    generateSubdomainSuggestion(name) {
        let subdomain = name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 20);

        // Add random suffix if needed
        const random = Math.floor(Math.random() * 1000);
        return `${subdomain}${random}`;
    }

    /**
     * Validate tenant data
     */
    validateTenantData(tenantData) {
        const errors = [];

        if (!tenantData.name) {
            errors.push('نام صرافی الزامی است');
        }

        if (!tenantData.subdomain) {
            errors.push('دامنه فرعی الزامی است');
        } else if (!/^[a-z0-9-]+$/.test(tenantData.subdomain)) {
            errors.push('دامنه فرعی فقط می‌تواند شامل حروف انگلیسی، اعداد و خط تیره باشد');
        }

        if (!tenantData.admin?.email) {
            errors.push('ایمیل مدیر الزامی است');
        }

        if (!tenantData.admin?.password || tenantData.admin.password.length < 8) {
            errors.push('رمز عبور باید حداقل 8 کاراکتر باشد');
        }

        return errors;
    }
}

module.exports = new TenantAutomationService();