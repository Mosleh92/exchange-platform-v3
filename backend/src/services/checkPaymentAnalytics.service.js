const db = require('../config/database');
const logger = require('../utils/logger');
const { format, subDays, startOfDay, endOfDay, parseISO } = require('date-fns');

/**
 * Advanced Check Payment Analytics Service
 * Provides comprehensive check payment tracking and analysis
 */
class CheckPaymentAnalyticsService {
  constructor() {
    this.checkAnalyticsCache = new Map();
    this.cacheTTL = 300000; // 5 minutes
  }

  /**
   * Generate comprehensive check payment analytics report
   * 
   * @param {Object} params - Report parameters
   * @param {string} params.tenantId - Tenant identifier
   * @param {string} params.startDate - Start date (ISO string)
   * @param {string} params.endDate - End date (ISO string)
   * @param {string} params.currency - Base currency
   * @param {string} params.granularity - Time granularity (daily/weekly/monthly)
   * @param {Array} params.includeMetrics - Additional metrics to include
   * @returns {Object} Comprehensive check payment analytics report
   */
  async generateCheckPaymentReport(params) {
    const {
      tenantId,
      startDate,
      endDate,
      currency = 'USD',
      granularity = 'daily',
      includeMetrics = []
    } = params;

    try {
      logger.info(`Generating check payment report for tenant ${tenantId}`, { 
        startDate, endDate, currency 
      });

      // Generate base check payment data
      const baseCheckData = await this.calculateBaseCheckData(tenantId, startDate, endDate, currency);
      
      // Generate check processing analytics
      const processingAnalytics = await this.generateProcessingAnalytics(tenantId, startDate, endDate, currency);
      
      // Generate check trends
      const trends = await this.analyzeCheckTrends(tenantId, startDate, endDate, currency, granularity);
      
      // Generate comparative analysis
      const comparison = await this.generateComparativeAnalysis(tenantId, startDate, endDate, currency);
      
      // Generate risk analysis
      const riskAnalysis = await this.analyzeCheckRiskMetrics(tenantId, startDate, endDate, currency);
      
      // Generate fraud detection analytics
      const fraudAnalytics = await this.generateFraudAnalytics(tenantId, startDate, endDate, currency);
      
      // Generate forecasting
      const forecasting = await this.generateCheckForecasting(tenantId, startDate, endDate, currency);

      const report = {
        summary: {
          period: { startDate, endDate },
          currency,
          totalChecks: baseCheckData.totalChecks,
          totalAmount: baseCheckData.totalAmount,
          processedChecks: baseCheckData.processedChecks,
          pendingChecks: baseCheckData.pendingChecks,
          rejectedChecks: baseCheckData.rejectedChecks,
          averageCheckAmount: baseCheckData.averageCheckAmount,
          processingRate: processingAnalytics.processingRate,
          fraudRate: fraudAnalytics.fraudRate
        },
        detailed: {
          checkBreakdown: baseCheckData.checkBreakdown,
          processingBreakdown: processingAnalytics.processingBreakdown,
          statusDistribution: baseCheckData.statusDistribution
        },
        analytics: {
          trends: trends,
          comparison: comparison,
          risk: riskAnalysis,
          fraud: fraudAnalytics,
          forecasting: forecasting,
          kpis: await this.calculateCheckKPIs(tenantId, startDate, endDate, currency)
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          tenantId,
          granularity,
          includeMetrics
        }
      };

      // Cache the report
      this.cacheCheckReport(tenantId, startDate, endDate, currency, report);

      return report;

    } catch (error) {
      logger.error('Failed to generate check payment report:', error);
      throw new Error('Failed to generate check payment analytics report');
    }
  }

  /**
   * Calculate base check payment data
   */
  async calculateBaseCheckData(tenantId, startDate, endDate, currency) {
    const query = `
      SELECT 
        COUNT(*) as total_checks,
        SUM(amount) as total_amount,
        COUNT(CASE WHEN status = 'PROCESSED' THEN 1 END) as processed_checks,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_checks,
        COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected_checks,
        COUNT(CASE WHEN status = 'FRAUD' THEN 1 END) as fraud_checks,
        AVG(amount) as average_amount,
        MIN(amount) as min_amount,
        MAX(amount) as max_amount
      FROM check_payments 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND created_at BETWEEN $3 AND $4
    `;

    const result = await db.query(query, [tenantId, currency, startDate, endDate]);
    const data = result.rows[0];

    const totalChecks = parseInt(data.total_checks) || 0;
    const totalAmount = parseFloat(data.total_amount) || 0;
    const processedChecks = parseInt(data.processed_checks) || 0;
    const pendingChecks = parseInt(data.pending_checks) || 0;
    const rejectedChecks = parseInt(data.rejected_checks) || 0;
    const fraudChecks = parseInt(data.fraud_checks) || 0;
    const averageCheckAmount = parseFloat(data.average_amount) || 0;

    // Get detailed breakdowns
    const checkBreakdown = await this.getCheckBreakdown(tenantId, startDate, endDate, currency);
    const statusDistribution = await this.getStatusDistribution(tenantId, startDate, endDate, currency);
    const bankBreakdown = await this.getBankBreakdown(tenantId, startDate, endDate, currency);

    return {
      totalChecks,
      totalAmount,
      processedChecks,
      pendingChecks,
      rejectedChecks,
      fraudChecks,
      averageCheckAmount,
      minAmount: parseFloat(data.min_amount) || 0,
      maxAmount: parseFloat(data.max_amount) || 0,
      checkBreakdown,
      statusDistribution,
      bankBreakdown
    };
  }

  /**
   * Generate processing analytics
   */
  async generateProcessingAnalytics(tenantId, startDate, endDate, currency) {
    const [
      processingRate,
      processingTime,
      processingBreakdown,
      qualityMetrics,
      efficiencyMetrics
    ] = await Promise.all([
      this.calculateProcessingRate(tenantId, startDate, endDate, currency),
      this.calculateProcessingTime(tenantId, startDate, endDate, currency),
      this.getProcessingBreakdown(tenantId, startDate, endDate, currency),
      this.calculateQualityMetrics(tenantId, startDate, endDate, currency),
      this.calculateEfficiencyMetrics(tenantId, startDate, endDate, currency)
    ]);

    return {
      processingRate,
      processingTime,
      processingBreakdown,
      qualityMetrics,
      efficiencyMetrics
    };
  }

  /**
   * Calculate processing rate
   */
  async calculateProcessingRate(tenantId, startDate, endDate, currency) {
    const query = `
      SELECT 
        COUNT(CASE WHEN status = 'PROCESSED' THEN 1 END) as processed_count,
        COUNT(*) as total_count
      FROM check_payments 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND created_at BETWEEN $3 AND $4
    `;

    const result = await db.query(query, [tenantId, currency, startDate, endDate]);
    const data = result.rows[0];

    const processedCount = parseInt(data.processed_count) || 0;
    const totalCount = parseInt(data.total_count) || 0;

    return totalCount > 0 ? (processedCount / totalCount) * 100 : 0;
  }

  /**
   * Calculate average processing time
   */
  async calculateProcessingTime(tenantId, startDate, endDate, currency) {
    const query = `
      SELECT 
        AVG(EXTRACT(EPOCH FROM (processed_at - created_at))/3600) as avg_hours,
        MIN(EXTRACT(EPOCH FROM (processed_at - created_at))/3600) as min_hours,
        MAX(EXTRACT(EPOCH FROM (processed_at - created_at))/3600) as max_hours
      FROM check_payments 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND created_at BETWEEN $3 AND $4
        AND status = 'PROCESSED'
        AND processed_at IS NOT NULL
    `;

    const result = await db.query(query, [tenantId, currency, startDate, endDate]);
    const data = result.rows[0];

    return {
      averageHours: parseFloat(data.avg_hours) || 0,
      minHours: parseFloat(data.min_hours) || 0,
      maxHours: parseFloat(data.max_hours) || 0
    };
  }

  /**
   * Calculate quality metrics
   */
  async calculateQualityMetrics(tenantId, startDate, endDate, currency) {
    const query = `
      SELECT 
        COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected_count,
        COUNT(CASE WHEN status = 'FRAUD' THEN 1 END) as fraud_count,
        COUNT(CASE WHEN status = 'PROCESSED' THEN 1 END) as processed_count,
        COUNT(*) as total_count
      FROM check_payments 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND created_at BETWEEN $3 AND $4
    `;

    const result = await db.query(query, [tenantId, currency, startDate, endDate]);
    const data = result.rows[0];

    const rejectedCount = parseInt(data.rejected_count) || 0;
    const fraudCount = parseInt(data.fraud_count) || 0;
    const processedCount = parseInt(data.processed_count) || 0;
    const totalCount = parseInt(data.total_count) || 0;

    return {
      rejectionRate: totalCount > 0 ? (rejectedCount / totalCount) * 100 : 0,
      fraudRate: totalCount > 0 ? (fraudCount / totalCount) * 100 : 0,
      successRate: totalCount > 0 ? (processedCount / totalCount) * 100 : 0,
      qualityScore: totalCount > 0 ? ((processedCount - fraudCount) / totalCount) * 100 : 0
    };
  }

  /**
   * Calculate efficiency metrics
   */
  async calculateEfficiencyMetrics(tenantId, startDate, endDate, currency) {
    const query = `
      SELECT 
        AVG(amount) as average_amount,
        COUNT(*) as total_checks,
        SUM(amount) as total_amount,
        COUNT(CASE WHEN status = 'PROCESSED' THEN 1 END) as processed_checks
      FROM check_payments 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND created_at BETWEEN $3 AND $4
    `;

    const result = await db.query(query, [tenantId, currency, startDate, endDate]);
    const data = result.rows[0];

    const averageAmount = parseFloat(data.average_amount) || 0;
    const totalChecks = parseInt(data.total_checks) || 0;
    const totalAmount = parseFloat(data.total_amount) || 0;
    const processedChecks = parseInt(data.processed_checks) || 0;

    return {
      averageAmount,
      checksPerDay: await this.calculateChecksPerDay(tenantId, startDate, endDate),
      amountPerCheck: totalChecks > 0 ? totalAmount / totalChecks : 0,
      processingEfficiency: totalChecks > 0 ? (processedChecks / totalChecks) * 100 : 0
    };
  }

  /**
   * Analyze check trends
   */
  async analyzeCheckTrends(tenantId, startDate, endDate, currency, granularity) {
    const groupBy = granularity === 'daily' ? 'DATE(created_at)' : 
                   granularity === 'weekly' ? 'DATE_TRUNC(\'week\', created_at)' : 
                   'DATE_TRUNC(\'month\', created_at)';

    const query = `
      SELECT 
        ${groupBy} as period,
        COUNT(*) as check_count,
        SUM(amount) as total_amount,
        COUNT(CASE WHEN status = 'PROCESSED' THEN 1 END) as processed_count,
        COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected_count,
        COUNT(CASE WHEN status = 'FRAUD' THEN 1 END) as fraud_count,
        AVG(amount) as average_amount
      FROM check_payments 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND created_at BETWEEN $3 AND $4
      GROUP BY ${groupBy}
      ORDER BY period
    `;

    const result = await db.query(query, [tenantId, currency, startDate, endDate]);
    
    return result.rows.map(row => ({
      period: row.period,
      checkCount: parseInt(row.check_count) || 0,
      totalAmount: parseFloat(row.total_amount) || 0,
      processedCount: parseInt(row.processed_count) || 0,
      rejectedCount: parseInt(row.rejected_count) || 0,
      fraudCount: parseInt(row.fraud_count) || 0,
      averageAmount: parseFloat(row.average_amount) || 0
    }));
  }

  /**
   * Generate comparative analysis
   */
  async generateComparativeAnalysis(tenantId, startDate, endDate, currency) {
    const currentPeriod = await this.calculateBaseCheckData(tenantId, startDate, endDate, currency);
    
    // Calculate previous period
    const periodDuration = new Date(endDate) - new Date(startDate);
    const previousStartDate = new Date(startDate.getTime() - periodDuration);
    const previousEndDate = new Date(startDate);
    
    const previousPeriod = await this.calculateBaseCheckData(tenantId, previousStartDate, previousEndDate, currency);

    return {
      currentPeriod,
      previousPeriod,
      changes: {
        checkCountChange: previousPeriod.totalChecks > 0 ? 
          ((currentPeriod.totalChecks - previousPeriod.totalChecks) / previousPeriod.totalChecks) * 100 : 0,
        amountChange: previousPeriod.totalAmount > 0 ? 
          ((currentPeriod.totalAmount - previousPeriod.totalAmount) / previousPeriod.totalAmount) * 100 : 0,
        processingRateChange: previousPeriod.processedChecks > 0 ? 
          ((currentPeriod.processedChecks - previousPeriod.processedChecks) / previousPeriod.processedChecks) * 100 : 0
      }
    };
  }

  /**
   * Analyze check risk metrics
   */
  async analyzeCheckRiskMetrics(tenantId, startDate, endDate, currency) {
    const query = `
      SELECT 
        STDDEV(amount) as amount_volatility,
        AVG(amount) as average_amount,
        MIN(amount) as min_amount,
        MAX(amount) as max_amount,
        COUNT(CASE WHEN amount > 10000 THEN 1 END) as high_value_checks,
        COUNT(CASE WHEN status = 'FRAUD' THEN 1 END) as fraud_count
      FROM check_payments 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND created_at BETWEEN $3 AND $4
    `;

    const result = await db.query(query, [tenantId, currency, startDate, endDate]);
    const data = result.rows[0];

    const totalChecks = await this.getTotalCheckCount(tenantId, startDate, endDate);
    const fraudCount = parseInt(data.fraud_count) || 0;
    const highValueChecks = parseInt(data.high_value_checks) || 0;

    return {
      amountVolatility: parseFloat(data.amount_volatility) || 0,
      averageAmount: parseFloat(data.average_amount) || 0,
      minAmount: parseFloat(data.min_amount) || 0,
      maxAmount: parseFloat(data.max_amount) || 0,
      fraudRate: totalChecks > 0 ? (fraudCount / totalChecks) * 100 : 0,
      highValueCheckRate: totalChecks > 0 ? (highValueChecks / totalChecks) * 100 : 0,
      riskScore: await this.calculateCheckRiskScore(tenantId, startDate, endDate, currency)
    };
  }

  /**
   * Generate fraud analytics
   */
  async generateFraudAnalytics(tenantId, startDate, endDate, currency) {
    const [
      fraudPatterns,
      fraudTrends,
      fraudRiskFactors,
      fraudPreventionMetrics
    ] = await Promise.all([
      this.analyzeFraudPatterns(tenantId, startDate, endDate, currency),
      this.analyzeFraudTrends(tenantId, startDate, endDate, currency),
      this.analyzeFraudRiskFactors(tenantId, startDate, endDate, currency),
      this.calculateFraudPreventionMetrics(tenantId, startDate, endDate, currency)
    ]);

    return {
      fraudPatterns,
      fraudTrends,
      fraudRiskFactors,
      fraudPreventionMetrics
    };
  }

  /**
   * Generate check forecasting
   */
  async generateCheckForecasting(tenantId, startDate, endDate, currency) {
    const historicalData = await this.getCheckHistoricalData(tenantId, startDate, endDate, currency);
    
    if (historicalData.length < 2) {
      return { forecast: [], confidence: 0 };
    }

    const forecast = this.calculateCheckForecast(historicalData, 30); // 30 days forecast
    
    return {
      forecast,
      confidence: this.calculateForecastConfidence(historicalData),
      methodology: 'Linear regression based on historical check payment trends'
    };
  }

  /**
   * Calculate check KPIs
   */
  async calculateCheckKPIs(tenantId, startDate, endDate, currency) {
    const [
      totalChecks,
      totalAmount,
      processedChecks,
      rejectedChecks,
      fraudChecks,
      averageAmount
    ] = await Promise.all([
      this.getTotalCheckCount(tenantId, startDate, endDate),
      this.getTotalCheckAmount(tenantId, startDate, endDate, currency),
      this.getProcessedCheckCount(tenantId, startDate, endDate),
      this.getRejectedCheckCount(tenantId, startDate, endDate),
      this.getFraudCheckCount(tenantId, startDate, endDate),
      this.getAverageCheckAmount(tenantId, startDate, endDate, currency)
    ]);

    const processingRate = totalChecks > 0 ? (processedChecks / totalChecks) * 100 : 0;
    const rejectionRate = totalChecks > 0 ? (rejectedChecks / totalChecks) * 100 : 0;
    const fraudRate = totalChecks > 0 ? (fraudChecks / totalChecks) * 100 : 0;

    return {
      totalChecks,
      totalAmount,
      processedChecks,
      rejectedChecks,
      fraudChecks,
      averageAmount,
      processingRate,
      rejectionRate,
      fraudRate,
      amountPerCheck: totalChecks > 0 ? totalAmount / totalChecks : 0
    };
  }

  // Helper methods
  async getCheckBreakdown(tenantId, startDate, endDate, currency) {
    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as check_count,
        SUM(amount) as total_amount,
        COUNT(CASE WHEN status = 'PROCESSED' THEN 1 END) as processed_count
      FROM check_payments 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND created_at BETWEEN $3 AND $4
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    const result = await db.query(query, [tenantId, currency, startDate, endDate]);
    return result.rows.map(row => ({
      date: row.date,
      checkCount: parseInt(row.check_count) || 0,
      totalAmount: parseFloat(row.total_amount) || 0,
      processedCount: parseInt(row.processed_count) || 0
    }));
  }

  async getStatusDistribution(tenantId, startDate, endDate, currency) {
    const query = `
      SELECT 
        status,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        AVG(amount) as average_amount
      FROM check_payments 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND created_at BETWEEN $3 AND $4
      GROUP BY status
      ORDER BY count DESC
    `;

    const result = await db.query(query, [tenantId, currency, startDate, endDate]);
    return result.rows.map(row => ({
      status: row.status,
      count: parseInt(row.count) || 0,
      totalAmount: parseFloat(row.total_amount) || 0,
      averageAmount: parseFloat(row.average_amount) || 0
    }));
  }

  async getBankBreakdown(tenantId, startDate, endDate, currency) {
    const query = `
      SELECT 
        bank_name,
        COUNT(*) as check_count,
        SUM(amount) as total_amount,
        COUNT(CASE WHEN status = 'PROCESSED' THEN 1 END) as processed_count
      FROM check_payments 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND created_at BETWEEN $3 AND $4
      GROUP BY bank_name
      ORDER BY total_amount DESC
    `;

    const result = await db.query(query, [tenantId, currency, startDate, endDate]);
    return result.rows.map(row => ({
      bankName: row.bank_name,
      checkCount: parseInt(row.check_count) || 0,
      totalAmount: parseFloat(row.total_amount) || 0,
      processedCount: parseInt(row.processed_count) || 0
    }));
  }

  async getProcessingBreakdown(tenantId, startDate, endDate, currency) {
    const query = `
      SELECT 
        processing_method,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (processed_at - created_at))/3600) as avg_hours
      FROM check_payments 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND created_at BETWEEN $3 AND $4
        AND status = 'PROCESSED'
      GROUP BY processing_method
      ORDER BY count DESC
    `;

    const result = await db.query(query, [tenantId, currency, startDate, endDate]);
    return result.rows.map(row => ({
      processingMethod: row.processing_method,
      count: parseInt(row.count) || 0,
      averageHours: parseFloat(row.avg_hours) || 0
    }));
  }

  // Cache management
  cacheCheckReport(tenantId, startDate, endDate, currency, report) {
    const key = `${tenantId}_${startDate}_${endDate}_${currency}`;
    this.checkAnalyticsCache.set(key, {
      data: report,
      timestamp: Date.now()
    });
  }

  getCachedCheckReport(tenantId, startDate, endDate, currency) {
    const key = `${tenantId}_${startDate}_${endDate}_${currency}`;
    const cached = this.checkAnalyticsCache.get(key);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
      return cached.data;
    }
    
    return null;
  }

  // Additional helper methods would be implemented here...
  async calculateChecksPerDay(tenantId, startDate, endDate) {
    // Implementation
    return 0;
  }

  async calculateCheckRiskScore(tenantId, startDate, endDate, currency) {
    // Implementation
    return 0;
  }

  async analyzeFraudPatterns(tenantId, startDate, endDate, currency) {
    // Implementation
    return [];
  }

  async analyzeFraudTrends(tenantId, startDate, endDate, currency) {
    // Implementation
    return [];
  }

  async analyzeFraudRiskFactors(tenantId, startDate, endDate, currency) {
    // Implementation
    return [];
  }

  async calculateFraudPreventionMetrics(tenantId, startDate, endDate, currency) {
    // Implementation
    return {};
  }

  async getCheckHistoricalData(tenantId, startDate, endDate, currency) {
    // Implementation
    return [];
  }

  calculateCheckForecast(data, days) {
    // Implementation
    return [];
  }

  calculateForecastConfidence(data) {
    // Implementation
    return 0;
  }

  async getTotalCheckCount(tenantId, startDate, endDate) {
    // Implementation
    return 0;
  }

  async getTotalCheckAmount(tenantId, startDate, endDate, currency) {
    // Implementation
    return 0;
  }

  async getProcessedCheckCount(tenantId, startDate, endDate) {
    // Implementation
    return 0;
  }

  async getRejectedCheckCount(tenantId, startDate, endDate) {
    // Implementation
    return 0;
  }

  async getFraudCheckCount(tenantId, startDate, endDate) {
    // Implementation
    return 0;
  }

  async getAverageCheckAmount(tenantId, startDate, endDate, currency) {
    // Implementation
    return 0;
  }
}

module.exports = new CheckPaymentAnalyticsService(); 