const mongoose = require('mongoose');

/**
 * Activity Log Schema
 * Comprehensive logging for user activities and system events
 */
const ActivityLogSchema = new mongoose.Schema({
  // User identification
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null for system events
  },
  
  // Tenant and branch context
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    default: null
  },
  
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  },
  
  // Activity information
  activityType: {
    type: String,
    required: true,
    enum: [
      // Authentication activities
      'login', 'logout', 'failed_login', 'password_change', 'password_reset',
      '2fa_enabled', '2fa_disabled', '2fa_verified',
      
      // Transaction activities
      'transaction_created', 'transaction_updated', 'transaction_approved',
      'transaction_rejected', 'transaction_cancelled', 'transaction_completed',
      
      // User management activities
      'user_created', 'user_updated', 'user_deleted', 'user_activated',
      'user_deactivated', 'role_changed', 'permissions_updated',
      
      // System activities
      'settings_updated', 'backup_created', 'system_maintenance',
      'database_migration', 'cache_cleared',
      
      // Security activities
      'suspicious_activity', 'failed_authorization', 'security_violation',
      'ip_blocked', 'rate_limit_exceeded',
      
      // Business activities
      'exchange_rate_updated', 'commission_updated', 'report_generated',
      'tenant_created', 'branch_created', 'payment_processed',
      
      // File activities
      'file_uploaded', 'file_deleted', 'file_downloaded',
      
      // API activities
      'api_call', 'webhook_received', 'webhook_sent'
    ],
    index: true
  },
  
  // Log level
  level: {
    type: String,
    required: true,
    enum: ['info', 'warn', 'error', 'security', 'audit'],
    default: 'info',
    index: true
  },
  
  // Activity details
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Request/session metadata
  metadata: {
    ip: {
      type: String,
      index: true
    },
    userAgent: String,
    sessionId: String,
    requestId: String,
    
    // Location information
    location: {
      country: String,
      city: String,
      region: String
    },
    
    // Device information
    device: {
      type: String, // Mobile, Desktop, Tablet
      os: String,   // Windows, macOS, Linux, Android, iOS
      browser: String // Chrome, Firefox, Safari, Edge
    },
    
    // Server information
    server: String,
    environment: String,
    version: String
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Processing status
  processed: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Processing metadata
  processedAt: Date,
  processedBy: String,
  
  // Tags for categorization
  tags: [String],
  
  // Severity for security events
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  
  // Related entities
  relatedEntities: [{
    entityType: String, // 'transaction', 'user', 'tenant', etc.
    entityId: mongoose.Schema.Types.ObjectId
  }]
}, {
  timestamps: false, // We use our own timestamp field
  collection: 'activity_logs'
});

// Indexes for performance
ActivityLogSchema.index({ userId: 1, timestamp: -1 });
ActivityLogSchema.index({ tenantId: 1, timestamp: -1 });
ActivityLogSchema.index({ activityType: 1, timestamp: -1 });
ActivityLogSchema.index({ level: 1, timestamp: -1 });
ActivityLogSchema.index({ 'metadata.ip': 1, timestamp: -1 });
ActivityLogSchema.index({ processed: 1, timestamp: -1 });

// Compound indexes for common queries
ActivityLogSchema.index({ 
  tenantId: 1, 
  activityType: 1, 
  timestamp: -1 
});

ActivityLogSchema.index({ 
  userId: 1, 
  level: 1, 
  timestamp: -1 
});

// TTL index for automatic cleanup (optional)
ActivityLogSchema.index({ 
  timestamp: 1 
}, { 
  expireAfterSeconds: 365 * 24 * 60 * 60, // 1 year
  partialFilterExpression: { 
    level: { $nin: ['security', 'audit'] } 
  }
});

// Virtual for formatted timestamp
ActivityLogSchema.virtual('formattedTimestamp').get(function() {
  return this.timestamp.toLocaleString('fa-IR', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
});

// Virtual for user display name
ActivityLogSchema.virtual('userDisplayName').get(function() {
  if (!this.userId) return 'System';
  if (this.populated('userId')) {
    const user = this.userId;
    return `${user.firstName} ${user.lastName}`;
  }
  return 'Unknown User';
});

// Static methods
ActivityLogSchema.statics.getActivityTypes = function() {
  return this.schema.paths.activityType.enumValues;
};

ActivityLogSchema.statics.getLogLevels = function() {
  return this.schema.paths.level.enumValues;
};

// Instance methods
ActivityLogSchema.methods.markAsProcessed = function(processedBy = 'system') {
  this.processed = true;
  this.processedAt = new Date();
  this.processedBy = processedBy;
  return this.save();
};

ActivityLogSchema.methods.addTag = function(tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
  }
  return this.save();
};

ActivityLogSchema.methods.setSeverity = function(severity) {
  this.severity = severity;
  return this.save();
};

// Pre-save middleware
ActivityLogSchema.pre('save', function(next) {
  // Auto-set severity based on activity type and level
  if (!this.severity && this.level === 'security') {
    const highSeverityActivities = [
      'security_violation', 'failed_authorization', 'suspicious_activity'
    ];
    
    if (highSeverityActivities.includes(this.activityType)) {
      this.severity = 'high';
    } else {
      this.severity = 'medium';
    }
  }
  
  // Auto-tag based on activity type
  if (!this.tags || this.tags.length === 0) {
    const categoryMap = {
      'login': ['authentication'],
      'logout': ['authentication'],
      'failed_login': ['authentication', 'security'],
      'transaction_created': ['transaction', 'business'],
      'user_created': ['user-management', 'admin'],
      'settings_updated': ['system', 'admin'],
      'suspicious_activity': ['security', 'threat'],
      'api_call': ['api', 'integration']
    };
    
    this.tags = categoryMap[this.activityType] || ['general'];
  }
  
  next();
});

// Post-save middleware for real-time notifications
ActivityLogSchema.post('save', function(doc) {
  // Emit events for real-time notifications
  if (doc.level === 'security' || doc.severity === 'high') {
    // In a real application, you would emit to WebSocket or message queue
    process.nextTick(() => {
      const logger = require('../utils/logger');
      logger.warn('High severity activity logged', {
        logId: doc._id,
        activityType: doc.activityType,
        userId: doc.userId,
        severity: doc.severity
      });
    });
  }
});

// Export the model
module.exports = mongoose.model('ActivityLog', ActivityLogSchema);