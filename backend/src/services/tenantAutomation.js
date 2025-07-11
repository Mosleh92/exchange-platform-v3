const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

/**
 * Automated Tenant Management Service
 * Creates tenants, branches, and users automatically with proper permissions
 */
class TenantAutomationService {
  constructor() {
    this.defaultPermissions = {
      SuperAdmin: ['*'], // All permissions
      TenantAdmin: [
        'tenant:read',
        'tenant:update',
        'branch:*',
        'user:*',
        'transaction:*',
        'report:*'
      ],
      BranchAdmin: [
        'branch:read',
        'branch:update',
        'user:read',
        'user:create',
        'user:update',
        'transaction:*',
        'customer:*'
      ],
      BranchUser: [
        'transaction:read',
        'transaction:create',
        'customer:read',
        'customer:create',
        'customer:update'
      ]
    };
  }

  /**
   * Create a complete tenant with branches and users
   * @param {Object} tenantData - Tenant creation data
   * @returns {Object} Created tenant with all associated data
   */
  async createTenantWithStructure(tenantData) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      logger.info('Starting tenant creation process', {
        tenantName: tenantData.name,
        branchCount: tenantData.branches?.length || 0,
        userCount: tenantData.users?.length || 0
      });

      // Step 1: Create the main tenant
      const tenant = await this.createTenant(tenantData, session);

      // Step 2: Create branches for the tenant
      const branches = [];
      if (tenantData.branches && tenantData.branches.length > 0) {
        for (const branchData of tenantData.branches) {
          const branch = await this.createBranch({
            ...branchData,
            tenantId: tenant._id
          }, session);
          branches.push(branch);
        }
      }

      // Step 3: Create users for the tenant and branches
      const users = [];
      if (tenantData.users && tenantData.users.length > 0) {
        for (const userData of tenantData.users) {
          const user = await this.createUser({
            ...userData,
            tenantId: tenant._id,
            branchId: userData.branchId || (branches[0]?._id)
          }, session);
          users.push(user);
        }
      }

      // Step 4: Create default settings and configurations
      await this.setupDefaultTenantSettings(tenant._id, session);

      // Step 5: Create audit log entry
      await this.createAuditLog({
        action: 'tenant_created',
        tenantId: tenant._id,
        details: {
          tenantName: tenant.name,
          branchesCreated: branches.length,
          usersCreated: users.length
        }
      }, session);

      await session.commitTransaction();

      logger.info('Tenant creation completed successfully', {
        tenantId: tenant._id,
        tenantName: tenant.name,
        branchesCreated: branches.length,
        usersCreated: users.length
      });

      return {
        success: true,
        tenant,
        branches,
        users,
        message: 'Tenant created successfully with all components'
      };

    } catch (error) {
      await session.abortTransaction();
      logger.error('Tenant creation failed', {
        error: error.message,
        stack: error.stack,
        tenantData
      });
      throw new Error(`Tenant creation failed: ${error.message}`);
    } finally {
      session.endSession();
    }
  }

  /**
   * Create a tenant entity
   */
  async createTenant(tenantData, session) {
    // Import here to avoid circular dependencies
    const Tenant = require('../models/Tenant');

    const tenantDoc = new Tenant({
      name: tenantData.name,
      domain: tenantData.domain || `${tenantData.name.toLowerCase().replace(/\s+/g, '')}.exchange.local`,
      settings: {
        currency: tenantData.currency || 'IRR',
        timezone: tenantData.timezone || 'Asia/Tehran',
        language: tenantData.language || 'fa',
        ...tenantData.settings
      },
      features: tenantData.features || [
        'basic_exchange',
        'multi_currency',
        'reporting',
        'user_management'
      ],
      subscriptionPlan: tenantData.subscriptionPlan || 'basic',
      isActive: true,
      createdAt: new Date()
    });

    return await tenantDoc.save({ session });
  }

  /**
   * Create a branch for a tenant
   */
  async createBranch(branchData, session) {
    const Branch = require('../models/Branch');

    const branchDoc = new Branch({
      name: branchData.name,
      tenantId: branchData.tenantId,
      location: branchData.location || {},
      contact: branchData.contact || {},
      settings: {
        workingHours: branchData.workingHours || {
          start: '08:00',
          end: '17:00',
          timezone: 'Asia/Tehran'
        },
        currencies: branchData.currencies || ['USD', 'EUR', 'IRR'],
        ...branchData.settings
      },
      limits: branchData.limits || {
        dailyTransactionLimit: 1000000, // 1M IRR
        monthlyTransactionLimit: 30000000 // 30M IRR
      },
      isActive: true,
      createdAt: new Date()
    });

    return await branchDoc.save({ session });
  }

  /**
   * Create a user with proper role and permissions
   */
  async createUser(userData, session) {
    const User = require('../models/User');

    // Hash password
    const hashedPassword = await bcrypt.hash(
      userData.password || this.generateRandomPassword(),
      parseInt(process.env.BCRYPT_ROUNDS) || 12
    );

    // Determine permissions based on role
    const permissions = this.defaultPermissions[userData.role] || 
                       this.defaultPermissions.BranchUser;

    const userDoc = new User({
      firstName: userData.firstName || userData.name?.split(' ')[0],
      lastName: userData.lastName || userData.name?.split(' ')[1] || '',
      email: userData.email,
      username: userData.username || userData.email,
      password: hashedPassword,
      role: userData.role || 'BranchUser',
      permissions,
      tenantId: userData.tenantId,
      branchId: userData.branchId,
      profile: {
        phone: userData.phone || '',
        nationalId: userData.nationalId || '',
        address: userData.address || {},
        ...userData.profile
      },
      settings: {
        language: userData.language || 'fa',
        timezone: userData.timezone || 'Asia/Tehran',
        notifications: {
          email: true,
          sms: userData.phone ? true : false,
          push: true
        },
        ...userData.settings
      },
      isActive: true,
      emailVerified: userData.emailVerified || false,
      twoFactorEnabled: false,
      createdAt: new Date()
    });

    return await userDoc.save({ session });
  }

  /**
   * Setup default tenant settings and configurations
   */
  async setupDefaultTenantSettings(tenantId, session) {
    // Create default exchange rates
    await this.createDefaultExchangeRates(tenantId, session);
    
    // Create default fee structures
    await this.createDefaultFeeStructures(tenantId, session);
    
    // Create default notification templates
    await this.createDefaultNotificationTemplates(tenantId, session);
  }

  /**
   * Create default exchange rates
   */
  async createDefaultExchangeRates(tenantId, session) {
    const ExchangeRate = require('../models/ExchangeRate');

    const defaultRates = [
      { from: 'USD', to: 'IRR', rate: 42000, isActive: true },
      { from: 'EUR', to: 'IRR', rate: 45000, isActive: true },
      { from: 'GBP', to: 'IRR', rate: 52000, isActive: true },
      { from: 'AED', to: 'IRR', rate: 11500, isActive: true }
    ];

    for (const rateData of defaultRates) {
      const rate = new ExchangeRate({
        ...rateData,
        tenantId,
        source: 'manual',
        lastUpdated: new Date(),
        createdAt: new Date()
      });
      await rate.save({ session });
    }
  }

  /**
   * Create default fee structures
   */
  async createDefaultFeeStructures(tenantId, session) {
    const CommissionStructure = require('../models/CommissionStructure');

    const defaultStructure = new CommissionStructure({
      tenantId,
      name: 'Default Commission Structure',
      type: 'percentage',
      tiers: [
        { minAmount: 0, maxAmount: 1000, rate: 0.5 },
        { minAmount: 1001, maxAmount: 10000, rate: 0.3 },
        { minAmount: 10001, maxAmount: 100000, rate: 0.2 },
        { minAmount: 100001, maxAmount: null, rate: 0.1 }
      ],
      isActive: true,
      createdAt: new Date()
    });

    await defaultStructure.save({ session });
  }

  /**
   * Create default notification templates
   */
  async createDefaultNotificationTemplates(tenantId, session) {
    const NotificationTemplate = require('../models/NotificationTemplate');

    const templates = [
      {
        name: 'Welcome Email',
        type: 'email',
        subject: 'Welcome to Exchange Platform',
        content: 'Welcome to our exchange platform. Your account has been created successfully.',
        variables: ['userName', 'tenantName']
      },
      {
        name: 'Transaction Confirmation',
        type: 'sms',
        content: 'Your transaction of {amount} {currency} has been processed successfully. Ref: {transactionId}',
        variables: ['amount', 'currency', 'transactionId']
      }
    ];

    for (const templateData of templates) {
      const template = new NotificationTemplate({
        ...templateData,
        tenantId,
        isActive: true,
        createdAt: new Date()
      });
      await template.save({ session });
    }
  }

  /**
   * Create audit log entry
   */
  async createAuditLog(logData, session) {
    const AuditLog = require('../models/AuditLog');

    const log = new AuditLog({
      action: logData.action,
      tenantId: logData.tenantId,
      userId: logData.userId || null,
      entityType: 'tenant',
      entityId: logData.tenantId,
      details: logData.details,
      ip: logData.ip || 'system',
      userAgent: logData.userAgent || 'automation-service',
      timestamp: new Date()
    });

    await log.save({ session });
  }

  /**
   * Generate a random password for users
   */
  generateRandomPassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  /**
   * Bulk create multiple tenants
   */
  async bulkCreateTenants(tenantsData) {
    const results = [];
    
    for (const tenantData of tenantsData) {
      try {
        const result = await this.createTenantWithStructure(tenantData);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          tenantData
        });
      }
    }

    return results;
  }

  /**
   * Get tenant creation status
   */
  async getTenantCreationStatus(tenantId) {
    const Tenant = require('../models/Tenant');
    const Branch = require('../models/Branch');
    const User = require('../models/User');

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const branches = await Branch.find({ tenantId }).countDocuments();
    const users = await User.find({ tenantId }).countDocuments();

    return {
      tenant: {
        id: tenant._id,
        name: tenant.name,
        domain: tenant.domain,
        isActive: tenant.isActive,
        createdAt: tenant.createdAt
      },
      statistics: {
        branchCount: branches,
        userCount: users
      }
    };
  }
}

module.exports = new TenantAutomationService();