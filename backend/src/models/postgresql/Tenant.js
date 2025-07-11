// src/models/postgresql/Tenant.js
module.exports = (sequelize, DataTypes) => {
  const Tenant = sequelize.define('Tenant', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    
    // Basic tenant information
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 255]
      }
    },
    
    domain: {
      type: DataTypes.STRING(255),
      unique: true,
      validate: {
        isUrl: true
      }
    },
    
    businessLicense: {
      type: DataTypes.STRING(255),
      field: 'business_license'
    },
    
    countryCode: {
      type: DataTypes.STRING(3),
      field: 'country_code',
      validate: {
        len: [2, 3]
      }
    },
    
    baseCurrency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD',
      field: 'base_currency',
      validate: {
        len: [3, 3],
        isUppercase: true
      }
    },
    
    // Subscription and billing
    subscriptionPlan: {
      type: DataTypes.ENUM('trial', 'basic', 'professional', 'enterprise'),
      defaultValue: 'trial',
      field: 'subscription_plan'
    },
    
    subscriptionStatus: {
      type: DataTypes.ENUM('trial', 'active', 'past_due', 'cancelled', 'suspended'),
      defaultValue: 'trial',
      field: 'subscription_status'
    },
    
    subscriptionStartDate: {
      type: DataTypes.DATE,
      field: 'subscription_start_date'
    },
    
    subscriptionEndDate: {
      type: DataTypes.DATE,
      field: 'subscription_end_date'
    },
    
    // Status and settings
    status: {
      type: DataTypes.ENUM('trial', 'active', 'suspended', 'cancelled'),
      defaultValue: 'trial'
    },
    
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {
        features: {
          multiCurrency: true,
          p2pTrading: true,
          reporting: true,
          apiAccess: false,
          whiteLabel: false
        },
        limits: {
          maxUsers: 100,
          maxTransactionsPerDay: 1000,
          maxStorageGB: 5
        },
        branding: {
          primaryColor: '#007bff',
          secondaryColor: '#6c757d',
          logoUrl: null,
          faviconUrl: null
        },
        notifications: {
          email: true,
          sms: false,
          webhook: false
        },
        security: {
          requireTwoFactor: false,
          ipWhitelisting: false,
          sessionTimeout: 3600
        }
      }
    },
    
    // Multi-tenant hierarchy
    parentId: {
      type: DataTypes.UUID,
      references: {
        model: 'Tenants',
        key: 'id'
      },
      field: 'parent_id'
    },
    
    tenantLevel: {
      type: DataTypes.ENUM('platform', 'tenant', 'branch', 'customer'),
      defaultValue: 'tenant',
      field: 'tenant_level'
    },
    
    // Contact information
    contactEmail: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'contact_email',
      validate: {
        isEmail: true
      }
    },
    
    contactPhone: {
      type: DataTypes.STRING(20),
      field: 'contact_phone'
    },
    
    // Address
    address: {
      type: DataTypes.JSONB,
      defaultValue: {},
      validate: {
        isValidAddress(value) {
          if (value && typeof value === 'object') {
            const allowedKeys = ['street', 'city', 'state', 'country', 'zipCode'];
            const keys = Object.keys(value);
            if (!keys.every(key => allowedKeys.includes(key))) {
              throw new Error('Invalid address format');
            }
          }
        }
      }
    },
    
    // Billing information
    billingInfo: {
      type: DataTypes.JSONB,
      field: 'billing_info',
      defaultValue: {
        paymentMethod: null,
        billingAddress: null,
        taxId: null,
        currency: 'USD'
      }
    },
    
    // Usage tracking
    usageStats: {
      type: DataTypes.JSONB,
      field: 'usage_stats',
      defaultValue: {
        currentUsers: 0,
        transactionsThisMonth: 0,
        storageUsedGB: 0,
        apiCallsThisMonth: 0,
        lastCalculated: null
      }
    },
    
    // Compliance and security
    complianceData: {
      type: DataTypes.JSONB,
      field: 'compliance_data',
      defaultValue: {
        kycRequired: true,
        amlCompliance: true,
        dataRetentionDays: 2555, // 7 years
        auditTrail: true
      }
    },
    
    // Integration settings
    integrations: {
      type: DataTypes.JSONB,
      defaultValue: {
        paymentGateways: [],
        exchangeAPIs: [],
        webhooks: [],
        thirdPartyServices: []
      }
    },
    
    // Operational data
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    
    lastActivityAt: {
      type: DataTypes.DATE,
      field: 'last_activity_at'
    },
    
    // Audit fields
    createdBy: {
      type: DataTypes.UUID,
      field: 'created_by'
    },
    
    updatedBy: {
      type: DataTypes.UUID,
      field: 'updated_by'
    }
  }, {
    tableName: 'tenants',
    timestamps: true,
    paranoid: true,
    
    indexes: [
      // Performance indexes
      { fields: ['domain'], unique: true },
      { fields: ['subscription_plan'] },
      { fields: ['status'] },
      { fields: ['parent_id'] },
      { fields: ['tenant_level'] },
      { fields: ['is_active'] },
      { fields: ['created_at'] },
      
      // Composite indexes for common queries
      { fields: ['parent_id', 'tenant_level'] },
      { fields: ['subscription_plan', 'status'] },
      { fields: ['is_active', 'status'] },
      
      // Partial indexes for performance
      { 
        fields: ['subscription_end_date'], 
        where: { subscription_status: 'active' },
        name: 'idx_tenants_active_subscription_end'
      },
      {
        fields: ['last_activity_at'],
        where: { is_active: true },
        name: 'idx_tenants_active_last_activity'
      }
    ],
    
    // Scopes for common queries
    scopes: {
      active: {
        where: { isActive: true }
      },
      
      byPlan: (plan) => ({
        where: { subscriptionPlan: plan }
      }),
      
      byLevel: (level) => ({
        where: { tenantLevel: level }
      }),
      
      withParent: {
        include: [{
          model: sequelize.models.Tenant,
          as: 'parent',
          required: false
        }]
      },
      
      withChildren: {
        include: [{
          model: sequelize.models.Tenant,
          as: 'children',
          required: false
        }]
      }
    },
    
    // Hooks for business logic
    hooks: {
      beforeCreate: async (tenant) => {
        // Set subscription start date for new tenants
        if (!tenant.subscriptionStartDate) {
          tenant.subscriptionStartDate = new Date();
        }
        
        // Set trial end date
        if (tenant.subscriptionPlan === 'trial') {
          const trialDays = 30;
          tenant.subscriptionEndDate = new Date(Date.now() + (trialDays * 24 * 60 * 60 * 1000));
        }
      },
      
      beforeUpdate: async (tenant) => {
        tenant.updatedAt = new Date();
      },
      
      afterCreate: async (tenant) => {
        // Initialize default settings if not provided
        if (!tenant.settings) {
          await tenant.update({
            settings: {
              features: {
                multiCurrency: true,
                p2pTrading: tenant.subscriptionPlan !== 'trial',
                reporting: true,
                apiAccess: ['professional', 'enterprise'].includes(tenant.subscriptionPlan),
                whiteLabel: tenant.subscriptionPlan === 'enterprise'
              },
              limits: {
                maxUsers: tenant.subscriptionPlan === 'trial' ? 5 : 
                         tenant.subscriptionPlan === 'basic' ? 50 :
                         tenant.subscriptionPlan === 'professional' ? 200 : 1000,
                maxTransactionsPerDay: tenant.subscriptionPlan === 'trial' ? 100 :
                                     tenant.subscriptionPlan === 'basic' ? 1000 :
                                     tenant.subscriptionPlan === 'professional' ? 5000 : 25000,
                maxStorageGB: tenant.subscriptionPlan === 'trial' ? 1 :
                             tenant.subscriptionPlan === 'basic' ? 5 :
                             tenant.subscriptionPlan === 'professional' ? 25 : 100
              }
            }
          });
        }
      }
    }
  });
  
  // Instance methods
  Tenant.prototype.isTrialExpired = function() {
    return this.subscriptionPlan === 'trial' && 
           this.subscriptionEndDate && 
           new Date() > this.subscriptionEndDate;
  };
  
  Tenant.prototype.canUpgrade = function() {
    const upgradePaths = {
      trial: ['basic', 'professional', 'enterprise'],
      basic: ['professional', 'enterprise'],
      professional: ['enterprise'],
      enterprise: []
    };
    return upgradePaths[this.subscriptionPlan] || [];
  };
  
  Tenant.prototype.updateUsageStats = async function(stats) {
    const currentStats = this.usageStats || {};
    const updatedStats = {
      ...currentStats,
      ...stats,
      lastCalculated: new Date()
    };
    
    return await this.update({ usageStats: updatedStats });
  };
  
  Tenant.prototype.hasFeature = function(feature) {
    return this.settings?.features?.[feature] === true;
  };
  
  Tenant.prototype.getLimit = function(limitType) {
    return this.settings?.limits?.[limitType] || 0;
  };
  
  // Model associations
  Tenant.associate = (models) => {
    // Self-referential association for tenant hierarchy
    Tenant.belongsTo(models.Tenant, {
      as: 'parent',
      foreignKey: 'parentId'
    });
    
    Tenant.hasMany(models.Tenant, {
      as: 'children',
      foreignKey: 'parentId'
    });
    
    // Tenant has many users
    Tenant.hasMany(models.User, {
      foreignKey: 'tenantId',
      as: 'users'
    });
    
    // Tenant has many account balances
    Tenant.hasMany(models.AccountBalance, {
      foreignKey: 'tenantId',
      as: 'accountBalances'
    });
    
    // Tenant has many transactions
    Tenant.hasMany(models.Transaction, {
      foreignKey: 'tenantId',
      as: 'transactions'
    });
  };
  
  return Tenant;
};