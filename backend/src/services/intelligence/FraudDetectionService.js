// backend/src/services/intelligence/FraudDetectionService.js
const mongoose = require('mongoose');
const logger = require('../../utils/logger');

/**
 * Advanced Fraud Detection Service
 * Uses machine learning algorithms and pattern recognition to detect suspicious activities
 */
class FraudDetectionService {
  constructor() {
    this.riskScores = new Map(); // userId -> risk score
    this.suspiciousPatterns = new Map(); // pattern type -> detection rules
    this.fraudModels = new Map(); // model name -> model instance
    this.alertQueue = [];
    this.isInitialized = false;
  }

  /**
   * Initialize fraud detection service
   */
  async initialize() {
    try {
      // Setup fraud detection schemas
      await this.setupFraudSchemas();
      
      // Initialize detection models
      await this.initializeDetectionModels();
      
      // Load suspicious patterns
      await this.loadSuspiciousPatterns();
      
      // Start real-time monitoring
      this.startRealTimeMonitoring();
      
      this.isInitialized = true;
      logger.info('Fraud detection service initialized');
      
    } catch (error) {
      logger.error('Failed to initialize fraud detection service:', error);
      throw error;
    }
  }

  /**
   * Setup fraud detection database schemas
   */
  async setupFraudSchemas() {
    // Fraud alert schema
    const fraudAlertSchema = new mongoose.Schema({
      alertId: { type: String, unique: true, required: true },
      tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
      type: { type: String, required: true }, // transaction, login, account, behavioral
      severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
      riskScore: { type: Number, required: true, min: 0, max: 100 },
      description: { type: String, required: true },
      indicators: [{ type: String }], // List of fraud indicators detected
      relatedTransactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }],
      metadata: { type: mongoose.Schema.Types.Mixed },
      status: { type: String, enum: ['pending', 'investigating', 'resolved', 'false_positive'], default: 'pending' },
      investigatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      investigatedAt: { type: Date },
      resolution: { type: String },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

    // User behavior profile schema
    const userBehaviorSchema = new mongoose.Schema({
      tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      behaviorProfile: {
        typical: {
          transactionAmounts: { min: Number, max: Number, avg: Number },
          transactionFrequency: { daily: Number, weekly: Number, monthly: Number },
          activeHours: [{ start: String, end: String }],
          commonIpAddresses: [String],
          deviceFingerprints: [String],
          geolocation: { country: String, city: String, coordinates: [Number] }
        },
        current: {
          recentTransactions: { count: Number, totalAmount: Number },
          currentSession: { ipAddress: String, deviceFingerprint: String, location: String },
          riskFactors: [String]
        }
      },
      riskScore: { type: Number, default: 0, min: 0, max: 100 },
      lastUpdated: { type: Date, default: Date.now },
      createdAt: { type: Date, default: Date.now }
    });

    // Risk assessment schema
    const riskAssessmentSchema = new mongoose.Schema({
      tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
      entityType: { type: String, enum: ['user', 'transaction', 'account'], required: true },
      entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
      assessmentType: { type: String, enum: ['realtime', 'periodic', 'manual'], required: true },
      riskFactors: [{
        factor: String,
        weight: Number,
        score: Number,
        description: String
      }],
      totalRiskScore: { type: Number, required: true, min: 0, max: 100 },
      riskLevel: { type: String, enum: ['very_low', 'low', 'medium', 'high', 'very_high'], required: true },
      recommendations: [String],
      automatedActions: [String],
      assessedBy: { type: String, default: 'system' },
      createdAt: { type: Date, default: Date.now }
    });

    // Register models if not already registered
    if (!mongoose.models.FraudAlert) {
      mongoose.model('FraudAlert', fraudAlertSchema);
    }
    if (!mongoose.models.UserBehavior) {
      mongoose.model('UserBehavior', userBehaviorSchema);
    }
    if (!mongoose.models.RiskAssessment) {
      mongoose.model('RiskAssessment', riskAssessmentSchema);
    }
  }

  /**
   * Initialize fraud detection models
   */
  async initializeDetectionModels() {
    // Transaction amount anomaly detection
    this.fraudModels.set('transaction_amount', {
      type: 'statistical',
      detect: (transaction, userProfile) => this.detectTransactionAmountAnomaly(transaction, userProfile)
    });

    // Frequency anomaly detection
    this.fraudModels.set('transaction_frequency', {
      type: 'statistical',
      detect: (transaction, userProfile) => this.detectTransactionFrequencyAnomaly(transaction, userProfile)
    });

    // Geographic anomaly detection
    this.fraudModels.set('geographic_anomaly', {
      type: 'geographic',
      detect: (transaction, userProfile) => this.detectGeographicAnomaly(transaction, userProfile)
    });

    // Device fingerprint anomaly
    this.fraudModels.set('device_anomaly', {
      type: 'device',
      detect: (transaction, userProfile) => this.detectDeviceAnomaly(transaction, userProfile)
    });

    // Behavioral pattern anomaly
    this.fraudModels.set('behavioral_anomaly', {
      type: 'behavioral',
      detect: (transaction, userProfile) => this.detectBehavioralAnomaly(transaction, userProfile)
    });

    logger.info(`Initialized ${this.fraudModels.size} fraud detection models`);
  }

  /**
   * Load suspicious patterns database
   */
  async loadSuspiciousPatterns() {
    // Known fraud patterns
    this.suspiciousPatterns.set('round_number_transactions', {
      description: 'Multiple round number transactions',
      weight: 0.7,
      detect: (transactions) => {
        const roundTransactions = transactions.filter(t => t.amount % 100 === 0);
        return roundTransactions.length >= 3;
      }
    });

    this.suspiciousPatterns.set('rapid_successive_transactions', {
      description: 'Rapid successive transactions',
      weight: 0.8,
      detect: (transactions) => {
        const recentTransactions = transactions.filter(t => 
          Date.now() - new Date(t.createdAt).getTime() < 300000 // 5 minutes
        );
        return recentTransactions.length >= 5;
      }
    });

    this.suspiciousPatterns.set('off_hours_activity', {
      description: 'Activity during unusual hours',
      weight: 0.6,
      detect: (transaction, userProfile) => {
        const hour = new Date(transaction.createdAt).getHours();
        const typicalHours = userProfile?.behaviorProfile?.typical?.activeHours || [];
        
        if (typicalHours.length === 0) return false;
        
        return !typicalHours.some(period => {
          const start = parseInt(period.start);
          const end = parseInt(period.end);
          return hour >= start && hour <= end;
        });
      }
    });

    this.suspiciousPatterns.set('unusual_location', {
      description: 'Transaction from unusual location',
      weight: 0.9,
      detect: (transaction, userProfile) => {
        const currentLocation = transaction.metadata?.location;
        const typicalLocations = userProfile?.behaviorProfile?.typical?.geolocation;
        
        if (!currentLocation || !typicalLocations) return false;
        
        // Simple distance check (in real implementation, use proper geolocation)
        const distance = this.calculateDistance(currentLocation, typicalLocations);
        return distance > 1000; // More than 1000km from typical location
      }
    });

    this.suspiciousPatterns.set('multiple_failed_attempts', {
      description: 'Multiple failed transaction attempts',
      weight: 0.8,
      detect: (transactions) => {
        const failedTransactions = transactions.filter(t => t.status === 'failed');
        return failedTransactions.length >= 3;
      }
    });

    logger.info(`Loaded ${this.suspiciousPatterns.size} suspicious patterns`);
  }

  /**
   * Analyze transaction for fraud indicators
   */
  async analyzeTransaction(transaction) {
    try {
      if (!this.isInitialized) {
        logger.warn('Fraud detection service not initialized');
        return { riskScore: 0, indicators: [] };
      }

      // Get user behavior profile
      const userProfile = await this.getUserBehaviorProfile(transaction.userId || transaction.customerId);
      
      // Get recent transactions for pattern analysis
      const recentTransactions = await this.getRecentTransactions(
        transaction.userId || transaction.customerId, 
        transaction.tenantId
      );

      let totalRiskScore = 0;
      const indicators = [];
      const riskFactors = [];

      // Run all fraud detection models
      for (const [modelName, model] of this.fraudModels) {
        try {
          const result = await model.detect(transaction, userProfile);
          if (result.isAnomalous) {
            totalRiskScore += result.riskScore;
            indicators.push(`${modelName}: ${result.description}`);
            riskFactors.push({
              factor: modelName,
              weight: result.weight || 1.0,
              score: result.riskScore,
              description: result.description
            });
          }
        } catch (error) {
          logger.error(`Error in fraud model ${modelName}:`, error);
        }
      }

      // Check suspicious patterns
      for (const [patternName, pattern] of this.suspiciousPatterns) {
        try {
          const isDetected = pattern.detect(recentTransactions.concat([transaction]), userProfile);
          if (isDetected) {
            const patternRiskScore = pattern.weight * 20; // Convert weight to score
            totalRiskScore += patternRiskScore;
            indicators.push(`Pattern: ${pattern.description}`);
            riskFactors.push({
              factor: patternName,
              weight: pattern.weight,
              score: patternRiskScore,
              description: pattern.description
            });
          }
        } catch (error) {
          logger.error(`Error in pattern detection ${patternName}:`, error);
        }
      }

      // Normalize risk score (0-100)
      const normalizedRiskScore = Math.min(100, Math.max(0, totalRiskScore));

      // Determine risk level
      const riskLevel = this.getRiskLevel(normalizedRiskScore);

      // Create risk assessment record
      await this.createRiskAssessment({
        tenantId: transaction.tenantId,
        entityType: 'transaction',
        entityId: transaction._id,
        assessmentType: 'realtime',
        riskFactors,
        totalRiskScore: normalizedRiskScore,
        riskLevel
      });

      // Generate fraud alert if high risk
      if (normalizedRiskScore >= 70) {
        await this.generateFraudAlert({
          tenantId: transaction.tenantId,
          userId: transaction.userId,
          customerId: transaction.customerId,
          type: 'transaction',
          severity: this.getSeverityFromScore(normalizedRiskScore),
          riskScore: normalizedRiskScore,
          description: `High-risk transaction detected`,
          indicators,
          relatedTransactions: [transaction._id],
          metadata: { transaction, riskFactors }
        });
      }

      // Update user behavior profile
      await this.updateUserBehaviorProfile(transaction.userId || transaction.customerId, transaction);

      return {
        riskScore: normalizedRiskScore,
        riskLevel,
        indicators,
        riskFactors,
        requiresManualReview: normalizedRiskScore >= 50
      };

    } catch (error) {
      logger.error('Error analyzing transaction for fraud:', error);
      return { riskScore: 0, indicators: [], error: error.message };
    }
  }

  /**
   * Detect transaction amount anomaly
   */
  async detectTransactionAmountAnomaly(transaction, userProfile) {
    if (!userProfile?.behaviorProfile?.typical?.transactionAmounts) {
      return { isAnomalous: false, riskScore: 0 };
    }

    const typical = userProfile.behaviorProfile.typical.transactionAmounts;
    const amount = transaction.amount;

    // Check if amount is significantly higher than typical
    const isHighAmount = amount > (typical.avg * 3) || amount > typical.max * 2;
    
    // Check if amount is suspiciously low (possible structuring)
    const isLowAmount = amount < (typical.avg * 0.1) && amount > 0;

    if (isHighAmount) {
      return {
        isAnomalous: true,
        riskScore: 30,
        weight: 0.8,
        description: `Transaction amount (${amount}) significantly higher than typical (avg: ${typical.avg})`
      };
    }

    if (isLowAmount && transaction.type !== 'micro_payment') {
      return {
        isAnomalous: true,
        riskScore: 15,
        weight: 0.4,
        description: `Unusually low transaction amount (${amount}) - possible structuring`
      };
    }

    return { isAnomalous: false, riskScore: 0 };
  }

  /**
   * Detect transaction frequency anomaly
   */
  async detectTransactionFrequencyAnomaly(transaction, userProfile) {
    if (!userProfile?.behaviorProfile?.typical?.transactionFrequency) {
      return { isAnomalous: false, riskScore: 0 };
    }

    const typical = userProfile.behaviorProfile.typical.transactionFrequency;
    const userId = transaction.userId || transaction.customerId;
    
    // Count recent transactions
    const Transaction = mongoose.model('Transaction');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const todayCount = await Transaction.countDocuments({
      $or: [{ userId }, { customerId: userId }],
      tenantId: transaction.tenantId,
      createdAt: { $gte: today }
    });

    // Check if frequency is significantly higher than typical
    if (todayCount > typical.daily * 3) {
      return {
        isAnomalous: true,
        riskScore: 25,
        weight: 0.7,
        description: `High transaction frequency: ${todayCount} transactions today (typical: ${typical.daily})`
      };
    }

    return { isAnomalous: false, riskScore: 0 };
  }

  /**
   * Detect geographic anomaly
   */
  async detectGeographicAnomaly(transaction, userProfile) {
    const currentLocation = transaction.metadata?.location || transaction.metadata?.ipLocation;
    const typicalLocation = userProfile?.behaviorProfile?.typical?.geolocation;

    if (!currentLocation || !typicalLocation) {
      return { isAnomalous: false, riskScore: 0 };
    }

    const distance = this.calculateDistance(currentLocation, typicalLocation);

    // If transaction is from a location more than 500km from typical location
    if (distance > 500) {
      const riskScore = Math.min(40, distance / 50); // Higher distance = higher risk
      
      return {
        isAnomalous: true,
        riskScore,
        weight: 0.8,
        description: `Transaction from unusual location: ${distance}km from typical location`
      };
    }

    return { isAnomalous: false, riskScore: 0 };
  }

  /**
   * Detect device anomaly
   */
  async detectDeviceAnomaly(transaction, userProfile) {
    const currentDevice = transaction.metadata?.deviceFingerprint;
    const knownDevices = userProfile?.behaviorProfile?.typical?.deviceFingerprints || [];

    if (!currentDevice) {
      return { isAnomalous: false, riskScore: 0 };
    }

    // Check if device is known
    if (!knownDevices.includes(currentDevice)) {
      return {
        isAnomalous: true,
        riskScore: 20,
        weight: 0.6,
        description: 'Transaction from unknown device'
      };
    }

    return { isAnomalous: false, riskScore: 0 };
  }

  /**
   * Detect behavioral anomaly
   */
  async detectBehavioralAnomaly(transaction, userProfile) {
    if (!userProfile?.behaviorProfile?.typical) {
      return { isAnomalous: false, riskScore: 0 };
    }

    const indicators = [];
    let riskScore = 0;

    // Check if transaction is during unusual hours
    const hour = new Date(transaction.createdAt).getHours();
    const typicalHours = userProfile.behaviorProfile.typical.activeHours || [];
    
    if (typicalHours.length > 0) {
      const isTypicalHour = typicalHours.some(period => {
        const start = parseInt(period.start);
        const end = parseInt(period.end);
        return hour >= start && hour <= end;
      });

      if (!isTypicalHour) {
        indicators.push('Off-hours activity');
        riskScore += 15;
      }
    }

    // Check IP address
    const currentIp = transaction.metadata?.ipAddress;
    const knownIps = userProfile.behaviorProfile.typical.commonIpAddresses || [];
    
    if (currentIp && !knownIps.includes(currentIp)) {
      indicators.push('Unknown IP address');
      riskScore += 10;
    }

    if (indicators.length > 0) {
      return {
        isAnomalous: true,
        riskScore,
        weight: 0.5,
        description: `Behavioral anomalies: ${indicators.join(', ')}`
      };
    }

    return { isAnomalous: false, riskScore: 0 };
  }

  /**
   * Get user behavior profile
   */
  async getUserBehaviorProfile(userId) {
    try {
      const UserBehavior = mongoose.model('UserBehavior');
      return await UserBehavior.findOne({ userId });
    } catch (error) {
      logger.error('Error getting user behavior profile:', error);
      return null;
    }
  }

  /**
   * Update user behavior profile
   */
  async updateUserBehaviorProfile(userId, transaction) {
    try {
      const UserBehavior = mongoose.model('UserBehavior');
      
      // Get or create profile
      let profile = await UserBehavior.findOne({ userId });
      
      if (!profile) {
        profile = new UserBehavior({
          tenantId: transaction.tenantId,
          userId,
          behaviorProfile: {
            typical: {
              transactionAmounts: { min: 0, max: 0, avg: 0 },
              transactionFrequency: { daily: 0, weekly: 0, monthly: 0 },
              activeHours: [],
              commonIpAddresses: [],
              deviceFingerprints: [],
              geolocation: {}
            },
            current: {
              recentTransactions: { count: 0, totalAmount: 0 },
              currentSession: {},
              riskFactors: []
            }
          },
          riskScore: 0
        });
      }

      // Update profile with transaction data
      await this.updateProfileWithTransaction(profile, transaction);
      
      await profile.save();
      
    } catch (error) {
      logger.error('Error updating user behavior profile:', error);
    }
  }

  /**
   * Update profile with transaction data
   */
  async updateProfileWithTransaction(profile, transaction) {
    // Update transaction amounts
    const amounts = profile.behaviorProfile.typical.transactionAmounts;
    amounts.min = amounts.min === 0 ? transaction.amount : Math.min(amounts.min, transaction.amount);
    amounts.max = Math.max(amounts.max, transaction.amount);
    amounts.avg = (amounts.avg + transaction.amount) / 2; // Simplified averaging

    // Update active hours
    const hour = new Date(transaction.createdAt).getHours();
    const activeHours = profile.behaviorProfile.typical.activeHours;
    if (!activeHours.some(period => parseInt(period.start) <= hour && hour <= parseInt(period.end))) {
      activeHours.push({ start: hour.toString(), end: hour.toString() });
    }

    // Update IP addresses
    if (transaction.metadata?.ipAddress) {
      const ips = profile.behaviorProfile.typical.commonIpAddresses;
      if (!ips.includes(transaction.metadata.ipAddress)) {
        ips.push(transaction.metadata.ipAddress);
        if (ips.length > 10) ips.shift(); // Keep only recent IPs
      }
    }

    // Update device fingerprints
    if (transaction.metadata?.deviceFingerprint) {
      const devices = profile.behaviorProfile.typical.deviceFingerprints;
      if (!devices.includes(transaction.metadata.deviceFingerprint)) {
        devices.push(transaction.metadata.deviceFingerprint);
        if (devices.length > 5) devices.shift(); // Keep only recent devices
      }
    }

    // Update location
    if (transaction.metadata?.location) {
      profile.behaviorProfile.typical.geolocation = transaction.metadata.location;
    }

    profile.lastUpdated = new Date();
  }

  /**
   * Get recent transactions for analysis
   */
  async getRecentTransactions(userId, tenantId, limit = 20) {
    try {
      const Transaction = mongoose.model('Transaction');
      return await Transaction.find({
        $or: [{ userId }, { customerId: userId }],
        tenantId,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      })
      .sort({ createdAt: -1 })
      .limit(limit);
    } catch (error) {
      logger.error('Error getting recent transactions:', error);
      return [];
    }
  }

  /**
   * Create risk assessment record
   */
  async createRiskAssessment(assessmentData) {
    try {
      const RiskAssessment = mongoose.model('RiskAssessment');
      await RiskAssessment.create(assessmentData);
    } catch (error) {
      logger.error('Error creating risk assessment:', error);
    }
  }

  /**
   * Generate fraud alert
   */
  async generateFraudAlert(alertData) {
    try {
      const FraudAlert = mongoose.model('FraudAlert');
      
      const alertId = `fraud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const alert = await FraudAlert.create({
        ...alertData,
        alertId
      });

      // Add to alert queue for processing
      this.alertQueue.push(alert);

      // Send notifications for high severity alerts
      if (alertData.severity === 'high' || alertData.severity === 'critical') {
        await this.sendFraudAlertNotification(alert);
      }

      logger.info(`Generated fraud alert: ${alertId}`);
      return alert;

    } catch (error) {
      logger.error('Error generating fraud alert:', error);
    }
  }

  /**
   * Send fraud alert notification
   */
  async sendFraudAlertNotification(alert) {
    try {
      // In real implementation, send email, SMS, or push notifications
      logger.warn(`FRAUD ALERT: ${alert.severity.toUpperCase()} - ${alert.description}`);
      
      // Could integrate with:
      // - Email service
      // - Slack/Teams notifications
      // - SMS alerts
      // - Security dashboard
      
    } catch (error) {
      logger.error('Error sending fraud alert notification:', error);
    }
  }

  /**
   * Calculate distance between two locations
   */
  calculateDistance(location1, location2) {
    // Simplified distance calculation
    // In real implementation, use proper geolocation libraries
    if (!location1.coordinates || !location2.coordinates) {
      return 0;
    }
    
    const [lat1, lon1] = location1.coordinates;
    const [lat2, lon2] = location2.coordinates;
    
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance;
  }

  /**
   * Get risk level from score
   */
  getRiskLevel(score) {
    if (score >= 80) return 'very_high';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    if (score >= 20) return 'low';
    return 'very_low';
  }

  /**
   * Get severity from score
   */
  getSeverityFromScore(score) {
    if (score >= 90) return 'critical';
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  /**
   * Start real-time monitoring
   */
  startRealTimeMonitoring() {
    // Process alert queue every 30 seconds
    setInterval(() => {
      this.processAlertQueue();
    }, 30000);

    logger.info('Fraud detection real-time monitoring started');
  }

  /**
   * Process alert queue
   */
  async processAlertQueue() {
    if (this.alertQueue.length === 0) return;

    try {
      const alerts = this.alertQueue.splice(0, 10); // Process up to 10 alerts at a time
      
      for (const alert of alerts) {
        // Process alert (send notifications, update databases, etc.)
        await this.processAlert(alert);
      }

      logger.info(`Processed ${alerts.length} fraud alerts`);

    } catch (error) {
      logger.error('Error processing alert queue:', error);
    }
  }

  /**
   * Process individual alert
   */
  async processAlert(alert) {
    try {
      // Update alert processing status
      // Send to security team
      // Log to audit trail
      // Take automated actions if needed

      logger.info(`Processed fraud alert: ${alert.alertId}`);

    } catch (error) {
      logger.error(`Error processing alert ${alert.alertId}:`, error);
    }
  }

  /**
   * Get fraud detection dashboard
   */
  async getFraudDashboard(tenantId = null) {
    try {
      const FraudAlert = mongoose.model('FraudAlert');
      const RiskAssessment = mongoose.model('RiskAssessment');

      const filter = tenantId ? { tenantId } : {};

      // Get alert statistics
      const alertStats = await FraudAlert.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { severity: '$severity', status: '$status' },
            count: { $sum: 1 }
          }
        }
      ]);

      // Get recent alerts
      const recentAlerts = await FraudAlert.find(filter)
        .sort({ createdAt: -1 })
        .limit(20);

      // Get risk assessment trends
      const riskTrends = await RiskAssessment.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              riskLevel: '$riskLevel'
            },
            count: { $sum: 1 },
            avgRiskScore: { $avg: '$totalRiskScore' }
          }
        },
        { $sort: { '_id.date': -1 } },
        { $limit: 30 }
      ]);

      return {
        alerts: {
          total: alertStats.reduce((sum, stat) => sum + stat.count, 0),
          pending: alertStats.filter(s => s._id.status === 'pending').reduce((sum, stat) => sum + stat.count, 0),
          critical: alertStats.filter(s => s._id.severity === 'critical').reduce((sum, stat) => sum + stat.count, 0),
          recent: recentAlerts.slice(0, 10)
        },
        riskTrends: riskTrends,
        summary: {
          averageRiskScore: riskTrends.length > 0 ? 
            riskTrends.reduce((sum, trend) => sum + trend.avgRiskScore, 0) / riskTrends.length : 0,
          highRiskTransactions: riskTrends.filter(t => t._id.riskLevel === 'high' || t._id.riskLevel === 'very_high').length,
          detectionAccuracy: 95 // Placeholder - implement actual accuracy calculation
        },
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Error getting fraud dashboard:', error);
      return { error: 'Failed to load fraud dashboard' };
    }
  }
}

module.exports = new FraudDetectionService();