const db = require('../config/database');
const logger = require('../utils/logger');
const { format, subDays, startOfDay, endOfDay, parseISO } = require('date-fns');

/**
 * Advanced Commission Analytics Service
 * Provides comprehensive commission tracking and analysis for partners/affiliates
 */
class CommissionAnalyticsService {
  constructor() {
    this.commissionCache = new Map();
    this.cacheTTL = 300000; // 5 minutes
  }

  /**
   * Generate comprehensive commission analytics report
   * 
   * @param {Object} params - Report parameters
   * @param {string} params.tenantId - Tenant identifier
   * @param {string} params.partnerId - Partner identifier (optional)
   * @param {string} params.startDate - Start date (ISO string)
   * @param {string} params.endDate - End date (ISO string)
   * @param {string} params.currency - Base currency
   * @param {string} params.granularity - Time granularity (daily/weekly/monthly)
   * @returns {Object} Comprehensive commission analytics report
   */
  async generateCommissionReport(params) {
    const {
      tenantId,
      partnerId,
      startDate,
      endDate,
      currency = 'USD',
      granularity = 'daily'
    } = params;

    try {
      logger.info(`Generating commission report for tenant ${tenantId}`, { 
        partnerId, startDate, endDate, currency 
      });

      // Generate base commission data
      const baseCommission = await this.calculateBaseCommission(tenantId, partnerId, startDate, endDate, currency);
      
      // Generate partner performance analytics
      const partnerAnalytics = await this.generatePartnerAnalytics(tenantId, partnerId, startDate, endDate, currency);
      
      // Generate commission trends
      const trends = await this.analyzeCommissionTrends(tenantId, partnerId, startDate, endDate, currency, granularity);
      
      // Generate comparative analysis
      const comparison = await this.generateComparativeAnalysis(tenantId, partnerId, startDate, endDate, currency);
      
      // Generate tier analysis
      const tierAnalysis = await this.analyzeCommissionTiers(tenantId, startDate, endDate, currency);
      
      // Generate forecasting
      const forecasting = await this.generateCommissionForecasting(tenantId, partnerId, startDate, endDate, currency);

      const report = {
        summary: {
          period: { startDate, endDate },
          currency,
          totalCommission: baseCommission.totalCommission,
          totalTransactions: baseCommission.totalTransactions,
          averageCommission: baseCommission.averageCommission,
          commissionRate: baseCommission.commissionRate,
          topPerformers: partnerAnalytics.topPerformers,
          conversionRate: partnerAnalytics.conversionRate
        },
        detailed: {
          commissionBreakdown: baseCommission.commissionBreakdown,
          partnerPerformance: partnerAnalytics.partnerPerformance,
          tierDistribution: tierAnalysis.tierDistribution
        },
        analytics: {
          trends: trends,
          comparison: comparison,
          tierAnalysis: tierAnalysis,
          forecasting: forecasting,
          kpis: await this.calculateCommissionKPIs(tenantId, partnerId, startDate, endDate, currency)
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          tenantId,
          partnerId,
          granularity
        }
      };

      // Cache the report
      this.cacheCommissionReport(tenantId, partnerId, startDate, endDate, currency, report);

      return report;

    } catch (error) {
      logger.error('Failed to generate commission report:', error);
      throw new Error('Failed to generate commission analytics report');
    }
  }

  /**
   * Calculate base commission data
   */
  async calculateBaseCommission(tenantId, partnerId, startDate, endDate, currency) {
    let query = `
      SELECT 
        SUM(commission_amount) as total_commission,
        COUNT(*) as total_transactions,
        AVG(commission_amount) as average_commission,
        AVG(commission_rate) as average_rate,
        SUM(transaction_amount) as total_transaction_volume
      FROM commission_transactions 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND created_at BETWEEN $3 AND $4
        AND status = 'PAID'
    `;

    const params = [tenantId, currency, startDate, endDate];

    if (partnerId) {
      query += ' AND partner_id = $5';
      params.push(partnerId);
    }

    const result = await db.query(query, params);
    const data = result.rows[0];

    const totalCommission = parseFloat(data.total_commission) || 0;
    const totalTransactions = parseInt(data.total_transactions) || 0;
    const averageCommission = parseFloat(data.average_commission) || 0;
    const averageRate = parseFloat(data.average_rate) || 0;
    const totalVolume = parseFloat(data.total_transaction_volume) || 0;

    // Get detailed breakdowns
    const commissionBreakdown = await this.getCommissionBreakdown(tenantId, partnerId, startDate, endDate, currency);
    const partnerBreakdown = await this.getPartnerBreakdown(tenantId, startDate, endDate, currency);

    return {
      totalCommission,
      totalTransactions,
      averageCommission,
      commissionRate: averageRate,
      totalTransactionVolume: totalVolume,
      commissionBreakdown,
      partnerBreakdown
    };
  }

  /**
   * Generate partner performance analytics
   */
  async generatePartnerAnalytics(tenantId, partnerId, startDate, endDate, currency) {
    const [
      topPerformers,
      conversionRate,
      retentionRate,
      partnerEfficiency,
      partnerGrowth
    ] = await Promise.all([
      this.getTopPerformers(tenantId, startDate, endDate, currency),
      this.calculateConversionRate(tenantId, partnerId, startDate, endDate, currency),
      this.calculateRetentionRate(tenantId, partnerId, startDate, endDate, currency),
      this.calculatePartnerEfficiency(tenantId, partnerId, startDate, endDate, currency),
      this.calculatePartnerGrowth(tenantId, partnerId, startDate, endDate, currency)
    ]);

    return {
      topPerformers,
      conversionRate,
      retentionRate,
      partnerEfficiency,
      partnerGrowth
    };
  }

  /**
   * Get top performing partners
   */
  async getTopPerformers(tenantId, startDate, endDate, currency) {
    const query = `
      SELECT 
        ct.partner_id,
        p.name as partner_name,
        p.email as partner_email,
        p.tier as partner_tier,
        SUM(ct.commission_amount) as total_commission,
        COUNT(*) as transaction_count,
        AVG(ct.commission_rate) as average_rate,
        SUM(ct.transaction_amount) as total_volume
      FROM commission_transactions ct
      JOIN partners p ON ct.partner_id = p.id
      WHERE ct.tenant_id = $1 
        AND ct.currency = $2 
        AND ct.created_at BETWEEN $3 AND $4
        AND ct.status = 'PAID'
      GROUP BY ct.partner_id, p.name, p.email, p.tier
      ORDER BY total_commission DESC
      LIMIT 10
    `;

    const result = await db.query(query, [tenantId, currency, startDate, endDate]);
    
    return result.rows.map(row => ({
      partnerId: row.partner_id,
      partnerName: row.partner_name,
      partnerEmail: row.partner_email,
      partnerTier: row.partner_tier,
      totalCommission: parseFloat(row.total_commission) || 0,
      transactionCount: parseInt(row.transaction_count) || 0,
      averageRate: parseFloat(row.average_rate) || 0,
      totalVolume: parseFloat(row.total_volume) || 0
    }));
  }

  /**
   * Calculate conversion rate
   */
  async calculateConversionRate(tenantId, partnerId, startDate, endDate, currency) {
    const query = `
      SELECT 
        COUNT(DISTINCT ct.partner_id) as active_partners,
        COUNT(DISTINCT p.id) as total_partners
      FROM commission_transactions ct
      JOIN partners p ON ct.partner_id = p.id
      WHERE ct.tenant_id = $1 
        AND ct.currency = $2 
        AND ct.created_at BETWEEN $3 AND $4
        AND ct.status = 'PAID'
    `;

    const result = await db.query(query, [tenantId, currency, startDate, endDate]);
    const data = result.rows[0];

    const activePartners = parseInt(data.active_partners) || 0;
    const totalPartners = parseInt(data.total_partners) || 0;

    return totalPartners > 0 ? (activePartners / totalPartners) * 100 : 0;
  }

  /**
   * Calculate retention rate
   */
  async calculateRetentionRate(tenantId, partnerId, startDate, endDate, currency) {
    // Get partners who were active in previous period
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - 30);
    const previousPeriodEnd = new Date(startDate);

    const previousActiveQuery = `
      SELECT COUNT(DISTINCT partner_id) as previous_active
      FROM commission_transactions 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND created_at BETWEEN $3 AND $4
        AND status = 'PAID'
    `;

    const currentActiveQuery = `
      SELECT COUNT(DISTINCT partner_id) as current_active
      FROM commission_transactions 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND created_at BETWEEN $5 AND $6
        AND status = 'PAID'
    `;

    const [previousResult, currentResult] = await Promise.all([
      db.query(previousActiveQuery, [tenantId, currency, previousPeriodStart, previousPeriodEnd]),
      db.query(currentActiveQuery, [tenantId, currency, startDate, endDate])
    ]);

    const previousActive = parseInt(previousResult.rows[0]?.previous_active) || 0;
    const currentActive = parseInt(currentResult.rows[0]?.current_active) || 0;

    return previousActive > 0 ? (currentActive / previousActive) * 100 : 0;
  }

  /**
   * Calculate partner efficiency
   */
  async calculatePartnerEfficiency(tenantId, partnerId, startDate, endDate, currency) {
    const query = `
      SELECT 
        AVG(commission_rate) as average_rate,
        AVG(commission_amount / transaction_amount) as efficiency_ratio,
        COUNT(*) as transaction_count,
        SUM(commission_amount) as total_commission,
        SUM(transaction_amount) as total_volume
      FROM commission_transactions 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND created_at BETWEEN $3 AND $4
        AND status = 'PAID'
    `;

    const params = [tenantId, currency, startDate, endDate];
    if (partnerId) {
      query += ' AND partner_id = $5';
      params.push(partnerId);
    }

    const result = await db.query(query, params);
    const data = result.rows[0];

    return {
      averageRate: parseFloat(data.average_rate) || 0,
      efficiencyRatio: parseFloat(data.efficiency_ratio) || 0,
      transactionCount: parseInt(data.transaction_count) || 0,
      totalCommission: parseFloat(data.total_commission) || 0,
      totalVolume: parseFloat(data.total_volume) || 0
    };
  }

  /**
   * Calculate partner growth
   */
  async calculatePartnerGrowth(tenantId, partnerId, startDate, endDate, currency) {
    // Compare current period with previous period
    const periodDuration = new Date(endDate) - new Date(startDate);
    const previousStartDate = new Date(startDate.getTime() - periodDuration);
    const previousEndDate = new Date(startDate);

    const currentQuery = `
      SELECT SUM(commission_amount) as total_commission
      FROM commission_transactions 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND created_at BETWEEN $3 AND $4
        AND status = 'PAID'
    `;

    const previousQuery = `
      SELECT SUM(commission_amount) as total_commission
      FROM commission_transactions 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND created_at BETWEEN $5 AND $6
        AND status = 'PAID'
    `;

    const params = [tenantId, currency, startDate, endDate];
    const previousParams = [tenantId, currency, previousStartDate, previousEndDate];

    if (partnerId) {
      currentQuery += ' AND partner_id = $5';
      previousQuery += ' AND partner_id = $5';
      params.push(partnerId);
      previousParams.push(partnerId);
    }

    const [currentResult, previousResult] = await Promise.all([
      db.query(currentQuery, params),
      db.query(previousQuery, previousParams)
    ]);

    const currentCommission = parseFloat(currentResult.rows[0]?.total_commission) || 0;
    const previousCommission = parseFloat(previousResult.rows[0]?.total_commission) || 0;

    return previousCommission > 0 ? ((currentCommission - previousCommission) / previousCommission) * 100 : 0;
  }

  /**
   * Analyze commission trends
   */
  async analyzeCommissionTrends(tenantId, partnerId, startDate, endDate, currency, granularity) {
    const groupBy = granularity === 'daily' ? 'DATE(created_at)' : 
                   granularity === 'weekly' ? 'DATE_TRUNC(\'week\', created_at)' : 
                   'DATE_TRUNC(\'month\', created_at)';

    let query = `
      SELECT 
        ${groupBy} as period,
        SUM(commission_amount) as total_commission,
        COUNT(*) as transaction_count,
        AVG(commission_rate) as average_rate,
        SUM(transaction_amount) as total_volume
      FROM commission_transactions 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND created_at BETWEEN $3 AND $4
        AND status = 'PAID'
    `;

    const params = [tenantId, currency, startDate, endDate];
    if (partnerId) {
      query += ' AND partner_id = $5';
      params.push(partnerId);
    }

    query += ` GROUP BY ${groupBy} ORDER BY period`;

    const result = await db.query(query, params);
    
    return result.rows.map(row => ({
      period: row.period,
      totalCommission: parseFloat(row.total_commission) || 0,
      transactionCount: parseInt(row.transaction_count) || 0,
      averageRate: parseFloat(row.average_rate) || 0,
      totalVolume: parseFloat(row.total_volume) || 0
    }));
  }

  /**
   * Generate comparative analysis
   */
  async generateComparativeAnalysis(tenantId, partnerId, startDate, endDate, currency) {
    const currentPeriod = await this.calculateBaseCommission(tenantId, partnerId, startDate, endDate, currency);
    
    // Calculate previous period
    const periodDuration = new Date(endDate) - new Date(startDate);
    const previousStartDate = new Date(startDate.getTime() - periodDuration);
    const previousEndDate = new Date(startDate);
    
    const previousPeriod = await this.calculateBaseCommission(tenantId, partnerId, previousStartDate, previousEndDate, currency);

    return {
      currentPeriod,
      previousPeriod,
      changes: {
        commissionChange: previousPeriod.totalCommission > 0 ? 
          ((currentPeriod.totalCommission - previousPeriod.totalCommission) / previousPeriod.totalCommission) * 100 : 0,
        transactionChange: previousPeriod.totalTransactions > 0 ? 
          ((currentPeriod.totalTransactions - previousPeriod.totalTransactions) / previousPeriod.totalTransactions) * 100 : 0,
        rateChange: previousPeriod.commissionRate > 0 ? 
          ((currentPeriod.commissionRate - previousPeriod.commissionRate) / previousPeriod.commissionRate) * 100 : 0
      }
    };
  }

  /**
   * Analyze commission tiers
   */
  async analyzeCommissionTiers(tenantId, startDate, endDate, currency) {
    const query = `
      SELECT 
        p.tier as partner_tier,
        COUNT(DISTINCT ct.partner_id) as partner_count,
        SUM(ct.commission_amount) as total_commission,
        AVG(ct.commission_rate) as average_rate,
        COUNT(*) as transaction_count
      FROM commission_transactions ct
      JOIN partners p ON ct.partner_id = p.id
      WHERE ct.tenant_id = $1 
        AND ct.currency = $2 
        AND ct.created_at BETWEEN $3 AND $4
        AND ct.status = 'PAID'
      GROUP BY p.tier
      ORDER BY total_commission DESC
    `;

    const result = await db.query(query, [tenantId, currency, startDate, endDate]);
    
    const tierDistribution = result.rows.map(row => ({
      tier: row.partner_tier,
      partnerCount: parseInt(row.partner_count) || 0,
      totalCommission: parseFloat(row.total_commission) || 0,
      averageRate: parseFloat(row.average_rate) || 0,
      transactionCount: parseInt(row.transaction_count) || 0
    }));

    return {
      tierDistribution,
      totalTiers: tierDistribution.length,
      topTier: tierDistribution[0]?.tier || 'N/A'
    };
  }

  /**
   * Generate commission forecasting
   */
  async generateCommissionForecasting(tenantId, partnerId, startDate, endDate, currency) {
    const historicalData = await this.getCommissionHistoricalData(tenantId, partnerId, startDate, endDate, currency);
    
    if (historicalData.length < 2) {
      return { forecast: [], confidence: 0 };
    }

    const forecast = this.calculateCommissionForecast(historicalData, 30); // 30 days forecast
    
    return {
      forecast,
      confidence: this.calculateForecastConfidence(historicalData),
      methodology: 'Linear regression based on historical commission trends'
    };
  }

  /**
   * Calculate commission KPIs
   */
  async calculateCommissionKPIs(tenantId, partnerId, startDate, endDate, currency) {
    const [
      totalCommission,
      totalTransactions,
      activePartners,
      averageCommission,
      conversionRate
    ] = await Promise.all([
      this.getTotalCommission(tenantId, partnerId, startDate, endDate, currency),
      this.getCommissionTransactionCount(tenantId, partnerId, startDate, endDate),
      this.getActivePartnersCount(tenantId, startDate, endDate),
      this.getAverageCommission(tenantId, partnerId, startDate, endDate, currency),
      this.calculateConversionRate(tenantId, partnerId, startDate, endDate, currency)
    ]);

    return {
      totalCommission,
      totalTransactions,
      activePartners,
      averageCommission,
      conversionRate,
      commissionPerPartner: activePartners > 0 ? totalCommission / activePartners : 0,
      commissionPerTransaction: totalTransactions > 0 ? totalCommission / totalTransactions : 0
    };
  }

  // Helper methods
  async getCommissionBreakdown(tenantId, partnerId, startDate, endDate, currency) {
    let query = `
      SELECT 
        partner_id,
        SUM(commission_amount) as total_commission,
        COUNT(*) as transaction_count,
        AVG(commission_rate) as average_rate
      FROM commission_transactions 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND created_at BETWEEN $3 AND $4
        AND status = 'PAID'
    `;

    const params = [tenantId, currency, startDate, endDate];
    if (partnerId) {
      query += ' AND partner_id = $5';
      params.push(partnerId);
    }

    query += ' GROUP BY partner_id ORDER BY total_commission DESC';

    const result = await db.query(query, params);
    return result.rows.map(row => ({
      partnerId: row.partner_id,
      totalCommission: parseFloat(row.total_commission) || 0,
      transactionCount: parseInt(row.transaction_count) || 0,
      averageRate: parseFloat(row.average_rate) || 0
    }));
  }

  async getPartnerBreakdown(tenantId, startDate, endDate, currency) {
    const query = `
      SELECT 
        p.tier,
        COUNT(DISTINCT ct.partner_id) as partner_count,
        SUM(ct.commission_amount) as total_commission
      FROM commission_transactions ct
      JOIN partners p ON ct.partner_id = p.id
      WHERE ct.tenant_id = $1 
        AND ct.currency = $2 
        AND ct.created_at BETWEEN $3 AND $4
        AND ct.status = 'PAID'
      GROUP BY p.tier
      ORDER BY total_commission DESC
    `;

    const result = await db.query(query, [tenantId, currency, startDate, endDate]);
    return result.rows.map(row => ({
      tier: row.tier,
      partnerCount: parseInt(row.partner_count) || 0,
      totalCommission: parseFloat(row.total_commission) || 0
    }));
  }

  // Cache management
  cacheCommissionReport(tenantId, partnerId, startDate, endDate, currency, report) {
    const key = `${tenantId}_${partnerId || 'all'}_${startDate}_${endDate}_${currency}`;
    this.commissionCache.set(key, {
      data: report,
      timestamp: Date.now()
    });
  }

  getCachedCommissionReport(tenantId, partnerId, startDate, endDate, currency) {
    const key = `${tenantId}_${partnerId || 'all'}_${startDate}_${endDate}_${currency}`;
    const cached = this.commissionCache.get(key);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
      return cached.data;
    }
    
    return null;
  }

  // Additional helper methods would be implemented here...
  async getCommissionHistoricalData(tenantId, partnerId, startDate, endDate, currency) {
    // Implementation
    return [];
  }

  calculateCommissionForecast(data, days) {
    // Implementation
    return [];
  }

  calculateForecastConfidence(data) {
    // Implementation
    return 0;
  }

  async getTotalCommission(tenantId, partnerId, startDate, endDate, currency) {
    // Implementation
    return 0;
  }

  async getCommissionTransactionCount(tenantId, partnerId, startDate, endDate) {
    // Implementation
    return 0;
  }

  async getActivePartnersCount(tenantId, startDate, endDate) {
    // Implementation
    return 0;
  }

  async getAverageCommission(tenantId, partnerId, startDate, endDate, currency) {
    // Implementation
    return 0;
  }
}

module.exports = new CommissionAnalyticsService(); 