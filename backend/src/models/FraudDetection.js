const mongoose = require('mongoose');

const fraudDetectionSchema = new mongoose.Schema({
  // Transaction/Event Reference
  eventId: {
    type: String,
    required: true,
    index: true
  },
  eventType: {
    type: String,
    enum: ['TRANSACTION', 'LOGIN', 'ACCOUNT_CREATION', 'WITHDRAWAL', 'DEPOSIT', 'ORDER', 'API_CALL'],
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

  // Device and Context Information
  deviceInfo: {
    deviceId: String,
    deviceFingerprint: String,
    deviceType: { type: String, enum: ['MOBILE', 'DESKTOP', 'TABLET', 'API', 'UNKNOWN'] },
    operatingSystem: String,
    browser: String,
    browserVersion: String,
    screenResolution: String,
    timezone: String,
    language: String,
    isNewDevice: { type: Boolean, default: false },
    deviceTrustScore: { type: Number, min: 0, max: 100, default: 50 },
    deviceRiskFactors: [String]
  },

  // Network and Location Information
  networkInfo: {
    ipAddress: { type: String, required: true, index: true },
    ipType: { type: String, enum: ['RESIDENTIAL', 'BUSINESS', 'MOBILE', 'VPN', 'PROXY', 'TOR', 'DATACENTER'] },
    ipReputation: { type: String, enum: ['GOOD', 'SUSPICIOUS', 'BAD', 'UNKNOWN'], default: 'UNKNOWN' },
    ipRiskScore: { type: Number, min: 0, max: 100, default: 0 },
    geolocation: {
      country: String,
      region: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      },
      accuracy: Number,
      isVpn: { type: Boolean, default: false },
      isTor: { type: Boolean, default: false },
      isProxy: { type: Boolean, default: false }
    },
    networkProvider: String,
    autonomousSystemNumber: String
  },

  // Behavioral Analysis
  behaviorAnalysis: {
    sessionDuration: Number, // seconds
    pageViews: Number,
    clickRate: Number,
    typingSpeed: Number, // characters per minute
    mouseBehavior: {
      movementPattern: String,
      clickPattern: String,
      scrollPattern: String
    },
    navigationPattern: [String],
    timeOnPage: [Number],
    interactionSequence: [String],
    behaviorDeviationScore: { type: Number, min: 0, max: 100, default: 0 },
    suspiciousBehaviors: [String]
  },

  // Velocity Checks
  velocityChecks: {
    transactionVelocity: {
      count1Hour: { type: Number, default: 0 },
      count24Hours: { type: Number, default: 0 },
      count7Days: { type: Number, default: 0 },
      amount1Hour: { type: Number, default: 0 },
      amount24Hours: { type: Number, default: 0 },
      amount7Days: { type: Number, default: 0 },
      isExcessive: { type: Boolean, default: false }
    },
    loginVelocity: {
      count1Hour: { type: Number, default: 0 },
      count24Hours: { type: Number, default: 0 },
      failedAttempts: { type: Number, default: 0 },
      isExcessive: { type: Boolean, default: false }
    },
    apiCallVelocity: {
      count1Minute: { type: Number, default: 0 },
      count1Hour: { type: Number, default: 0 },
      count24Hours: { type: Number, default: 0 },
      isExcessive: { type: Boolean, default: false }
    }
  },

  // Pattern Detection
  patternDetection: {
    detectedPatterns: [{
      type: { 
        type: String,
        enum: ['TIME_PATTERN', 'AMOUNT_PATTERN', 'SEQUENCE_PATTERN', 'LOCATION_PATTERN', 'DEVICE_PATTERN']
      },
      pattern: String,
      confidence: { type: Number, min: 0, max: 1 },
      riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
      description: String,
      firstSeen: Date,
      lastSeen: Date,
      occurrences: { type: Number, default: 1 }
    }],
    timePatterns: {
      unusualTiming: Boolean,
      offHours: Boolean,
      weekendActivity: Boolean,
      holidayActivity: Boolean
    },
    amountPatterns: {
      roundAmounts: Boolean,
      justBelowThreshold: Boolean,
      rapidEscalation: Boolean,
      microTransactions: Boolean
    },
    locationPatterns: {
      impossibleTravel: Boolean,
      multipleLocations: Boolean,
      highRiskCountries: Boolean,
      locationJumping: Boolean
    }
  },

  // Machine Learning Scores
  mlScores: {
    fraudProbability: { type: Number, min: 0, max: 1, default: 0 },
    anomalyScore: { type: Number, min: 0, max: 100, default: 0 },
    riskScore: { type: Number, min: 0, max: 100, default: 0 },
    confidenceLevel: { type: Number, min: 0, max: 1, default: 0 },
    modelVersion: String,
    features: mongoose.Schema.Types.Mixed,
    predictions: {
      isBot: { probability: Number, confidence: Number },
      isAccountTakeover: { probability: Number, confidence: Number },
      isSyntheticIdentity: { probability: Number, confidence: Number },
      isMoneyLaundering: { probability: Number, confidence: Number },
      isFraudulent: { probability: Number, confidence: Number }
    }
  },

  // Rule Engine Results
  ruleEngineResults: {
    triggeredRules: [{
      ruleId: String,
      ruleName: String,
      ruleType: String,
      severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
      score: Number,
      description: String,
      triggeredAt: { type: Date, default: Date.now }
    }],
    totalRuleScore: { type: Number, default: 0 },
    highSeverityRules: { type: Number, default: 0 },
    criticalRules: { type: Number, default: 0 }
  },

  // Risk Indicators
  riskIndicators: [{
    type: {
      type: String,
      enum: [
        'SUSPICIOUS_DEVICE', 'SUSPICIOUS_IP', 'SUSPICIOUS_BEHAVIOR',
        'VELOCITY_ABUSE', 'PATTERN_ABUSE', 'ACCOUNT_TAKEOVER',
        'SYNTHETIC_IDENTITY', 'BOT_ACTIVITY', 'PROXY_VPN',
        'BLACKLISTED_ENTITY', 'SANCTIONS_MATCH', 'PEP_MATCH',
        'ADVERSE_MEDIA', 'HIGH_RISK_COUNTRY', 'SUSPICIOUS_TIMING'
      ]
    },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    confidence: { type: Number, min: 0, max: 1 },
    description: String,
    source: String, // ML_MODEL, RULE_ENGINE, EXTERNAL_API, etc.
    detectedAt: { type: Date, default: Date.now },
    metadata: mongoose.Schema.Types.Mixed
  }],

  // External Service Results
  externalServices: {
    emailReputationCheck: {
      provider: String,
      reputation: String,
      riskScore: Number,
      details: mongoose.Schema.Types.Mixed
    },
    phoneReputationCheck: {
      provider: String,
      reputation: String,
      riskScore: Number,
      details: mongoose.Schema.Types.Mixed
    },
    ipReputationCheck: {
      provider: String,
      reputation: String,
      riskScore: Number,
      categories: [String],
      details: mongoose.Schema.Types.Mixed
    },
    deviceReputationCheck: {
      provider: String,
      reputation: String,
      riskScore: Number,
      details: mongoose.Schema.Types.Mixed
    }
  },

  // Decision and Actions
  decision: {
    action: { 
      type: String, 
      enum: ['ALLOW', 'CHALLENGE', 'BLOCK', 'REVIEW', 'FLAG'],
      default: 'ALLOW'
    },
    confidence: { type: Number, min: 0, max: 1 },
    reason: String,
    autoDecision: { type: Boolean, default: true },
    humanReviewed: { type: Boolean, default: false },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewNotes: String,
    decisionOverride: {
      overridden: { type: Boolean, default: false },
      originalDecision: String,
      overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      overriddenAt: Date,
      overrideReason: String
    }
  },

  // Performance Metrics
  performance: {
    processingTime: Number, // milliseconds
    mlInferenceTime: Number,
    ruleEvaluationTime: Number,
    externalApiTime: Number,
    totalLatency: Number,
    apiCalls: Number,
    cacheHits: Number,
    cacheMisses: Number
  },

  // Feedback and Learning
  feedback: {
    actualFraud: Boolean, // true positive/false positive feedback
    feedbackSource: String, // CUSTOMER, MANUAL_REVIEW, CHARGEBACK, etc.
    feedbackTimestamp: Date,
    feedbackDetails: String,
    modelAccuracy: Number,
    falsePositiveRate: Number,
    falseNegativeRate: Number
  },

  // Event timestamp
  eventTimestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for performance
fraudDetectionSchema.index({ eventId: 1, eventType: 1 });
fraudDetectionSchema.index({ userId: 1, eventTimestamp: -1 });
fraudDetectionSchema.index({ tenantId: 1, eventTimestamp: -1 });
fraudDetectionSchema.index({ 'networkInfo.ipAddress': 1 });
fraudDetectionSchema.index({ 'deviceInfo.deviceFingerprint': 1 });
fraudDetectionSchema.index({ 'mlScores.fraudProbability': -1 });
fraudDetectionSchema.index({ 'decision.action': 1 });
fraudDetectionSchema.index({ eventTimestamp: -1 });

// Compound indexes
fraudDetectionSchema.index({ 
  tenantId: 1, 
  'decision.action': 1, 
  eventTimestamp: -1 
});

fraudDetectionSchema.index({
  userId: 1,
  eventType: 1,
  eventTimestamp: -1
});

// Pre-save middleware
fraudDetectionSchema.pre('save', function(next) {
  // Calculate overall risk score
  const mlWeight = 0.4;
  const ruleWeight = 0.4;
  const indicatorWeight = 0.2;

  const mlScore = this.mlScores.riskScore || 0;
  const ruleScore = this.ruleEngineResults.totalRuleScore || 0;
  const indicatorScore = this.riskIndicators.reduce((sum, indicator) => {
    const severityScores = { LOW: 25, MEDIUM: 50, HIGH: 75, CRITICAL: 100 };
    return sum + (severityScores[indicator.severity] || 0) * indicator.confidence;
  }, 0) / (this.riskIndicators.length || 1);

  this.mlScores.riskScore = (mlScore * mlWeight) + (ruleScore * ruleWeight) + (indicatorScore * indicatorWeight);

  // Auto-decision based on risk score
  if (this.mlScores.riskScore >= 90) {
    this.decision.action = 'BLOCK';
    this.decision.reason = 'High fraud risk detected';
  } else if (this.mlScores.riskScore >= 70) {
    this.decision.action = 'REVIEW';
    this.decision.reason = 'Medium-high fraud risk requires review';
  } else if (this.mlScores.riskScore >= 50) {
    this.decision.action = 'CHALLENGE';
    this.decision.reason = 'Additional verification required';
  } else if (this.mlScores.riskScore >= 30) {
    this.decision.action = 'FLAG';
    this.decision.reason = 'Low-medium risk flagged for monitoring';
  } else {
    this.decision.action = 'ALLOW';
    this.decision.reason = 'Low fraud risk';
  }

  next();
});

// Instance methods
fraudDetectionSchema.methods.isHighRisk = function() {
  return this.mlScores.riskScore >= 70;
};

fraudDetectionSchema.methods.requiresReview = function() {
  return ['REVIEW', 'BLOCK'].includes(this.decision.action) && !this.decision.humanReviewed;
};

fraudDetectionSchema.methods.addRiskIndicator = function(type, severity, description, confidence = 1.0, source = 'SYSTEM') {
  this.riskIndicators.push({
    type,
    severity,
    description,
    confidence,
    source,
    detectedAt: new Date()
  });
};

fraudDetectionSchema.methods.updateDecision = function(action, reason, reviewedBy) {
  this.decision.action = action;
  this.decision.reason = reason;
  this.decision.humanReviewed = true;
  this.decision.reviewedBy = reviewedBy;
  this.decision.reviewedAt = new Date();
  this.decision.autoDecision = false;
};

// Static methods
fraudDetectionSchema.statics.findHighRiskEvents = function(tenantId = null, hours = 24) {
  const query = {
    'mlScores.riskScore': { $gte: 70 },
    eventTimestamp: { $gte: new Date(Date.now() - hours * 60 * 60 * 1000) }
  };
  
  if (tenantId) query.tenantId = tenantId;
  
  return this.find(query).sort({ 'mlScores.riskScore': -1 });
};

fraudDetectionSchema.statics.findPendingReviews = function(tenantId = null) {
  const query = {
    'decision.action': { $in: ['REVIEW', 'BLOCK'] },
    'decision.humanReviewed': false
  };
  
  if (tenantId) query.tenantId = tenantId;
  
  return this.find(query).sort({ 'mlScores.riskScore': -1, eventTimestamp: 1 });
};

fraudDetectionSchema.statics.getUserRiskProfile = async function(userId, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const results = await this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        eventTimestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalEvents: { $sum: 1 },
        avgRiskScore: { $avg: '$mlScores.riskScore' },
        maxRiskScore: { $max: '$mlScores.riskScore' },
        blockedEvents: { $sum: { $cond: [{ $eq: ['$decision.action', 'BLOCK'] }, 1, 0] } },
        reviewedEvents: { $sum: { $cond: [{ $eq: ['$decision.action', 'REVIEW'] }, 1, 0] } },
        allowedEvents: { $sum: { $cond: [{ $eq: ['$decision.action', 'ALLOW'] }, 1, 0] } },
        uniqueDevices: { $addToSet: '$deviceInfo.deviceFingerprint' },
        uniqueIPs: { $addToSet: '$networkInfo.ipAddress' },
        riskIndicators: { $push: '$riskIndicators' }
      }
    },
    {
      $project: {
        totalEvents: 1,
        avgRiskScore: 1,
        maxRiskScore: 1,
        blockedEvents: 1,
        reviewedEvents: 1,
        allowedEvents: 1,
        uniqueDeviceCount: { $size: '$uniqueDevices' },
        uniqueIPCount: { $size: '$uniqueIPs' },
        riskLevel: {
          $switch: {
            branches: [
              { case: { $gte: ['$avgRiskScore', 70] }, then: 'HIGH' },
              { case: { $gte: ['$avgRiskScore', 50] }, then: 'MEDIUM' },
              { case: { $gte: ['$avgRiskScore', 30] }, then: 'LOW-MEDIUM' }
            ],
            default: 'LOW'
          }
        }
      }
    }
  ]);

  return results[0] || {
    totalEvents: 0,
    avgRiskScore: 0,
    maxRiskScore: 0,
    blockedEvents: 0,
    reviewedEvents: 0,
    allowedEvents: 0,
    uniqueDeviceCount: 0,
    uniqueIPCount: 0,
    riskLevel: 'LOW'
  };
};

fraudDetectionSchema.statics.getFraudStatistics = function(tenantId = null, startDate = null, endDate = null) {
  const matchCondition = {};
  if (tenantId) matchCondition.tenantId = mongoose.Types.ObjectId(tenantId);
  if (startDate || endDate) {
    matchCondition.eventTimestamp = {};
    if (startDate) matchCondition.eventTimestamp.$gte = startDate;
    if (endDate) matchCondition.eventTimestamp.$lte = endDate;
  }

  return this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: null,
        totalEvents: { $sum: 1 },
        blockedEvents: { $sum: { $cond: [{ $eq: ['$decision.action', 'BLOCK'] }, 1, 0] } },
        reviewEvents: { $sum: { $cond: [{ $eq: ['$decision.action', 'REVIEW'] }, 1, 0] } },
        challengeEvents: { $sum: { $cond: [{ $eq: ['$decision.action', 'CHALLENGE'] }, 1, 0] } },
        allowedEvents: { $sum: { $cond: [{ $eq: ['$decision.action', 'ALLOW'] }, 1, 0] } },
        highRiskEvents: { $sum: { $cond: [{ $gte: ['$mlScores.riskScore', 70] }, 1, 0] } },
        avgRiskScore: { $avg: '$mlScores.riskScore' },
        avgProcessingTime: { $avg: '$performance.processingTime' },
        falsePositives: { $sum: { $cond: [{ $eq: ['$feedback.actualFraud', false] }, 1, 0] } },
        truePositives: { $sum: { $cond: [{ $eq: ['$feedback.actualFraud', true] }, 1, 0] } }
      }
    }
  ]);
};

module.exports = mongoose.model('FraudDetection', fraudDetectionSchema);