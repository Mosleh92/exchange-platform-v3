const db = require('../config/database');
const logger = require('../utils/logger');
const crypto = require('crypto');
const { EventEmitter } = require('events');

/**
 * Comprehensive Compliance Service
 * Handles KYC/AML, transaction monitoring, audit trails, and regulatory compliance
 */
class ComplianceService extends EventEmitter {
  constructor() {
    super();
    this.suspiciousPatterns = new Map();
    this.riskThresholds = {
      highValueTransaction: 10000,
      rapidTransactions: 5, // transactions per minute
      unusualPatterns: 3 // suspicious patterns detected
    };
    
    this.initializeComplianceRules();
  }

  /**
   * Initialize compliance rules and patterns
   */
  initializeComplianceRules() {
    // Suspicious transaction patterns
    this.suspiciousPatterns.set('STRUCTURING', {
      pattern: 'Multiple small transactions to avoid reporting',
      threshold: 3,
      timeWindow: 24 * 60 * 60 * 1000 // 24 hours
    });

    this.suspiciousPatterns.set('HIGH_VALUE', {
      pattern: 'Unusually high value transactions',
      threshold: 50000,
      timeWindow: 60 * 60 * 1000 // 1 hour
    });

    this.suspiciousPatterns.set('RAPID_TRANSACTIONS', {
      pattern: 'Rapid succession of transactions',
      threshold: 10,
      timeWindow: 60 * 1000 // 1 minute
    });

    this.suspiciousPatterns.set('GEOGRAPHIC_RISK', {
      pattern: 'Transactions from high-risk jurisdictions',
      threshold: 1,
      timeWindow: 24 * 60 * 60 * 1000 // 24 hours
    });
  }

  /**
   * KYC verification process
   */
  async performKYCVerification(userId, tenantId, kycData) {
    try {
      logger.info('Starting KYC verification', { userId, tenantId });

      // Validate KYC data
      await this.validateKYCData(kycData);

      // Perform identity verification
      const identityVerification = await this.verifyIdentity(kycData);

      // Perform address verification
      const addressVerification = await this.verifyAddress(kycData);

      // Perform document verification
      const documentVerification = await this.verifyDocuments(kycData);

      // Perform risk assessment
      const riskAssessment = await this.performRiskAssessment(kycData);

      // Determine KYC status
      const kycStatus = this.determineKYCStatus(
        identityVerification,
        addressVerification,
        documentVerification,
        riskAssessment
      );

      // Store KYC verification results
      await this.storeKYCResults(userId, tenantId, {
        kycData,
        identityVerification,
        addressVerification,
        documentVerification,
        riskAssessment,
        kycStatus,
        verifiedAt: new Date()
      });

      // Emit KYC completion event
      this.emit('kycCompleted', {
        userId,
        tenantId,
        kycStatus,
        riskLevel: riskAssessment.riskLevel
      });

      logger.info('KYC verification completed', { userId, tenantId, kycStatus });

      return {
        status: 'SUCCESS',
        kycStatus,
        riskLevel: riskAssessment.riskLevel,
        message: 'KYC verification completed successfully'
      };

    } catch (error) {
      logger.error('KYC verification failed:', error);
      throw new Error('KYC verification failed: ' + error.message);
    }
  }

  /**
   * Validate KYC data
   */
  async validateKYCData(kycData) {
    const requiredFields = [
      'firstName', 'lastName', 'dateOfBirth', 'nationality',
      'address', 'phoneNumber', 'email', 'idType', 'idNumber'
    ];

    for (const field of requiredFields) {
      if (!kycData[field]) {
        throw new Error(`Missing required KYC field: ${field}`);
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(kycData.email)) {
      throw new Error('Invalid email format');
    }

    // Validate phone number
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(kycData.phoneNumber)) {
      throw new Error('Invalid phone number format');
    }

    // Validate date of birth
    const dob = new Date(kycData.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    if (age < 18) {
      throw new Error('User must be at least 18 years old');
    }
  }

  /**
   * Verify identity
   */
  async verifyIdentity(kycData) {
    // Integration with identity verification service
    // This would typically call an external API
    
    const verificationResult = {
      status: 'VERIFIED',
      confidence: 0.95,
      method: 'DOCUMENT_VERIFICATION',
      verifiedAt: new Date()
    };

    // Simulate verification process
    await new Promise(resolve => setTimeout(resolve, 1000));

    return verificationResult;
  }

  /**
   * Verify address
   */
  async verifyAddress(kycData) {
    // Integration with address verification service
    
    const verificationResult = {
      status: 'VERIFIED',
      confidence: 0.90,
      method: 'ADDRESS_VERIFICATION',
      verifiedAt: new Date()
    };

    // Simulate verification process
    await new Promise(resolve => setTimeout(resolve, 500));

    return verificationResult;
  }

  /**
   * Verify documents
   */
  async verifyDocuments(kycData) {
    // Integration with document verification service
    
    const verificationResult = {
      status: 'VERIFIED',
      confidence: 0.92,
      method: 'DOCUMENT_SCANNING',
      verifiedAt: new Date()
    };

    // Simulate verification process
    await new Promise(resolve => setTimeout(resolve, 2000));

    return verificationResult;
  }

  /**
   * Perform risk assessment
   */
  async performRiskAssessment(kycData) {
    let riskScore = 0;
    const riskFactors = [];

    // Check nationality risk
    const highRiskCountries = ['IR', 'KP', 'CU', 'SY'];
    if (highRiskCountries.includes(kycData.nationality)) {
      riskScore += 50;
      riskFactors.push('HIGH_RISK_NATIONALITY');
    }

    // Check PEP (Politically Exposed Person)
    const isPEP = await this.checkPEPStatus(kycData);
    if (isPEP) {
      riskScore += 30;
      riskFactors.push('POLITICALLY_EXPOSED_PERSON');
    }

    // Check sanctions
    const isSanctioned = await this.checkSanctionsList(kycData);
    if (isSanctioned) {
      riskScore += 100;
      riskFactors.push('SANCTIONS_LIST_MATCH');
    }

    // Determine risk level
    let riskLevel = 'LOW';
    if (riskScore >= 80) {
      riskLevel = 'HIGH';
    } else if (riskScore >= 40) {
      riskLevel = 'MEDIUM';
    }

    return {
      riskScore,
      riskLevel,
      riskFactors,
      assessedAt: new Date()
    };
  }

  /**
   * Determine KYC status
   */
  determineKYCStatus(identityVerification, addressVerification, documentVerification, riskAssessment) {
    // All verifications must pass
    if (identityVerification.status !== 'VERIFIED' ||
        addressVerification.status !== 'VERIFIED' ||
        documentVerification.status !== 'VERIFIED') {
      return 'REJECTED';
    }

    // Check risk level
    if (riskAssessment.riskLevel === 'HIGH') {
      return 'PENDING_REVIEW';
    }

    return 'APPROVED';
  }

  /**
   * Transaction monitoring for AML
   */
  async monitorTransaction(transactionData) {
    try {
      const {
        userId,
        tenantId,
        amount,
        currency,
        transactionType,
        counterparty,
        timestamp
      } = transactionData;

      logger.info('Monitoring transaction', { userId, amount, currency, transactionType });

      // Perform transaction screening
      const screeningResults = await this.performTransactionScreening(transactionData);

      // Check for suspicious patterns
      const patternAnalysis = await this.analyzeTransactionPatterns(userId, tenantId, transactionData);

      // Calculate risk score
      const riskScore = this.calculateTransactionRiskScore(screeningResults, patternAnalysis);

      // Determine if transaction requires review
      const requiresReview = riskScore > 70;

      // Store monitoring results
      await this.storeTransactionMonitoringResults(transactionData, {
        screeningResults,
        patternAnalysis,
        riskScore,
        requiresReview,
        monitoredAt: new Date()
      });

      // Emit monitoring event
      this.emit('transactionMonitored', {
        transactionId: transactionData.id,
        riskScore,
        requiresReview,
        screeningResults
      });

      if (requiresReview) {
        await this.flagTransactionForReview(transactionData, riskScore);
      }

      return {
        status: 'MONITORED',
        riskScore,
        requiresReview,
        message: 'Transaction monitored successfully'
      };

    } catch (error) {
      logger.error('Transaction monitoring failed:', error);
      throw new Error('Transaction monitoring failed: ' + error.message);
    }
  }

  /**
   * Perform transaction screening
   */
  async performTransactionScreening(transactionData) {
    const screeningResults = {
      sanctionsCheck: await this.checkSanctions(transactionData),
      pepCheck: await this.checkPEP(transactionData),
      adverseMediaCheck: await this.checkAdverseMedia(transactionData),
      geographicRiskCheck: await this.checkGeographicRisk(transactionData)
    };

    return screeningResults;
  }

  /**
   * Analyze transaction patterns
   */
  async analyzeTransactionPatterns(userId, tenantId, transactionData) {
    const patterns = [];

    // Check for structuring
    const structuringCheck = await this.checkStructuring(userId, tenantId, transactionData);
    if (structuringCheck.detected) {
      patterns.push({
        type: 'STRUCTURING',
        confidence: structuringCheck.confidence,
        details: structuringCheck.details
      });
    }

    // Check for high-value transactions
    if (transactionData.amount > this.riskThresholds.highValueTransaction) {
      patterns.push({
        type: 'HIGH_VALUE',
        confidence: 0.9,
        details: `Transaction amount ${transactionData.amount} exceeds threshold`
      });
    }

    // Check for rapid transactions
    const rapidTransactionCheck = await this.checkRapidTransactions(userId, tenantId, transactionData);
    if (rapidTransactionCheck.detected) {
      patterns.push({
        type: 'RAPID_TRANSACTIONS',
        confidence: rapidTransactionCheck.confidence,
        details: rapidTransactionCheck.details
      });
    }

    return patterns;
  }

  /**
   * Calculate transaction risk score
   */
  calculateTransactionRiskScore(screeningResults, patternAnalysis) {
    let riskScore = 0;

    // Screening results
    if (screeningResults.sanctionsCheck.match) riskScore += 100;
    if (screeningResults.pepCheck.match) riskScore += 50;
    if (screeningResults.adverseMediaCheck.match) riskScore += 30;
    if (screeningResults.geographicRiskCheck.highRisk) riskScore += 40;

    // Pattern analysis
    patternAnalysis.forEach(pattern => {
      switch (pattern.type) {
        case 'STRUCTURING':
          riskScore += 60;
          break;
        case 'HIGH_VALUE':
          riskScore += 30;
          break;
        case 'RAPID_TRANSACTIONS':
          riskScore += 40;
          break;
      }
    });

    return Math.min(riskScore, 100);
  }

  /**
   * Check for structuring patterns
   */
  async checkStructuring(userId, tenantId, transactionData) {
    const query = `
      SELECT COUNT(*) as count, SUM(amount) as total_amount
      FROM transactions 
      WHERE user_id = $1 
        AND tenant_id = $2 
        AND created_at >= NOW() - INTERVAL '24 hours'
        AND amount < 10000
    `;

    const result = await db.query(query, [userId, tenantId]);
    const data = result.rows[0];

    const count = parseInt(data.count) || 0;
    const totalAmount = parseFloat(data.total_amount) || 0;

    return {
      detected: count >= 3 && totalAmount > 10000,
      confidence: count >= 3 ? 0.8 : 0.3,
      details: `${count} transactions totaling ${totalAmount} in 24 hours`
    };
  }

  /**
   * Check for rapid transactions
   */
  async checkRapidTransactions(userId, tenantId, transactionData) {
    const query = `
      SELECT COUNT(*) as count
      FROM transactions 
      WHERE user_id = $1 
        AND tenant_id = $2 
        AND created_at >= NOW() - INTERVAL '1 minute'
    `;

    const result = await db.query(query, [userId, tenantId]);
    const count = parseInt(result.rows[0].count) || 0;

    return {
      detected: count >= this.riskThresholds.rapidTransactions,
      confidence: count >= 10 ? 0.9 : 0.6,
      details: `${count} transactions in the last minute`
    };
  }

  /**
   * Create comprehensive audit trail
   */
  async createAuditTrail(action, userId, tenantId, details) {
    try {
      const auditEntry = {
        action,
        userId,
        tenantId,
        details,
        timestamp: new Date(),
        ipAddress: details.ipAddress,
        userAgent: details.userAgent,
        sessionId: details.sessionId
      };

      // Store audit trail
      await this.storeAuditTrail(auditEntry);

      // Emit audit event
      this.emit('auditTrailCreated', auditEntry);

      logger.info('Audit trail created', { action, userId, tenantId });

    } catch (error) {
      logger.error('Failed to create audit trail:', error);
    }
  }

  /**
   * Generate compliance reports
   */
  async generateComplianceReport(tenantId, startDate, endDate, reportType) {
    try {
      let report;

      switch (reportType) {
        case 'KYC_SUMMARY':
          report = await this.generateKYCReport(tenantId, startDate, endDate);
          break;
        case 'AML_MONITORING':
          report = await this.generateAMLReport(tenantId, startDate, endDate);
          break;
        case 'SUSPICIOUS_ACTIVITY':
          report = await this.generateSuspiciousActivityReport(tenantId, startDate, endDate);
          break;
        case 'REGULATORY_COMPLIANCE':
          report = await this.generateRegulatoryComplianceReport(tenantId, startDate, endDate);
          break;
        default:
          throw new Error('Invalid report type');
      }

      // Create audit trail for report generation
      await this.createAuditTrail('COMPLIANCE_REPORT_GENERATED', null, tenantId, {
        reportType,
        startDate,
        endDate,
        ipAddress: 'SYSTEM'
      });

      return report;

    } catch (error) {
      logger.error('Failed to generate compliance report:', error);
      throw error;
    }
  }

  /**
   * Generate KYC report
   */
  async generateKYCReport(tenantId, startDate, endDate) {
    const query = `
      SELECT 
        COUNT(*) as total_verifications,
        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected,
        COUNT(CASE WHEN status = 'PENDING_REVIEW' THEN 1 END) as pending_review,
        AVG(CASE WHEN risk_level = 'HIGH' THEN 1 ELSE 0 END) as high_risk_percentage
      FROM kyc_verifications 
      WHERE tenant_id = $1 
        AND created_at BETWEEN $2 AND $3
    `;

    const result = await db.query(query, [tenantId, startDate, endDate]);
    const data = result.rows[0];

    return {
      reportType: 'KYC_SUMMARY',
      period: { startDate, endDate },
      summary: {
        totalVerifications: parseInt(data.total_verifications) || 0,
        approved: parseInt(data.approved) || 0,
        rejected: parseInt(data.rejected) || 0,
        pendingReview: parseInt(data.pending_review) || 0,
        highRiskPercentage: parseFloat(data.high_risk_percentage) * 100 || 0
      },
      generatedAt: new Date()
    };
  }

  /**
   * Generate AML monitoring report
   */
  async generateAMLReport(tenantId, startDate, endDate) {
    const query = `
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN risk_score > 70 THEN 1 END) as high_risk_transactions,
        COUNT(CASE WHEN requires_review = true THEN 1 END) as flagged_transactions,
        AVG(risk_score) as average_risk_score
      FROM transaction_monitoring 
      WHERE tenant_id = $1 
        AND monitored_at BETWEEN $2 AND $3
    `;

    const result = await db.query(query, [tenantId, startDate, endDate]);
    const data = result.rows[0];

    return {
      reportType: 'AML_MONITORING',
      period: { startDate, endDate },
      summary: {
        totalTransactions: parseInt(data.total_transactions) || 0,
        highRiskTransactions: parseInt(data.high_risk_transactions) || 0,
        flaggedTransactions: parseInt(data.flagged_transactions) || 0,
        averageRiskScore: parseFloat(data.average_risk_score) || 0
      },
      generatedAt: new Date()
    };
  }

  // Helper methods
  async checkPEPStatus(kycData) {
    // Integration with PEP screening service
    return false;
  }

  async checkSanctionsList(kycData) {
    // Integration with sanctions screening service
    return false;
  }

  async checkSanctions(transactionData) {
    // Implementation for sanctions checking
    return { match: false, details: 'No sanctions match found' };
  }

  async checkPEP(transactionData) {
    // Implementation for PEP checking
    return { match: false, details: 'No PEP match found' };
  }

  async checkAdverseMedia(transactionData) {
    // Implementation for adverse media checking
    return { match: false, details: 'No adverse media found' };
  }

  async checkGeographicRisk(transactionData) {
    // Implementation for geographic risk checking
    return { highRisk: false, details: 'Low geographic risk' };
  }

  async storeKYCResults(userId, tenantId, results) {
    // Implementation to store KYC results
  }

  async storeTransactionMonitoringResults(transactionData, results) {
    // Implementation to store monitoring results
  }

  async flagTransactionForReview(transactionData, riskScore) {
    // Implementation to flag transaction for review
  }

  async storeAuditTrail(auditEntry) {
    // Implementation to store audit trail
  }

  async generateSuspiciousActivityReport(tenantId, startDate, endDate) {
    // Implementation for suspicious activity report
    return {};
  }

  async generateRegulatoryComplianceReport(tenantId, startDate, endDate) {
    // Implementation for regulatory compliance report
    return {};
  }
}

module.exports = new ComplianceService(); 