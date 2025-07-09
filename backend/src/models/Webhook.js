const mongoose = require('mongoose');
const crypto = require('crypto');

const webhookSchema = new mongoose.Schema({
  // Basic info
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Webhook configuration
  name: { type: String, required: true },
  url: { type: String, required: true },
  secret: { type: String, required: true },
  
  // Event types to listen for
  events: [{
    type: String,
    enum: [
      'order.created',
      'order.filled',
      'order.cancelled',
      'order.expired',
      'trade.executed',
      'balance.updated',
      'deposit.received',
      'withdrawal.sent',
      'price.alert',
      'technical.signal',
      'risk.alert',
      'system.maintenance'
    ],
    required: true
  }],
  
  // Filtering options
  filters: {
    currencies: [String],
    minAmount: { type: Number },
    maxAmount: { type: Number },
    orderTypes: [String],
    statuses: [String]
  },
  
  // Delivery settings
  delivery: {
    method: { type: String, enum: ['POST', 'PUT', 'PATCH'], default: 'POST' },
    timeout: { type: Number, default: 30000 }, // milliseconds
    retryAttempts: { type: Number, default: 3 },
    retryDelay: { type: Number, default: 5000 }, // milliseconds
    headers: mongoose.Schema.Types.Mixed
  },
  
  // Status and health
  status: {
    type: String,
    enum: ['active', 'inactive', 'error', 'suspended'],
    default: 'active'
  },
  
  // Health monitoring
  health: {
    lastDelivery: { type: Date },
    lastSuccess: { type: Date },
    lastError: { type: Date },
    errorCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    averageResponseTime: { type: Number },
    uptime: { type: Number, default: 100 } // percentage
  },
  
  // Security
  security: {
    signatureHeader: { type: String, default: 'X-Webhook-Signature' },
    signatureAlgorithm: { type: String, enum: ['sha256', 'sha512'], default: 'sha256' },
    ipWhitelist: [String],
    rateLimit: {
      requests: { type: Number, default: 100 },
      window: { type: Number, default: 3600 } // seconds
    }
  },
  
  // Metadata
  description: String,
  tags: [String],
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastTriggered: { type: Date }
}, {
  timestamps: true
});

// Indexes
webhookSchema.index({ tenantId: 1, status: 1 });
webhookSchema.index({ userId: 1, status: 1 });
webhookSchema.index({ 'events': 1 });
webhookSchema.index({ createdAt: -1 });

// Pre-save middleware
webhookSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Generate secret if not provided
  if (!this.secret) {
    this.secret = crypto.randomBytes(32).toString('hex');
  }
  
  // Validate URL
  try {
    new URL(this.url);
  } catch (error) {
    return next(new Error('Invalid webhook URL'));
  }
  
  next();
});

// Instance methods
webhookSchema.methods.isActive = function() {
  return this.status === 'active';
};

webhookSchema.methods.canTrigger = function() {
  return this.isActive() && this.health.errorCount < 10;
};

webhookSchema.methods.generateSignature = function(payload) {
  const algorithm = this.security.signatureAlgorithm;
  const hmac = crypto.createHmac(algorithm, this.secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
};

webhookSchema.methods.matchesEvent = function(eventType) {
  return this.events.includes(eventType);
};

webhookSchema.methods.matchesFilter = function(data) {
  if (!this.filters) return true;
  
  // Currency filter
  if (this.filters.currencies && this.filters.currencies.length > 0) {
    if (data.currency && !this.filters.currencies.includes(data.currency)) {
      return false;
    }
  }
  
  // Amount filter
  if (data.amount) {
    if (this.filters.minAmount && data.amount < this.filters.minAmount) {
      return false;
    }
    if (this.filters.maxAmount && data.amount > this.filters.maxAmount) {
      return false;
    }
  }
  
  // Order type filter
  if (this.filters.orderTypes && this.filters.orderTypes.length > 0) {
    if (data.orderType && !this.filters.orderTypes.includes(data.orderType)) {
      return false;
    }
  }
  
  // Status filter
  if (this.filters.statuses && this.filters.statuses.length > 0) {
    if (data.status && !this.filters.statuses.includes(data.status)) {
      return false;
    }
  }
  
  return true;
};

// Static methods
webhookSchema.statics.findByEvent = function(eventType, filters = {}) {
  const query = {
    events: eventType,
    status: 'active'
  };
  
  if (filters.tenantId) {
    query.tenantId = filters.tenantId;
  }
  
  if (filters.userId) {
    query.userId = filters.userId;
  }
  
  return this.find(query);
};

webhookSchema.statics.findActiveWebhooks = function(tenantId) {
  return this.find({
    tenantId,
    status: 'active'
  });
};

module.exports = mongoose.model('Webhook', webhookSchema); 
