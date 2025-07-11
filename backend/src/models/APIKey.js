const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema({
  // API Key Information
  keyId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  keyHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  keyName: {
    type: String,
    required: true
  },
  keySecret: {
    type: String,
    required: true
  },

  // User and Tenant Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },

  // API Key Configuration
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'REVOKED'],
    default: 'ACTIVE',
    index: true
  },
  
  keyType: {
    type: String,
    enum: ['TRADING', 'READ_ONLY', 'FULL_ACCESS', 'WEBHOOK', 'ADMIN'],
    required: true
  },

  // Permissions and Scopes
  permissions: [{
    resource: {
      type: String,
      enum: [
        'ACCOUNT', 'BALANCE', 'TRANSACTION', 'ORDER', 'TRADE',
        'MARKET_DATA', 'HISTORICAL_DATA', 'ANALYTICS',
        'USER_PROFILE', 'KYC', 'COMPLIANCE',
        'WEBHOOK', 'NOTIFICATION', 'ADMIN'
      ],
      required: true
    },
    actions: [{
      type: String,
      enum: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXECUTE'],
      required: true
    }],
    conditions: mongoose.Schema.Types.Mixed // Additional conditions like IP restrictions
  }],

  scopes: [String], // OAuth-style scopes

  // Rate Limiting Configuration
  rateLimits: {
    requestsPerSecond: { type: Number, default: 10 },
    requestsPerMinute: { type: Number, default: 600 },
    requestsPerHour: { type: Number, default: 36000 },
    requestsPerDay: { type: Number, default: 864000 },
    burstLimit: { type: Number, default: 50 }, // Burst allowance
    
    // Endpoint-specific limits
    endpointLimits: [{
      endpoint: String,
      method: String,
      requestsPerSecond: Number,
      requestsPerMinute: Number,
      requestsPerHour: Number
    }],
    
    // Trading-specific limits
    tradingLimits: {
      ordersPerSecond: { type: Number, default: 5 },
      ordersPerMinute: { type: Number, default: 100 },
      ordersPerHour: { type: Number, default: 1000 },
      maxOrderValue: Number,
      maxDailyVolume: Number
    }
  },

  // Usage Statistics
  usage: {
    totalRequests: { type: Number, default: 0 },
    requestsToday: { type: Number, default: 0 },
    requestsThisMonth: { type: Number, default: 0 },
    lastUsed: Date,
    lastIP: String,
    lastUserAgent: String,
    
    // Recent usage tracking
    dailyUsage: [{
      date: { type: Date, required: true },
      requests: { type: Number, default: 0 },
      errors: { type: Number, default: 0 },
      rateLimitExceeded: { type: Number, default: 0 }
    }],
    
    // Endpoint usage breakdown
    endpointUsage: [{
      endpoint: String,
      method: String,
      count: { type: Number, default: 0 },
      lastUsed: Date,
      avgResponseTime: Number,
      errorRate: Number
    }]
  },

  // Security Configuration
  security: {
    ipWhitelist: [String],
    ipBlacklist: [String],
    requireIPWhitelist: { type: Boolean, default: false },
    
    // Geographic restrictions
    allowedCountries: [String],
    blockedCountries: [String],
    
    // Time-based restrictions
    allowedTimeRanges: [{
      startTime: String, // HH:MM format
      endTime: String,
      timezone: String,
      daysOfWeek: [Number] // 0=Sunday, 1=Monday, etc.
    }],
    
    // Authentication settings
    requireSignature: { type: Boolean, default: true },
    signatureMethod: { type: String, enum: ['HMAC-SHA256', 'RSA-SHA256'], default: 'HMAC-SHA256' },
    timestampTolerance: { type: Number, default: 300 }, // seconds
    
    // Additional security features
    requireTLS: { type: Boolean, default: true },
    allowedUserAgents: [String],
    blockedUserAgents: [String]
  },

  // Webhook Configuration
  webhooks: [{
    url: { type: String, required: true },
    events: [String],
    isActive: { type: Boolean, default: true },
    secret: String,
    retryPolicy: {
      maxRetries: { type: Number, default: 3 },
      retryDelay: { type: Number, default: 1000 }, // milliseconds
      backoffMultiplier: { type: Number, default: 2 }
    },
    lastDelivery: Date,
    lastStatus: String,
    failureCount: { type: Number, default: 0 }
  }],

  // Monitoring and Alerting
  monitoring: {
    enableRealTimeMonitoring: { type: Boolean, default: true },
    enableUsageAlerts: { type: Boolean, default: true },
    enableSecurityAlerts: { type: Boolean, default: true },
    
    alertThresholds: {
      usageThreshold: { type: Number, default: 80 }, // percentage of rate limit
      errorRateThreshold: { type: Number, default: 10 }, // percentage
      consecutiveFailuresThreshold: { type: Number, default: 5 }
    },
    
    notificationChannels: [{
      type: { type: String, enum: ['EMAIL', 'SMS', 'WEBHOOK', 'SLACK'] },
      endpoint: String,
      enabled: { type: Boolean, default: true }
    }]
  },

  // API Version and Environment
  apiVersion: {
    type: String,
    default: 'v1'
  },
  environment: {
    type: String,
    enum: ['PRODUCTION', 'STAGING', 'DEVELOPMENT', 'SANDBOX'],
    default: 'PRODUCTION'
  },

  // Metadata
  metadata: {
    description: String,
    tags: [String],
    applicationName: String,
    applicationVersion: String,
    integrationType: String, // WEB, MOBILE, SERVER, etc.
    customFields: mongoose.Schema.Types.Mixed
  },

  // Audit Information
  auditInfo: {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastModifiedAt: Date,
    revisionHistory: [{
      modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      modifiedAt: { type: Date, default: Date.now },
      changes: mongoose.Schema.Types.Mixed,
      reason: String
    }]
  },

  // Expiry and Rotation
  expiresAt: Date,
  autoRotate: { type: Boolean, default: false },
  rotationPeriod: Number, // days
  lastRotated: Date,
  previousKeys: [{
    keyHash: String,
    rotatedAt: Date,
    expiresAt: Date
  }],

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for performance
apiKeySchema.index({ keyId: 1 }, { unique: true });
apiKeySchema.index({ keyHash: 1 }, { unique: true });
apiKeySchema.index({ userId: 1, status: 1 });
apiKeySchema.index({ tenantId: 1, status: 1 });
apiKeySchema.index({ status: 1, expiresAt: 1 });
apiKeySchema.index({ 'usage.lastUsed': -1 });
apiKeySchema.index({ keyType: 1 });
apiKeySchema.index({ environment: 1 });

// Compound indexes
apiKeySchema.index({ tenantId: 1, keyType: 1, status: 1 });
apiKeySchema.index({ userId: 1, keyType: 1, status: 1 });

// Pre-save middleware
apiKeySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Handle expiry
  if (this.expiresAt && new Date() > this.expiresAt) {
    this.status = 'REVOKED';
  }
  
  // Clean up old daily usage records (keep last 30 days)
  if (this.usage.dailyUsage.length > 30) {
    this.usage.dailyUsage = this.usage.dailyUsage
      .sort((a, b) => b.date - a.date)
      .slice(0, 30);
  }
  
  next();
});

// Instance methods
apiKeySchema.methods.isActive = function() {
  return this.status === 'ACTIVE' && (!this.expiresAt || new Date() < this.expiresAt);
};

apiKeySchema.methods.hasPermission = function(resource, action) {
  return this.permissions.some(permission => 
    permission.resource === resource && 
    permission.actions.includes(action)
  );
};

apiKeySchema.methods.checkRateLimit = function(endpoint, method) {
  const now = new Date();
  const currentSecond = Math.floor(now.getTime() / 1000);
  const currentMinute = Math.floor(now.getTime() / (60 * 1000));
  const currentHour = Math.floor(now.getTime() / (60 * 60 * 1000));
  const currentDay = Math.floor(now.getTime() / (24 * 60 * 60 * 1000));

  // Check general rate limits
  const limits = this.rateLimits;
  
  // In production, this would check actual usage counts from cache/database
  // For now, we'll return true (not exceeded)
  return {
    allowed: true,
    limits: {
      perSecond: limits.requestsPerSecond,
      perMinute: limits.requestsPerMinute,
      perHour: limits.requestsPerHour,
      perDay: limits.requestsPerDay
    },
    remaining: {
      perSecond: limits.requestsPerSecond,
      perMinute: limits.requestsPerMinute,
      perHour: limits.requestsPerHour,
      perDay: limits.requestsPerDay
    },
    resetTime: currentSecond + 1
  };
};

apiKeySchema.methods.recordUsage = function(endpoint, method, responseTime, statusCode) {
  // Update general usage
  this.usage.totalRequests++;
  this.usage.requestsToday++;
  this.usage.lastUsed = new Date();

  // Update daily usage
  const today = new Date().toISOString().split('T')[0];
  let dailyRecord = this.usage.dailyUsage.find(record => 
    record.date.toISOString().split('T')[0] === today
  );
  
  if (!dailyRecord) {
    dailyRecord = { date: new Date(), requests: 0, errors: 0, rateLimitExceeded: 0 };
    this.usage.dailyUsage.push(dailyRecord);
  }
  
  dailyRecord.requests++;
  if (statusCode >= 400) {
    dailyRecord.errors++;
  }
  if (statusCode === 429) {
    dailyRecord.rateLimitExceeded++;
  }

  // Update endpoint usage
  let endpointRecord = this.usage.endpointUsage.find(record => 
    record.endpoint === endpoint && record.method === method
  );
  
  if (!endpointRecord) {
    endpointRecord = { 
      endpoint, 
      method, 
      count: 0, 
      lastUsed: new Date(),
      avgResponseTime: 0,
      errorRate: 0
    };
    this.usage.endpointUsage.push(endpointRecord);
  }
  
  endpointRecord.count++;
  endpointRecord.lastUsed = new Date();
  
  // Update average response time
  endpointRecord.avgResponseTime = (
    (endpointRecord.avgResponseTime * (endpointRecord.count - 1)) + responseTime
  ) / endpointRecord.count;
  
  // Update error rate
  if (statusCode >= 400) {
    endpointRecord.errorRate = (endpointRecord.errorRate + 1) / endpointRecord.count;
  }
};

apiKeySchema.methods.checkIPAccess = function(clientIP) {
  if (!this.security.requireIPWhitelist) {
    return !this.security.ipBlacklist.includes(clientIP);
  }
  
  return this.security.ipWhitelist.includes(clientIP) && 
         !this.security.ipBlacklist.includes(clientIP);
};

apiKeySchema.methods.checkTimeAccess = function() {
  if (!this.security.allowedTimeRanges || this.security.allowedTimeRanges.length === 0) {
    return true;
  }
  
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM
  const currentDay = now.getDay();
  
  return this.security.allowedTimeRanges.some(range => {
    if (range.daysOfWeek && !range.daysOfWeek.includes(currentDay)) {
      return false;
    }
    
    return currentTime >= range.startTime && currentTime <= range.endTime;
  });
};

apiKeySchema.methods.rotate = async function() {
  // Store current key in previous keys
  this.previousKeys.push({
    keyHash: this.keyHash,
    rotatedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days grace period
  });
  
  // Generate new key
  const crypto = require('crypto');
  const newSecret = crypto.randomBytes(32).toString('hex');
  this.keySecret = newSecret;
  this.keyHash = crypto.createHash('sha256').update(newSecret).digest('hex');
  this.lastRotated = new Date();
  
  return newSecret;
};

// Static methods
apiKeySchema.statics.findByKeyId = function(keyId) {
  return this.findOne({ keyId, status: 'ACTIVE' });
};

apiKeySchema.statics.findActiveKeys = function(userId, tenantId) {
  const query = { status: 'ACTIVE' };
  if (userId) query.userId = userId;
  if (tenantId) query.tenantId = tenantId;
  return this.find(query);
};

apiKeySchema.statics.getUsageStatistics = function(tenantId, startDate, endDate) {
  const matchCondition = { tenantId };
  if (startDate || endDate) {
    matchCondition['usage.lastUsed'] = {};
    if (startDate) matchCondition['usage.lastUsed'].$gte = startDate;
    if (endDate) matchCondition['usage.lastUsed'].$lte = endDate;
  }

  return this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: null,
        totalKeys: { $sum: 1 },
        activeKeys: { $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] } },
        totalRequests: { $sum: '$usage.totalRequests' },
        avgRequestsPerKey: { $avg: '$usage.totalRequests' },
        lastUsed: { $max: '$usage.lastUsed' }
      }
    }
  ]);
};

apiKeySchema.statics.findExpiringKeys = function(days = 30) {
  const expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return this.find({
    status: 'ACTIVE',
    expiresAt: { $lte: expiryDate }
  });
};

apiKeySchema.statics.findKeysForRotation = function() {
  return this.find({
    status: 'ACTIVE',
    autoRotate: true,
    $or: [
      { lastRotated: null },
      { 
        lastRotated: { 
          $lte: new Date(Date.now() - this.rotationPeriod * 24 * 60 * 60 * 1000) 
        } 
      }
    ]
  });
};

module.exports = mongoose.model('APIKey', apiKeySchema);