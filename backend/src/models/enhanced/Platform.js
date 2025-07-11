// backend/src/models/enhanced/Platform.js
const mongoose = require('mongoose');

/**
 * Platform Model - Root level of the hierarchy
 * Platform → Tenant → Branch → Customer
 */
const platformSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  version: {
    type: String,
    required: true,
    default: '3.0.0'
  },
  status: {
    type: String,
    enum: ['active', 'maintenance', 'inactive'],
    default: 'active'
  },
  configuration: {
    // Global platform settings
    security: {
      maxLoginAttempts: { type: Number, default: 5 },
      sessionTimeout: { type: Number, default: 1800000 }, // 30 minutes
      passwordPolicy: {
        minLength: { type: Number, default: 8 },
        requireUppercase: { type: Boolean, default: true },
        requireNumbers: { type: Boolean, default: true },
        requireSymbols: { type: Boolean, default: true }
      },
      twoFactorRequired: { type: Boolean, default: false }
    },
    features: {
      enabledModules: [{
        type: String,
        enum: ['trading', 'p2p', 'remittance', 'payments', 'analytics', 'billing']
      }],
      apiRateLimit: { type: Number, default: 1000 }, // per hour
      maxTenantsPerPlatform: { type: Number, default: 1000 }
    },
    compliance: {
      kycRequired: { type: Boolean, default: true },
      amlEnabled: { type: Boolean, default: true },
      dataRetentionDays: { type: Number, default: 2555 }, // 7 years
      auditLogEnabled: { type: Boolean, default: true }
    },
    performance: {
      cacheEnabled: { type: Boolean, default: true },
      cacheTTL: { type: Number, default: 300000 }, // 5 minutes
      autoScalingEnabled: { type: Boolean, default: true },
      maxConcurrentConnections: { type: Number, default: 10000 }
    }
  },
  resources: {
    // Resource allocation and limits
    database: {
      maxConnections: { type: Number, default: 100 },
      queryTimeout: { type: Number, default: 30000 }
    },
    storage: {
      maxTotalStorage: { type: Number, default: 1099511627776 }, // 1TB
      backupRetentionDays: { type: Number, default: 30 }
    },
    compute: {
      maxCpuCores: { type: Number, default: 16 },
      maxMemoryGB: { type: Number, default: 64 }
    }
  },
  monitoring: {
    metricsEnabled: { type: Boolean, default: true },
    alertsEnabled: { type: Boolean, default: true },
    logLevel: { type: String, enum: ['error', 'warn', 'info', 'debug'], default: 'info' }
  },
  billing: {
    currency: { type: String, default: 'USD' },
    billingCycle: { type: String, enum: ['monthly', 'quarterly', 'annually'], default: 'monthly' },
    gracePeriodDays: { type: Number, default: 7 }
  },
  maintenance: {
    scheduledMaintenanceWindow: {
      day: { type: String, enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] },
      startTime: String, // HH:MM format
      duration: Number // minutes
    },
    lastMaintenanceDate: Date,
    nextMaintenanceDate: Date
  },
  contact: {
    supportEmail: String,
    supportPhone: String,
    emergencyContact: String,
    timezone: { type: String, default: 'UTC' }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// Indexes for performance
platformSchema.index({ code: 1 }, { unique: true });
platformSchema.index({ status: 1 });
platformSchema.index({ createdAt: -1 });

// Update the updatedAt field before saving
platformSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static methods for platform management
platformSchema.statics.getActivePlatforms = function() {
  return this.find({ status: 'active' });
};

platformSchema.statics.getPlatformByCode = function(code) {
  return this.findOne({ code: code.toUpperCase() });
};

// Instance methods
platformSchema.methods.getTenantCount = async function() {
  const Tenant = mongoose.model('EnhancedTenant');
  return await Tenant.countDocuments({ platformId: this._id });
};

platformSchema.methods.getResourceUsage = async function() {
  // Calculate current resource usage across all tenants
  const Tenant = mongoose.model('EnhancedTenant');
  const tenants = await Tenant.find({ platformId: this._id });
  
  let totalUsers = 0;
  let totalStorage = 0;
  let totalTransactions = 0;
  
  for (const tenant of tenants) {
    totalUsers += await tenant.getUserCount();
    totalStorage += await tenant.getStorageUsage();
    totalTransactions += await tenant.getTransactionCount();
  }
  
  return {
    tenants: tenants.length,
    users: totalUsers,
    storage: totalStorage,
    transactions: totalTransactions,
    utilizationPercentage: {
      tenants: (tenants.length / this.configuration.features.maxTenantsPerPlatform) * 100,
      storage: (totalStorage / this.resources.storage.maxTotalStorage) * 100
    }
  };
};

platformSchema.methods.isFeatureEnabled = function(feature) {
  return this.configuration.features.enabledModules.includes(feature);
};

platformSchema.methods.getMaintenanceWindow = function() {
  return this.maintenance.scheduledMaintenanceWindow;
};

module.exports = mongoose.model('Platform', platformSchema);