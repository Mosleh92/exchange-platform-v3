// backend/src/models/enhanced/EnhancedTenant.js
const mongoose = require('mongoose');

/**
 * Enhanced Tenant Model - Second level of the hierarchy
 * Platform → Tenant → Branch → Customer
 */
const enhancedTenantSchema = new mongoose.Schema({
  platformId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Platform',
    required: true
  },
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
  subdomain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens']
  },
  domain: {
    type: String,
    trim: true,
    lowercase: true
  },
  type: {
    type: String,
    enum: ['enterprise', 'business', 'startup', 'individual'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'trial', 'expired', 'inactive'],
    default: 'trial'
  },
  tier: {
    type: String,
    enum: ['basic', 'professional', 'enterprise', 'custom'],
    default: 'basic'
  },
  subscription: {
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'TenantPlan' },
    status: { type: String, enum: ['active', 'suspended', 'cancelled', 'past_due'], default: 'active' },
    startDate: { type: Date, default: Date.now },
    endDate: Date,
    autoRenew: { type: Boolean, default: true },
    billingCycle: { type: String, enum: ['monthly', 'quarterly', 'annually'], default: 'monthly' },
    nextBillingDate: Date,
    paymentMethodId: String
  },
  configuration: {
    // Tenant-specific settings
    security: {
      passwordPolicy: {
        minLength: { type: Number, default: 8 },
        requireUppercase: { type: Boolean, default: true },
        requireNumbers: { type: Boolean, default: true },
        requireSymbols: { type: Boolean, default: false }
      },
      twoFactorRequired: { type: Boolean, default: false },
      ipWhitelisting: { type: Boolean, default: false },
      allowedIPs: [String],
      sessionTimeout: { type: Number, default: 1800000 }, // 30 minutes
      maxConcurrentSessions: { type: Number, default: 5 }
    },
    features: {
      enabledModules: [{
        type: String,
        enum: ['trading', 'p2p', 'remittance', 'payments', 'analytics', 'reporting', 'api']
      }],
      customFeatures: [String],
      apiAccess: { type: Boolean, default: false },
      webhookEnabled: { type: Boolean, default: false },
      whiteLabel: { type: Boolean, default: false }
    },
    limits: {
      maxUsers: { type: Number, default: 50 },
      maxBranches: { type: Number, default: 5 },
      maxTransactionsPerDay: { type: Number, default: 1000 },
      maxTransactionAmount: { type: Number, default: 100000 },
      maxStorageGB: { type: Number, default: 10 },
      maxApiCallsPerHour: { type: Number, default: 1000 }
    },
    compliance: {
      kycLevel: { type: String, enum: ['basic', 'enhanced', 'premium'], default: 'basic' },
      amlChecks: { type: Boolean, default: true },
      sanctionsScreening: { type: Boolean, default: true },
      pepScreening: { type: Boolean, default: false },
      dataRetentionDays: { type: Number, default: 2555 }, // 7 years
      regulatoryJurisdiction: [String]
    },
    notifications: {
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
      pushNotifications: { type: Boolean, default: true },
      webhookNotifications: { type: Boolean, default: false },
      notificationEmail: String,
      notificationPhone: String
    }
  },
  branding: {
    logo: String,
    favicon: String,
    primaryColor: { type: String, default: '#007bff' },
    secondaryColor: { type: String, default: '#6c757d' },
    customCSS: String,
    customDomain: String,
    sslCertificate: String
  },
  contact: {
    companyName: String,
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    phone: String,
    email: { type: String, required: true },
    website: String,
    timezone: { type: String, default: 'UTC' },
    businessHours: {
      monday: { start: String, end: String },
      tuesday: { start: String, end: String },
      wednesday: { start: String, end: String },
      thursday: { start: String, end: String },
      friday: { start: String, end: String },
      saturday: { start: String, end: String },
      sunday: { start: String, end: String }
    }
  },
  billing: {
    currency: { type: String, default: 'USD' },
    paymentTerms: { type: Number, default: 30 }, // days
    taxId: String,
    vatNumber: String,
    billingAddress: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    }
  },
  usage: {
    currentUsers: { type: Number, default: 0 },
    currentBranches: { type: Number, default: 0 },
    currentStorageBytes: { type: Number, default: 0 },
    monthlyTransactions: { type: Number, default: 0 },
    monthlyApiCalls: { type: Number, default: 0 },
    lastUsageUpdate: { type: Date, default: Date.now }
  },
  integration: {
    apiKeys: [{
      name: String,
      key: String,
      permissions: [String],
      active: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now },
      lastUsed: Date
    }],
    webhooks: [{
      url: String,
      events: [String],
      active: { type: Boolean, default: true },
      secret: String,
      createdAt: { type: Date, default: Date.now }
    }],
    ssoProvider: {
      enabled: { type: Boolean, default: false },
      provider: String, // 'google', 'microsoft', 'okta', etc.
      configuration: mongoose.Schema.Types.Mixed
    }
  },
  metadata: {
    industry: String,
    companySize: { type: String, enum: ['1-10', '11-50', '51-200', '201-1000', '1000+'] },
    expectedVolume: { type: String, enum: ['low', 'medium', 'high', 'enterprise'] },
    referralSource: String,
    salesRepId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    onboardingCompleted: { type: Boolean, default: false },
    onboardingSteps: [{
      step: String,
      completed: { type: Boolean, default: false },
      completedAt: Date
    }]
  },
  trialInfo: {
    isTrialActive: { type: Boolean, default: false },
    trialStartDate: Date,
    trialEndDate: Date,
    trialFeatures: [String],
    conversionDate: Date
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// Compound indexes for performance and uniqueness
enhancedTenantSchema.index({ platformId: 1, code: 1 });
enhancedTenantSchema.index({ subdomain: 1 }, { unique: true });
enhancedTenantSchema.index({ status: 1 });
enhancedTenantSchema.index({ type: 1, tier: 1 });
enhancedTenantSchema.index({ 'subscription.status': 1 });
enhancedTenantSchema.index({ createdAt: -1 });

// Update the updatedAt field before saving
enhancedTenantSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for full domain
enhancedTenantSchema.virtual('fullDomain').get(function() {
  return this.domain || `${this.subdomain}.exchangeplatform.com`;
});

// Static methods
enhancedTenantSchema.statics.findBySubdomain = function(subdomain) {
  return this.findOne({ subdomain: subdomain.toLowerCase() });
};

enhancedTenantSchema.statics.findActiveTenants = function() {
  return this.find({ status: 'active' });
};

enhancedTenantSchema.statics.findByPlatform = function(platformId) {
  return this.find({ platformId });
};

// Instance methods
enhancedTenantSchema.methods.getBranchCount = async function() {
  const EnhancedBranch = mongoose.model('EnhancedBranch');
  return await EnhancedBranch.countDocuments({ tenantId: this._id });
};

enhancedTenantSchema.methods.getUserCount = async function() {
  const User = mongoose.model('User');
  return await User.countDocuments({ tenantId: this._id });
};

enhancedTenantSchema.methods.getCustomerCount = async function() {
  const EnhancedCustomer = mongoose.model('EnhancedCustomer');
  return await EnhancedCustomer.countDocuments({ tenantId: this._id });
};

enhancedTenantSchema.methods.getTransactionCount = async function() {
  const Transaction = mongoose.model('Transaction');
  return await Transaction.countDocuments({ tenantId: this._id });
};

enhancedTenantSchema.methods.getStorageUsage = async function() {
  // Calculate storage usage from documents and attachments
  // This is a simplified calculation
  return this.usage.currentStorageBytes || 0;
};

enhancedTenantSchema.methods.isFeatureEnabled = function(feature) {
  return this.configuration.features.enabledModules.includes(feature);
};

enhancedTenantSchema.methods.hasReachedLimit = function(limitType) {
  const usage = this.usage;
  const limits = this.configuration.limits;
  
  switch (limitType) {
    case 'users':
      return usage.currentUsers >= limits.maxUsers;
    case 'branches':
      return usage.currentBranches >= limits.maxBranches;
    case 'storage':
      return usage.currentStorageBytes >= (limits.maxStorageGB * 1024 * 1024 * 1024);
    case 'transactions':
      return usage.monthlyTransactions >= limits.maxTransactionsPerDay * 30;
    case 'api':
      return usage.monthlyApiCalls >= limits.maxApiCallsPerHour * 24 * 30;
    default:
      return false;
  }
};

enhancedTenantSchema.methods.updateUsage = async function(metric, value) {
  this.usage[metric] = value;
  this.usage.lastUsageUpdate = new Date();
  await this.save();
};

enhancedTenantSchema.methods.generateApiKey = function(name, permissions = []) {
  const crypto = require('crypto');
  const apiKey = {
    name,
    key: `tk_${crypto.randomBytes(32).toString('hex')}`,
    permissions,
    active: true,
    createdAt: new Date()
  };
  
  this.integration.apiKeys.push(apiKey);
  return apiKey;
};

enhancedTenantSchema.methods.isTrialExpired = function() {
  if (!this.trialInfo.isTrialActive) return false;
  return new Date() > this.trialInfo.trialEndDate;
};

enhancedTenantSchema.methods.getDashboardStats = async function() {
  const stats = {
    users: await this.getUserCount(),
    branches: await this.getBranchCount(),
    customers: await this.getCustomerCount(),
    transactions: await this.getTransactionCount(),
    storage: await this.getStorageUsage(),
    limits: this.configuration.limits,
    utilizationPercentage: {}
  };
  
  // Calculate utilization percentages
  stats.utilizationPercentage = {
    users: (stats.users / stats.limits.maxUsers) * 100,
    branches: (stats.branches / stats.limits.maxBranches) * 100,
    storage: (stats.storage / (stats.limits.maxStorageGB * 1024 * 1024 * 1024)) * 100
  };
  
  return stats;
};

module.exports = mongoose.model('EnhancedTenant', enhancedTenantSchema);