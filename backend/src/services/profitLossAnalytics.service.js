const db = require('../config/database');
const logger = require('../utils/logger');
const { format, subDays, startOfDay, endOfDay, parseISO } = require('date-fns');

/**
 * Advanced Profit & Loss Analytics Service
 * Provides comprehensive financial analysis and reporting
 */
class ProfitLossAnalyticsService {
  constructor() {
    this.analyticsCache = new Map();
    this.cacheTTL = 300000; // 5 minutes
  }

  /**
   * Generate comprehensive P&L report with advanced analytics
   * 
   * @param {Object} params - Report parameters
   * @param {string} params.tenantId - Tenant identifier
   * @param {string} params.startDate - Start date (ISO string)
   * @param {string} params.endDate - End date (ISO string)
   * @param {string} params.currency - Base currency
   * @param {string} params.granularity - Time granularity (daily/weekly/monthly)
   * @param {Array} params.includeMetrics - Additional metrics to include
   * @returns {Object} Comprehensive P&L report
   */
  async generateProfitLossReport(params) {
    const {
      tenantId,
      startDate,
      endDate,
      currency = 'USD',
      granularity = 'daily',
      includeMetrics = []
    } = params;

    try {
      logger.info(`Generating P&L report for tenant ${tenantId}`, { startDate, endDate, currency });

      // Generate base P&L data
      const basePL = await this.calculateBaseProfitLoss(tenantId, startDate, endDate, currency);
      
      // Generate advanced analytics
      const analytics = await this.generateAdvancedAnalytics(tenantId, startDate, endDate, currency);
      
      // Generate trend analysis
      const trends = await this.analyzeTrends(tenantId, startDate, endDate, currency, granularity);
      
      // Generate comparative analysis
      const comparison = await this.generateComparativeAnalysis(tenantId, startDate, endDate, currency);
      
      // Generate risk analysis
      const riskAnalysis = await this.analyzeRiskMetrics(tenantId, startDate, endDate, currency);
      
      // Generate forecasting
      const forecasting = await this.generateForecasting(tenantId, startDate, endDate, currency);

      const report = {
        summary: {
          period: { startDate, endDate },
          currency,
          totalRevenue: basePL.totalRevenue,
          totalExpenses: basePL.totalExpenses,
          netProfit: basePL.netProfit,
          profitMargin: basePL.profitMargin,
          growthRate: analytics.growthRate,
          roi: analytics.roi
        },
        detailed: {
          revenue: basePL.revenueBreakdown,
          expenses: basePL.expenseBreakdown,
          profit: basePL.profitBreakdown
        },
        analytics: {
          trends: trends,
          comparison: comparison,
          risk: riskAnalysis,
          forecasting: forecasting,
          kpis: await this.calculateKPIs(tenantId, startDate, endDate, currency)
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          tenantId,
          granularity,
          includeMetrics
        }
      };

      // Cache the report
      this.cacheReport(tenantId, startDate, endDate, currency, report);

      return report;

    } catch (error) {
      logger.error('Failed to generate P&L report:', error);
      throw new Error('Failed to generate profit and loss report');
    }
  }

  /**
   * Calculate base profit and loss data
   */
  async calculateBaseProfitLoss(tenantId, startDate, endDate, currency) {
    const query = `
      SELECT 
        SUM(CASE WHEN type = 'REVENUE' THEN amount ELSE 0 END) as total_revenue,
        SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as total_expenses,
        SUM(CASE WHEN type = 'REVENUE' THEN amount ELSE -amount END) as net_profit,
        COUNT(*) as total_transactions
      FROM financial_transactions 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND created_at BETWEEN $3 AND $4
        AND status = 'COMPLETED'
    `;

    const result = await db.query(query, [tenantId, currency, startDate, endDate]);
    const data = result.rows[0];

    const totalRevenue = parseFloat(data.total_revenue) || 0;
    const totalExpenses = parseFloat(data.total_expenses) || 0;
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Get detailed breakdowns
    const revenueBreakdown = await this.getRevenueBreakdown(tenantId, startDate, endDate, currency);
    const expenseBreakdown = await this.getExpenseBreakdown(tenantId, startDate, endDate, currency);
    const profitBreakdown = await this.getProfitBreakdown(tenantId, startDate, endDate, currency);

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      totalTransactions: parseInt(data.total_transactions) || 0,
      revenueBreakdown,
      expenseBreakdown,
      profitBreakdown
    };
  }

  /**
   * Generate advanced analytics
   */
  async generateAdvancedAnalytics(tenantId, startDate, endDate, currency) {
    const [
      growthRate,
      roi,
      cashFlow,
      liquidityMetrics,
      efficiencyMetrics
    ] = await Promise.all([
      this.calculateGrowthRate(tenantId, startDate, endDate, currency),
      this.calculateROI(tenantId, startDate, endDate, currency),
      this.analyzeCashFlow(tenantId, startDate, endDate, currency),
      this.calculateLiquidityMetrics(tenantId, startDate, endDate, currency),
      this.calculateEfficiencyMetrics(tenantId, startDate, endDate, currency)
    ]);

    return {
      growthRate,
      roi,
      cashFlow,
      liquidityMetrics,
      efficiencyMetrics
    };
  }

  /**
   * Calculate growth rate
   */
  async calculateGrowthRate(tenantId, startDate, endDate, currency) {
    const currentPeriodQuery = `
      SELECT SUM(amount) as total
      FROM financial_transactions 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND type = 'REVENUE'
        AND created_at BETWEEN $3 AND $4
        AND status = 'COMPLETED'
    `;

    const previousPeriodQuery = `
      SELECT SUM(amount) as total
      FROM financial_transactions 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND type = 'REVENUE'
        AND created_at BETWEEN $5 AND $3
        AND status = 'COMPLETED'
    `;

    const [currentResult, previousResult] = await Promise.all([
      db.query(currentPeriodQuery, [tenantId, currency, startDate, endDate]),
      db.query(previousPeriodQuery, [tenantId, currency, startDate, startDate])
    ]);

    const currentRevenue = parseFloat(currentResult.rows[0]?.total) || 0;
    const previousRevenue = parseFloat(previousResult.rows[0]?.total) || 0;

    return previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
  }

  /**
   * Calculate ROI
   */
  async calculateROI(tenantId, startDate, endDate, currency) {
    const investmentQuery = `
      SELECT SUM(amount) as total_investment
      FROM financial_transactions 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND type = 'INVESTMENT'
        AND created_at BETWEEN $3 AND $4
        AND status = 'COMPLETED'
    `;

    const profitQuery = `
      SELECT SUM(CASE WHEN type = 'REVENUE' THEN amount ELSE -amount END) as net_profit
      FROM financial_transactions 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND created_at BETWEEN $3 AND $4
        AND status = 'COMPLETED'
    `;

    const [investmentResult, profitResult] = await Promise.all([
      db.query(investmentQuery, [tenantId, currency, startDate, endDate]),
      db.query(profitQuery, [tenantId, currency, startDate, endDate])
    ]);

    const totalInvestment = parseFloat(investmentResult.rows[0]?.total_investment) || 0;
    const netProfit = parseFloat(profitResult.rows[0]?.net_profit) || 0;

    return totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;
  }

  /**
   * Analyze cash flow
   */
  async analyzeCashFlow(tenantId, startDate, endDate, currency) {
    const query = `
      SELECT 
        DATE(created_at) as date,
        SUM(CASE WHEN type = 'REVENUE' THEN amount ELSE 0 END) as cash_in,
        SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as cash_out,
        SUM(CASE WHEN type = 'REVENUE' THEN amount ELSE -amount END) as net_cash_flow
      FROM financial_transactions 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND created_at BETWEEN $3 AND $4
        AND status = 'COMPLETED'
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    const result = await db.query(query, [tenantId, currency, startDate, endDate]);
    
    const cashFlowData = result.rows.map(row => ({
      date: row.date,
      cashIn: parseFloat(row.cash_in) || 0,
      cashOut: parseFloat(row.cash_out) || 0,
      netCashFlow: parseFloat(row.net_cash_flow) || 0
    }));

    const totalCashIn = cashFlowData.reduce((sum, day) => sum + day.cashIn, 0);
    const totalCashOut = cashFlowData.reduce((sum, day) => sum + day.cashOut, 0);
    const totalNetCashFlow = totalCashIn - totalCashOut;

    return {
      daily: cashFlowData,
      summary: {
        totalCashIn,
        totalCashOut,
        totalNetCashFlow,
        averageDailyCashFlow: totalNetCashFlow / cashFlowData.length || 0
      }
    };
  }

  /**
   * Calculate liquidity metrics
   */
  async calculateLiquidityMetrics(tenantId, startDate, endDate, currency) {
    const currentAssetsQuery = `
      SELECT SUM(balance) as current_assets
      FROM accounts 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND account_type = 'ASSET'
        AND status = 'ACTIVE'
    `;

    const currentLiabilitiesQuery = `
      SELECT SUM(balance) as current_liabilities
      FROM accounts 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND account_type = 'LIABILITY'
        AND status = 'ACTIVE'
    `;

    const [assetsResult, liabilitiesResult] = await Promise.all([
      db.query(currentAssetsQuery, [tenantId, currency]),
      db.query(currentLiabilitiesQuery, [tenantId, currency])
    ]);

    const currentAssets = parseFloat(assetsResult.rows[0]?.current_assets) || 0;
    const currentLiabilities = parseFloat(liabilitiesResult.rows[0]?.current_liabilities) || 0;

    return {
      currentRatio: currentLiabilities > 0 ? currentAssets / currentLiabilities : 0,
      quickRatio: currentLiabilities > 0 ? (currentAssets - 0) / currentLiabilities : 0, // Simplified
      workingCapital: currentAssets - currentLiabilities,
      currentAssets,
      currentLiabilities
    };
  }

  /**
   * Calculate efficiency metrics
   */
  async calculateEfficiencyMetrics(tenantId, startDate, endDate, currency) {
    const revenueQuery = `
      SELECT SUM(amount) as total_revenue
      FROM financial_transactions 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND type = 'REVENUE'
        AND created_at BETWEEN $3 AND $4
        AND status = 'COMPLETED'
    `;

    const assetQuery = `
      SELECT SUM(balance) as total_assets
      FROM accounts 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND account_type = 'ASSET'
        AND status = 'ACTIVE'
    `;

    const [revenueResult, assetResult] = await Promise.all([
      db.query(revenueQuery, [tenantId, currency, startDate, endDate]),
      db.query(assetQuery, [tenantId, currency])
    ]);

    const totalRevenue = parseFloat(revenueResult.rows[0]?.total_revenue) || 0;
    const totalAssets = parseFloat(assetResult.rows[0]?.total_assets) || 0;

    return {
      assetTurnoverRatio: totalAssets > 0 ? totalRevenue / totalAssets : 0,
      revenuePerTransaction: await this.calculateRevenuePerTransaction(tenantId, startDate, endDate, currency),
      averageTransactionValue: await this.calculateAverageTransactionValue(tenantId, startDate, endDate, currency)
    };
  }

  /**
   * Analyze trends
   */
  async analyzeTrends(tenantId, startDate, endDate, currency, granularity) {
    const groupBy = granularity === 'daily' ? 'DATE(created_at)' : 
                   granularity === 'weekly' ? 'DATE_TRUNC(\'week\', created_at)' : 
                   'DATE_TRUNC(\'month\', created_at)';

    const query = `
      SELECT 
        ${groupBy} as period,
        SUM(CASE WHEN type = 'REVENUE' THEN amount ELSE 0 END) as revenue,
        SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as expenses,
        SUM(CASE WHEN type = 'REVENUE' THEN amount ELSE -amount END) as profit,
        COUNT(*) as transaction_count
      FROM financial_transactions 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND created_at BETWEEN $3 AND $4
        AND status = 'COMPLETED'
      GROUP BY ${groupBy}
      ORDER BY period
    `;

    const result = await db.query(query, [tenantId, currency, startDate, endDate]);
    
    return result.rows.map(row => ({
      period: row.period,
      revenue: parseFloat(row.revenue) || 0,
      expenses: parseFloat(row.expenses) || 0,
      profit: parseFloat(row.profit) || 0,
      transactionCount: parseInt(row.transaction_count) || 0
    }));
  }

  /**
   * Generate comparative analysis
   */
  async generateComparativeAnalysis(tenantId, startDate, endDate, currency) {
    const currentPeriod = await this.calculateBaseProfitLoss(tenantId, startDate, endDate, currency);
    
    // Calculate previous period
    const periodDuration = new Date(endDate) - new Date(startDate);
    const previousStartDate = new Date(startDate.getTime() - periodDuration);
    const previousEndDate = new Date(startDate);
    
    const previousPeriod = await this.calculateBaseProfitLoss(tenantId, previousStartDate, previousEndDate, currency);

    return {
      currentPeriod,
      previousPeriod,
      changes: {
        revenueChange: ((currentPeriod.totalRevenue - previousPeriod.totalRevenue) / previousPeriod.totalRevenue) * 100,
        expenseChange: ((currentPeriod.totalExpenses - previousPeriod.totalExpenses) / previousPeriod.totalExpenses) * 100,
        profitChange: ((currentPeriod.netProfit - previousPeriod.netProfit) / previousPeriod.netProfit) * 100
      }
    };
  }

  /**
   * Analyze risk metrics
   */
  async analyzeRiskMetrics(tenantId, startDate, endDate, currency) {
    const volatilityQuery = `
      SELECT 
        STDDEV(amount) as volatility,
        AVG(amount) as average_amount,
        MIN(amount) as min_amount,
        MAX(amount) as max_amount
      FROM financial_transactions 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND created_at BETWEEN $3 AND $4
        AND status = 'COMPLETED'
    `;

    const result = await db.query(volatilityQuery, [tenantId, currency, startDate, endDate]);
    const data = result.rows[0];

    return {
      volatility: parseFloat(data.volatility) || 0,
      averageAmount: parseFloat(data.average_amount) || 0,
      minAmount: parseFloat(data.min_amount) || 0,
      maxAmount: parseFloat(data.max_amount) || 0,
      riskScore: await this.calculateRiskScore(tenantId, startDate, endDate, currency)
    };
  }

  /**
   * Generate forecasting
   */
  async generateForecasting(tenantId, startDate, endDate, currency) {
    // Simple linear regression for forecasting
    const historicalData = await this.getHistoricalData(tenantId, startDate, endDate, currency);
    
    if (historicalData.length < 2) {
      return { forecast: [], confidence: 0 };
    }

    const forecast = this.calculateLinearForecast(historicalData, 30); // 30 days forecast
    
    return {
      forecast,
      confidence: this.calculateForecastConfidence(historicalData),
      methodology: 'Linear regression based on historical trends'
    };
  }

  /**
   * Calculate KPIs
   */
  async calculateKPIs(tenantId, startDate, endDate, currency) {
    const [
      totalRevenue,
      totalExpenses,
      transactionCount,
      averageTransactionValue,
      customerCount
    ] = await Promise.all([
      this.getTotalRevenue(tenantId, startDate, endDate, currency),
      this.getTotalExpenses(tenantId, startDate, endDate, currency),
      this.getTransactionCount(tenantId, startDate, endDate),
      this.calculateAverageTransactionValue(tenantId, startDate, endDate, currency),
      this.getCustomerCount(tenantId, startDate, endDate)
    ]);

    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      transactionCount,
      averageTransactionValue,
      customerCount,
      revenuePerCustomer: customerCount > 0 ? totalRevenue / customerCount : 0
    };
  }

  // Helper methods
  async getRevenueBreakdown(tenantId, startDate, endDate, currency) {
    const query = `
      SELECT 
        category,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
      FROM financial_transactions 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND type = 'REVENUE'
        AND created_at BETWEEN $3 AND $4
        AND status = 'COMPLETED'
      GROUP BY category
      ORDER BY total_amount DESC
    `;

    const result = await db.query(query, [tenantId, currency, startDate, endDate]);
    return result.rows.map(row => ({
      category: row.category,
      amount: parseFloat(row.total_amount) || 0,
      count: parseInt(row.transaction_count) || 0
    }));
  }

  async getExpenseBreakdown(tenantId, startDate, endDate, currency) {
    const query = `
      SELECT 
        category,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
      FROM financial_transactions 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND type = 'EXPENSE'
        AND created_at BETWEEN $3 AND $4
        AND status = 'COMPLETED'
      GROUP BY category
      ORDER BY total_amount DESC
    `;

    const result = await db.query(query, [tenantId, currency, startDate, endDate]);
    return result.rows.map(row => ({
      category: row.category,
      amount: parseFloat(row.total_amount) || 0,
      count: parseInt(row.transaction_count) || 0
    }));
  }

  async getProfitBreakdown(tenantId, startDate, endDate, currency) {
    const query = `
      SELECT 
        DATE(created_at) as date,
        SUM(CASE WHEN type = 'REVENUE' THEN amount ELSE -amount END) as daily_profit
      FROM financial_transactions 
      WHERE tenant_id = $1 
        AND currency = $2 
        AND created_at BETWEEN $3 AND $4
        AND status = 'COMPLETED'
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    const result = await db.query(query, [tenantId, currency, startDate, endDate]);
    return result.rows.map(row => ({
      date: row.date,
      profit: parseFloat(row.daily_profit) || 0
    }));
  }

  // Cache management
  cacheReport(tenantId, startDate, endDate, currency, report) {
    const key = `${tenantId}_${startDate}_${endDate}_${currency}`;
    this.analyticsCache.set(key, {
      data: report,
      timestamp: Date.now()
    });
  }

  getCachedReport(tenantId, startDate, endDate, currency) {
    const key = `${tenantId}_${startDate}_${endDate}_${currency}`;
    const cached = this.analyticsCache.get(key);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
      return cached.data;
    }
    
    return null;
  }

  // Additional helper methods would be implemented here...
  async calculateRevenuePerTransaction(tenantId, startDate, endDate, currency) {
    // Implementation
    return 0;
  }

  async calculateAverageTransactionValue(tenantId, startDate, endDate, currency) {
    // Implementation
    return 0;
  }

  async calculateRiskScore(tenantId, startDate, endDate, currency) {
    // Implementation
    return 0;
  }

  async getHistoricalData(tenantId, startDate, endDate, currency) {
    // Implementation
    return [];
  }

  calculateLinearForecast(data, days) {
    // Implementation
    return [];
  }

  calculateForecastConfidence(data) {
    // Implementation
    return 0;
  }

  async getTotalRevenue(tenantId, startDate, endDate, currency) {
    // Implementation
    return 0;
  }

  async getTotalExpenses(tenantId, startDate, endDate, currency) {
    // Implementation
    return 0;
  }

  async getTransactionCount(tenantId, startDate, endDate) {
    // Implementation
    return 0;
  }

  async getCustomerCount(tenantId, startDate, endDate) {
    // Implementation
    return 0;
  }
}

module.exports = new ProfitLossAnalyticsService(); 