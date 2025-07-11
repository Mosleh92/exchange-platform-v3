// backend/src/models/sequelize/Tenant.js - Sequelize Tenant Model
const { DataTypes } = require('sequelize');
const sequelizeManager = require('../../config/sequelize');

const Tenant = sequelizeManager.getInstance().define('Tenant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [2, 100]
    }
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      is: /^[a-z0-9-]+$/
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING
  },
  website: {
    type: DataTypes.STRING,
    validate: {
      isUrl: true
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended', 'trial'),
    defaultValue: 'trial'
  },
  plan: {
    type: DataTypes.ENUM('basic', 'premium', 'enterprise'),
    defaultValue: 'basic'
  },
  parentId: {
    type: DataTypes.UUID,
    field: 'parent_id',
    references: {
      model: 'tenants',
      key: 'id'
    }
  },
  
  // Business information
  businessType: {
    type: DataTypes.ENUM('exchange', 'bank', 'remittance', 'broker', 'other'),
    defaultValue: 'exchange',
    field: 'business_type'
  },
  licenseNumber: {
    type: DataTypes.STRING,
    field: 'license_number'
  },
  registrationNumber: {
    type: DataTypes.STRING,
    field: 'registration_number'
  },
  taxId: {
    type: DataTypes.STRING,
    field: 'tax_id'
  },
  
  // Address information
  address: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  
  // Branding
  logo: {
    type: DataTypes.STRING
  },
  brandColors: {
    type: DataTypes.JSONB,
    defaultValue: {
      primary: '#1976d2',
      secondary: '#dc004e',
      accent: '#9c27b0'
    },
    field: 'brand_colors'
  },
  
  // Settings
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {
      timezone: 'UTC',
      currency: 'USD',
      language: 'en',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      enabledModules: [
        'cash_management',
        'bank_operations',
        'exchanges',
        'remittances',
        'reports'
      ],
      features: {
        twoFaRequired: false,
        maxDailyTransactionAmount: 100000,
        maxMonthlyTransactionAmount: 1000000,
        allowP2P: true,
        allowCrypto: false,
        enableApiAccess: false
      },
      notifications: {
        email: true,
        sms: false,
        webhook: false
      },
      security: {
        sessionTimeout: 30,
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true
        },
        ipWhitelist: [],
        allowedCountries: []
      }
    }
  },
  
  // Subscription information
  subscriptionStartDate: {
    type: DataTypes.DATE,
    field: 'subscription_start_date'
  },
  subscriptionEndDate: {
    type: DataTypes.DATE,
    field: 'subscription_end_date'
  },
  trialEndDate: {
    type: DataTypes.DATE,
    field: 'trial_end_date'
  },
  
  // Limits and quotas
  limits: {
    type: DataTypes.JSONB,
    defaultValue: {
      maxUsers: 100,
      maxBranches: 5,
      maxDailyTransactions: 1000,
      maxMonthlyVolume: 10000000,
      storageQuota: 5368709120 // 5GB
    }
  },
  
  // Usage statistics
  stats: {
    type: DataTypes.JSONB,
    defaultValue: {
      totalUsers: 0,
      totalBranches: 0,
      totalTransactions: 0,
      totalVolume: 0,
      storageUsed: 0
    }
  },
  
  // Contact information
  contactPerson: {
    type: DataTypes.JSONB,
    defaultValue: {},
    field: 'contact_person'
  },
  
  // Metadata
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'tenants',
  underscored: true,
  paranoid: true,
  indexes: [
    {
      unique: true,
      fields: ['slug']
    },
    {
      unique: true,
      fields: ['email']
    },
    {
      fields: ['status']
    },
    {
      fields: ['plan']
    },
    {
      fields: ['parent_id']
    },
    {
      fields: ['business_type']
    }
  ]
});

// Instance methods
Tenant.prototype.isActive = function() {
  return this.status === 'active';
};

Tenant.prototype.isTrialExpired = function() {
  return this.trialEndDate && this.trialEndDate < new Date();
};

Tenant.prototype.isSubscriptionExpired = function() {
  return this.subscriptionEndDate && this.subscriptionEndDate < new Date();
};

Tenant.prototype.canCreateUser = function() {
  return this.stats.totalUsers < this.limits.maxUsers;
};

Tenant.prototype.canCreateBranch = function() {
  return this.stats.totalBranches < this.limits.maxBranches;
};

Tenant.prototype.updateStats = async function(field, increment = 1) {
  const newStats = { ...this.stats };
  newStats[field] = (newStats[field] || 0) + increment;
  return this.update({ stats: newStats });
};

// Class methods
Tenant.findBySlug = function(slug) {
  return this.findOne({
    where: { 
      slug: slug,
      status: ['active', 'trial']
    }
  });
};

Tenant.findActive = function() {
  return this.findAll({
    where: {
      status: 'active'
    }
  });
};

module.exports = Tenant;