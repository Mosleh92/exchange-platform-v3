const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

/**
 * Tenant Automation Service
 * Handles automated creation of tenants, branches, and users
 */
class TenantAutomationService {
    constructor() {
        this.defaultPermissions = {
            'SuperAdmin': ['read', 'write', 'delete', 'manage_users', 'manage_tenants'],
            'TenantAdmin': ['read', 'write', 'delete', 'manage_users'],
            'BranchAdmin': ['read', 'write', 'manage_branch_users'],
            'Operator': ['read', 'write'],
            'Viewer': ['read']
        };
    }

    /**
     * Create complete tenant structure
     */
    async createTenantStructure(tenantData) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            logger.info('Starting tenant creation process', { tenantName: tenantData.name });

            // 1. Create main tenant
            const tenant = await this.createTenant(tenantData, session);

            // 2. Create branches
            const branches = [];
            if (tenantData.branches && tenantData.branches.length > 0) {
                for (const branchData of tenantData.branches) {
                    const branch = await this.createBranch(tenant._id, branchData, session);
                    branches.push(branch);
                }
            }

            // 3. Create users
            const users = [];
            if (tenantData.users && tenantData.users.length > 0) {
                for (const userData of tenantData.users) {
                    const user = await this.createUser(tenant._id, userData, branches, session);
                    users.push(user);
                }
            }

            // 4. Set up default configurations
            await this.setupDefaultConfigurations(tenant._id, session);

            // 5. Create default data
            await this.seedDefaultData(tenant._id, session);

            await session.commitTransaction();

            logger.info('Tenant structure created successfully', {
                tenantId: tenant._id,
                branchCount: branches.length,
                userCount: users.length
            });

            return {
                tenant,
                branches,
                users,
                success: true,
                message: 'ساختار صرافی با موفقیت ایجاد شد'
            };

        } catch (error) {
            await session.abortTransaction();
            logger.error('Error creating tenant structure', { error: error.message });
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Create tenant record
     */
    async createTenant(tenantData, session) {
        const Tenant = mongoose.model('Tenant');
        
        const tenant = new Tenant({
            name: tenantData.name,
            code: this.generateTenantCode(tenantData.name),
            settings: {
                timezone: tenantData.timezone || 'Asia/Tehran',
                currency: tenantData.currency || 'IRR',
                language: tenantData.language || 'fa',
                features: tenantData.features || ['trading', 'remittance', 'reports']
            },
            status: 'active',
            createdAt: new Date(),
            metadata: {
                autoCreated: true,
                creationSource: 'automation_api'
            }
        });

        await tenant.save({ session });
        return tenant;
    }

    /**
     * Create branch for tenant
     */
    async createBranch(tenantId, branchData, session) {
        const Branch = mongoose.model('Branch');
        
        const branch = new Branch({
            tenantId,
            name: branchData.name,
            code: this.generateBranchCode(branchData.name),
            address: branchData.address || '',
            phone: branchData.phone || '',
            email: branchData.email || '',
            settings: {
                operatingHours: branchData.operatingHours || {
                    open: '08:00',
                    close: '17:00',
                    timezone: 'Asia/Tehran'
                },
                services: branchData.services || ['exchange', 'remittance']
            },
            status: 'active',
            createdAt: new Date()
        });

        await branch.save({ session });
        return branch;
    }

    /**
     * Create user with role assignment
     */
    async createUser(tenantId, userData, branches, session) {
        const User = mongoose.model('User');
        
        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password || this.generateRandomPassword(), 12);
        
        // Assign branch if role is BranchAdmin
        let assignedBranchId = null;
        if (userData.role === 'BranchAdmin' && branches.length > 0) {
            assignedBranchId = userData.branchId || branches[0]._id;
        }

        const user = new User({
            tenantId,
            branchId: assignedBranchId,
            username: userData.username || this.generateUsername(userData.name),
            email: userData.email,
            phone: userData.phone,
            password: hashedPassword,
            name: userData.name,
            role: userData.role || 'Operator',
            permissions: this.defaultPermissions[userData.role] || this.defaultPermissions['Operator'],
            settings: {
                language: 'fa',
                timezone: 'Asia/Tehran',
                notifications: {
                    email: true,
                    sms: false,
                    push: true
                }
            },
            status: 'active',
            isVerified: true,
            createdAt: new Date(),
            metadata: {
                autoCreated: true,
                initialPassword: userData.password ? false : true
            }
        });

        await user.save({ session });
        return user;
    }

    /**
     * Setup default configurations for tenant
     */
    async setupDefaultConfigurations(tenantId, session) {
        const TenantConfig = mongoose.model('TenantConfig');
        
        const configs = [
            {
                tenantId,
                key: 'exchange_rates_source',
                value: 'manual',
                type: 'string'
            },
            {
                tenantId,
                key: 'default_commission_rate',
                value: 0.5,
                type: 'number'
            },
            {
                tenantId,
                key: 'max_daily_transaction_limit',
                value: 1000000,
                type: 'number'
            },
            {
                tenantId,
                key: 'require_document_verification',
                value: true,
                type: 'boolean'
            },
            {
                tenantId,
                key: 'auto_backup_enabled',
                value: true,
                type: 'boolean'
            }
        ];

        for (const config of configs) {
            const tenantConfig = new TenantConfig(config);
            await tenantConfig.save({ session });
        }
    }

    /**
     * Seed default data for tenant
     */
    async seedDefaultData(tenantId, session) {
        // Create default currency pairs
        const CurrencyPair = mongoose.model('CurrencyPair');
        
        const defaultPairs = [
            { base: 'USD', quote: 'IRR', rate: 50000, tenantId },
            { base: 'EUR', quote: 'IRR', rate: 55000, tenantId },
            { base: 'AED', quote: 'IRR', rate: 13500, tenantId },
            { base: 'TRY', quote: 'IRR', rate: 1500, tenantId }
        ];

        for (const pair of defaultPairs) {
            const currencyPair = new CurrencyPair({
                ...pair,
                status: 'active',
                lastUpdated: new Date(),
                createdAt: new Date()
            });
            await currencyPair.save({ session });
        }

        // Create default account types
        const AccountType = mongoose.model('AccountType');
        
        const defaultAccountTypes = [
            { name: 'حساب جاری', code: 'CURRENT', tenantId },
            { name: 'حساب پس‌انداز', code: 'SAVINGS', tenantId },
            { name: 'حساب ارزی', code: 'FOREIGN', tenantId }
        ];

        for (const accountType of defaultAccountTypes) {
            const accType = new AccountType({
                ...accountType,
                status: 'active',
                createdAt: new Date()
            });
            await accType.save({ session });
        }
    }

    /**
     * Generate unique tenant code
     */
    generateTenantCode(name) {
        const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const timestamp = Date.now().toString().slice(-4);
        return `${cleanName.substring(0, 4)}${timestamp}`;
    }

    /**
     * Generate unique branch code
     */
    generateBranchCode(name) {
        const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const random = Math.random().toString(36).substring(2, 5).toUpperCase();
        return `BR_${cleanName.substring(0, 3)}${random}`;
    }

    /**
     * Generate username from name
     */
    generateUsername(name) {
        const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const random = Math.random().toString(36).substring(2, 5);
        return `${cleanName.substring(0, 6)}${random}`;
    }

    /**
     * Generate random password
     */
    generateRandomPassword() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    /**
     * Get tenant structure details
     */
    async getTenantStructure(tenantId) {
        const Tenant = mongoose.model('Tenant');
        const Branch = mongoose.model('Branch');
        const User = mongoose.model('User');

        const tenant = await Tenant.findById(tenantId);
        if (!tenant) {
            throw new Error('صرافی یافت نشد');
        }

        const branches = await Branch.find({ tenantId });
        const users = await User.find({ tenantId }).select('-password');

        return {
            tenant,
            branches,
            users,
            statistics: {
                branchCount: branches.length,
                userCount: users.length,
                activeUsers: users.filter(u => u.status === 'active').length
            }
        };
    }

    /**
     * Update tenant structure
     */
    async updateTenantStructure(tenantId, updates) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const Tenant = mongoose.model('Tenant');
            
            const tenant = await Tenant.findByIdAndUpdate(
                tenantId, 
                { 
                    ...updates, 
                    updatedAt: new Date() 
                },
                { session, new: true }
            );

            await session.commitTransaction();
            
            logger.info('Tenant structure updated', { tenantId });
            
            return tenant;

        } catch (error) {
            await session.abortTransaction();
            logger.error('Error updating tenant structure', { error: error.message });
            throw error;
        } finally {
            session.endSession();
        }
    }
}

module.exports = new TenantAutomationService();