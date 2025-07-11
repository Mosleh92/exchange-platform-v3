const mongoose = require('mongoose');

const transactionMonitoringSchema = new mongoose.Schema({
  // Transaction Reference
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true,
    index: true
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

  // Transaction Details for Monitoring
  transactionDetails: {
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'TRADE', 'EXCHANGE', 'P2P'],
      required: true 
    },
    method: String, // Payment method
    counterpartyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    counterpartyInfo: {
      name: String,
      accountNumber: String,
      bankName: String,
      country: String
    },
    timestamp: { type: Date, required: true },
    ipAddress: String,
    deviceFingerprint: String,
    geolocation: {
      country: String,
      region: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    }
  },

  // AML Screening Results
  amlScreening: {
    sanctionsCheck: {
      status: { type: String, enum: ['CLEAR', 'POTENTIAL_MATCH', 'CONFIRMED_MATCH'], default: 'CLEAR' },
      matchedEntities: [{
        listName: String,
        entityName: String,
        matchScore: Number,
        entityType: String,
        notes: String
      }],
      provider: String,
      checkedAt: Date
    },
    
    pepCheck: {
      status: { type: String, enum: ['CLEAR', 'POTENTIAL_MATCH', 'CONFIRMED_MATCH'], default: 'CLEAR' },
      matchedEntities: [{
        name: String,
        position: String,
        country: String,
        matchScore: Number,
        riskLevel: String
      }],
      provider: String,
      checkedAt: Date
    },
    
    adverseMediaCheck: {
      status: { type: String, enum: ['CLEAR', 'POTENTIAL_MATCH', 'CONFIRMED_MATCH'], default: 'CLEAR' },
      findings: [{
        headline: String,
        source: String,
        date: Date,
        riskLevel: String,
        summary: String
      }],
      provider: String,
      checkedAt: Date
    }
  },

  // Pattern Analysis
  patternAnalysis: {
    structuring: {
      detected: { type: Boolean, default: false },
      confidence: { type: Number, min: 0, max: 1 },
      details: {
        transactionCount: Number,
        timeWindow: String,
        totalAmount: Number,
        averageAmount: Number,
        pattern: String
      }
    },
    
    rapidTransactions: {
      detected: { type: Boolean, default: false },
      confidence: { type: Number, min: 0, max: 1 },
      details: {
        transactionCount: Number,
        timeWindow: String,
        frequency: Number,
        pattern: String
      }
    },
    
    unusualPatterns: [{
      type: { 
        type: String,
        enum: ['TIME_PATTERN', 'AMOUNT_PATTERN', 'FREQUENCY_PATTERN', 'GEOGRAPHIC_PATTERN', 'COUNTERPARTY_PATTERN']
      },
      detected: { type: Boolean, default: false },
      confidence: { type: Number, min: 0, max: 1 },
      description: String,
      riskLevel: String
    }],
    
    velocityCheck: {
      dailyVolume: Number,
      weeklyVolume: Number,
      monthlyVolume: Number,
      isExcessive: { type: Boolean, default: false },
      comparedToProfile: String
    }
  },

  // Risk Scoring
  riskScore: {
    overall: { type: Number, min: 0, max: 100, default: 0 },
    breakdown: {
      transactionRisk: Number,
      userRisk: Number,
      geographicRisk: Number,
      counterpartyRisk: Number,
      patternRisk: Number,
      complianceRisk: Number
    },
    riskLevel: { 
      type: String, 
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], 
      default: 'LOW' 
    },
    riskFactors: [String]
  },

  // Fraud Detection
  fraudDetection: {
    fraudScore: { type: Number, min: 0, max: 100, default: 0 },
    fraudIndicators: [{
      type: String,
      severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
      description: String,
      confidence: Number
    }],
    deviceAnalysis: {
      deviceTrust: Number,
      newDevice: Boolean,
      deviceReputation: String,
      behaviorAnalysis: String
    },
    behaviorAnalysis: {
      typicalBehavior: Boolean,
      deviationScore: Number,
      anomalies: [String]
    }
  },

  // Machine Learning Predictions
  mlPredictions: {
    suspiciousActivityScore: Number,
    predictedCategory: String,
    confidence: Number,
    modelVersion: String,
    features: mongoose.Schema.Types.Mixed,
    explanation: [String]
  },

  // Monitoring Status
  monitoringStatus: {
    status: { 
      type: String, 
      enum: ['MONITORING', 'FLAGGED', 'APPROVED', 'BLOCKED', 'INVESTIGATING'],
      default: 'MONITORING' 
    },
    requiresReview: { type: Boolean, default: false },
    autoApproved: { type: Boolean, default: false },
    reviewPriority: { 
      type: String, 
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], 
      default: 'LOW' 
    },
    flags: [{
      type: String,
      severity: String,
      description: String,
      raisedAt: { type: Date, default: Date.now },
      raisedBy: String
    }]
  },

  // Review Information
  reviewInfo: {
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewDecision: { 
      type: String, 
      enum: ['APPROVED', 'REJECTED', 'NEEDS_MORE_INFO', 'ESCALATED'] 
    },
    reviewNotes: String,
    reviewDuration: Number, // in minutes
    escalationReason: String
  },

  // Compliance Actions
  complianceActions: [{
    action: { 
      type: String,
      enum: ['BLOCK_TRANSACTION', 'FREEZE_ACCOUNT', 'REQUEST_DOCUMENTATION', 'FILE_SAR', 'NOTIFY_AUTHORITIES']
    },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    performedAt: { type: Date, default: Date.now },
    reason: String,
    details: mongoose.Schema.Types.Mixed,
    status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED'], default: 'PENDING' }
  }],

  // SAR (Suspicious Activity Report) Information
  sarInfo: {
    sarRequired: { type: Boolean, default: false },
    sarFiled: { type: Boolean, default: false },
    sarReference: String,
    sarFiledAt: Date,
    sarFiledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    narrativeReport: String
  },

  // External Service References
  externalReferences: {
    chainalysisId: String,
    ellipticId: String,
    refinitivId: String,
    worldCheckId: String,
    customProviderIds: mongoose.Schema.Types.Mixed
  },

  // Monitoring Configuration
  monitoringConfig: {
    rulesVersion: String,
    thresholds: mongoose.Schema.Types.Mixed,
    enabledChecks: [String],
    skipReasons: [String]
  },

  // Performance Metrics
  performanceMetrics: {
    processingTime: Number, // milliseconds
    apiCalls: Number,
    cacheHits: Number,
    cacheMisses: Number
  },

  // Timestamps
  monitoredAt: { type: Date, default: Date.now, index: true },
  lastUpdatedAt: { type: Date, default: Date.now },
  completedAt: Date
}, {
  timestamps: true
});

// Indexes for performance
transactionMonitoringSchema.index({ transactionId: 1 });
transactionMonitoringSchema.index({ userId: 1, monitoredAt: -1 });
transactionMonitoringSchema.index({ tenantId: 1, monitoredAt: -1 });
transactionMonitoringSchema.index({ 'riskScore.riskLevel': 1 });
transactionMonitoringSchema.index({ 'monitoringStatus.status': 1 });
transactionMonitoringSchema.index({ 'monitoringStatus.requiresReview': 1 });
transactionMonitoringSchema.index({ 'sarInfo.sarRequired': 1 });
transactionMonitoringSchema.index({ monitoredAt: -1 });

// Compound indexes
transactionMonitoringSchema.index({ 
  tenantId: 1, 
  'monitoringStatus.status': 1, 
  'riskScore.riskLevel': 1 
});

transactionMonitoringSchema.index({ 
  'transactionDetails.amount': 1, 
  'transactionDetails.currency': 1,
  monitoredAt: -1
});

// Pre-save middleware
transactionMonitoringSchema.pre('save', function(next) {
  this.lastUpdatedAt = new Date();
  
  // Auto-complete monitoring for low-risk transactions
  if (this.riskScore.overall < 30 && this.monitoringStatus.status === 'MONITORING') {
    this.monitoringStatus.status = 'APPROVED';
    this.monitoringStatus.autoApproved = true;
    this.completedAt = new Date();
  }
  
  // Flag high-risk transactions for review
  if (this.riskScore.overall > 70 && this.monitoringStatus.status === 'MONITORING') {
    this.monitoringStatus.status = 'FLAGGED';
    this.monitoringStatus.requiresReview = true;
    this.monitoringStatus.reviewPriority = this.riskScore.overall > 90 ? 'URGENT' : 'HIGH';
  }
  
  // Check if SAR is required
  if (this.riskScore.overall > 85 || this.fraudDetection.fraudScore > 80) {
    this.sarInfo.sarRequired = true;
  }
  
  next();
});

// Instance methods
transactionMonitoringSchema.methods.needsReview = function() {
  return this.monitoringStatus.requiresReview && 
         ['FLAGGED', 'INVESTIGATING'].includes(this.monitoringStatus.status);
};

transactionMonitoringSchema.methods.isHighRisk = function() {
  return ['HIGH', 'CRITICAL'].includes(this.riskScore.riskLevel);
};

transactionMonitoringSchema.methods.addFlag = function(type, severity, description, raisedBy = 'SYSTEM') {
  this.monitoringStatus.flags.push({
    type,
    severity,
    description,
    raisedBy,
    raisedAt: new Date()
  });
  
  this.monitoringStatus.requiresReview = true;
  if (severity === 'HIGH' || severity === 'CRITICAL') {
    this.monitoringStatus.status = 'FLAGGED';
  }
};

transactionMonitoringSchema.methods.approve = function(reviewedBy, notes) {
  this.monitoringStatus.status = 'APPROVED';
  this.reviewInfo.reviewedBy = reviewedBy;
  this.reviewInfo.reviewedAt = new Date();
  this.reviewInfo.reviewDecision = 'APPROVED';
  this.reviewInfo.reviewNotes = notes;
  this.completedAt = new Date();
};

transactionMonitoringSchema.methods.reject = function(reviewedBy, reason, notes) {
  this.monitoringStatus.status = 'BLOCKED';
  this.reviewInfo.reviewedBy = reviewedBy;
  this.reviewInfo.reviewedAt = new Date();
  this.reviewInfo.reviewDecision = 'REJECTED';
  this.reviewInfo.reviewNotes = notes;
  
  // Add compliance action
  this.complianceActions.push({
    action: 'BLOCK_TRANSACTION',
    performedBy: reviewedBy,
    reason: reason,
    details: { notes }
  });
  
  this.completedAt = new Date();
};

// Static methods
transactionMonitoringSchema.statics.findPendingReview = function(tenantId = null) {
  const query = { 
    'monitoringStatus.requiresReview': true,
    'monitoringStatus.status': { $in: ['FLAGGED', 'INVESTIGATING'] }
  };
  if (tenantId) query.tenantId = tenantId;
  return this.find(query).sort({ 'monitoringStatus.reviewPriority': -1, monitoredAt: 1 });
};

transactionMonitoringSchema.statics.findByRiskLevel = function(riskLevel, tenantId = null) {
  const query = { 'riskScore.riskLevel': riskLevel };
  if (tenantId) query.tenantId = tenantId;
  return this.find(query);
};

transactionMonitoringSchema.statics.findSARRequired = function(tenantId = null) {
  const query = { 
    'sarInfo.sarRequired': true,
    'sarInfo.sarFiled': false
  };
  if (tenantId) query.tenantId = tenantId;
  return this.find(query);
};

transactionMonitoringSchema.statics.getMonitoringStatistics = function(tenantId = null, startDate = null, endDate = null) {
  const matchCondition = {};
  if (tenantId) matchCondition.tenantId = mongoose.Types.ObjectId(tenantId);
  if (startDate || endDate) {
    matchCondition.monitoredAt = {};
    if (startDate) matchCondition.monitoredAt.$gte = startDate;
    if (endDate) matchCondition.monitoredAt.$lte = endDate;
  }

  return this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: null,
        totalTransactions: { $sum: 1 },
        approvedTransactions: { $sum: { $cond: [{ $eq: ['$monitoringStatus.status', 'APPROVED'] }, 1, 0] } },
        flaggedTransactions: { $sum: { $cond: [{ $eq: ['$monitoringStatus.status', 'FLAGGED'] }, 1, 0] } },
        blockedTransactions: { $sum: { $cond: [{ $eq: ['$monitoringStatus.status', 'BLOCKED'] }, 1, 0] } },
        lowRiskTransactions: { $sum: { $cond: [{ $eq: ['$riskScore.riskLevel', 'LOW'] }, 1, 0] } },
        mediumRiskTransactions: { $sum: { $cond: [{ $eq: ['$riskScore.riskLevel', 'MEDIUM'] }, 1, 0] } },
        highRiskTransactions: { $sum: { $cond: [{ $eq: ['$riskScore.riskLevel', 'HIGH'] }, 1, 0] } },
        criticalRiskTransactions: { $sum: { $cond: [{ $eq: ['$riskScore.riskLevel', 'CRITICAL'] }, 1, 0] } },
        avgRiskScore: { $avg: '$riskScore.overall' },
        avgFraudScore: { $avg: '$fraudDetection.fraudScore' },
        sarRequired: { $sum: { $cond: ['$sarInfo.sarRequired', 1, 0] } },
        sarFiled: { $sum: { $cond: ['$sarInfo.sarFiled', 1, 0] } },
        avgProcessingTime: { $avg: '$performanceMetrics.processingTime' }
      }
    }
  ]);
};

module.exports = mongoose.model('TransactionMonitoring', transactionMonitoringSchema);