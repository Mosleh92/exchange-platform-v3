const moment = require('moment');
const redis = require('redis');
const { EventEmitter } = require('events');

class AnalyticsService extends EventEmitter {
  constructor() {
    super();
    
    this.metrics = {
      trading: {},
      user: {},
      financial: {},
      performance: {},
      compliance: {}
    };
    
    this.redis = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    this.realTimeData = new Map();
    this.historicalData = new Map();
    this.analyticsCache = new Map();
    
    this.config = {
      dataRetentionDays: 365,
      realTimeUpdateInterval: 5000, // 5 seconds
      historicalUpdateInterval: 60000, // 1 minute
      cacheExpiration: 300000, // 5 minutes
      maxDataPoints: 10000,
      alertThresholds: {
        highVolume: 1000000,
        lowLiquidity: 0.1,
        highLatency: 100,
        errorRate: 0.05
      }
    };
    
    this.init();
  }

  async init() {
    try {
      await this.redis.connect();
      await this.initializeMetrics();
      await this.startRealTimeMonitoring();
      await this.startHistoricalDataCollection();
      
      console.log('Analytics Service initialized successfully');
    } catch (error) {
      console.error('Analytics Service initialization failed:', error);
      throw error;
    }
  }

  // 📊 Real-time Analytics
  async startRealTimeMonitoring() {
    setInterval(() => {
      this.collectRealTimeMetrics();
    }, this.config.realTimeUpdateInterval);
  }

  async collectRealTimeMetrics() {
    try {
      // Collect trading metrics
      const tradingMetrics = await this.collectTradingMetrics();
      this.metrics.trading = tradingMetrics;
      
      // Collect user metrics
      const userMetrics = await this.collectUserMetrics();
      this.metrics.user = userMetrics;
      
      // Collect financial metrics
      const financialMetrics = await this.collectFinancialMetrics();
      this.metrics.financial = financialMetrics;
      
      // Collect performance metrics
      const performanceMetrics = await this.collectPerformanceMetrics();
      this.metrics.performance = performanceMetrics;
      
      // Store real-time data
      await this.storeRealTimeData();
      
      // Check for alerts
      await this.checkAlerts();
      
      // Emit metrics update
      this.emit('metricsUpdate', this.metrics);
      
    } catch (error) {
      console.error('Real-time metrics collection failed:', error);
    }
  }

  async collectTradingMetrics() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    return {
      totalVolume: await this.getTotalVolume(oneHourAgo, now),
      totalTrades: await this.getTotalTrades(oneHourAgo, now),
      activeSymbols: await this.getActiveSymbols(oneHourAgo, now),
      averageTradeSize: await this.getAverageTradeSize(oneHourAgo, now),
      topTraders: await this.getTopTraders(oneHourAgo, now),
      orderBookDepth: await this.getOrderBookDepth(),
      spreadAnalysis: await this.getSpreadAnalysis(),
      volatilityMetrics: await this.getVolatilityMetrics(),
      marketSentiment: await this.getMarketSentiment()
    };
  }

  async collectUserMetrics() {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    return {
      activeUsers: await this.getActiveUsers(oneDayAgo, now),
      newUsers: await this.getNewUsers(oneDayAgo, now),
      userRetention: await this.getUserRetention(),
      userEngagement: await this.getUserEngagement(),
      userSegments: await this.getUserSegments(),
      geographicDistribution: await this.getGeographicDistribution(),
      deviceUsage: await this.getDeviceUsage(),
      sessionMetrics: await this.getSessionMetrics()
    };
  }

  async collectFinancialMetrics() {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    return {
      totalRevenue: await this.getTotalRevenue(oneDayAgo, now),
      totalFees: await this.getTotalFees(oneDayAgo, now),
      profitMargin: await this.getProfitMargin(oneDayAgo, now),
      revenueByCurrency: await this.getRevenueByCurrency(oneDayAgo, now),
      costAnalysis: await this.getCostAnalysis(oneDayAgo, now),
      cashFlow: await this.getCashFlow(oneDayAgo, now),
      balanceSheet: await this.getBalanceSheet(),
      pnlMetrics: await this.getPnLMetrics()
    };
  }

  async collectPerformanceMetrics() {
    return {
      systemLatency: await this.getSystemLatency(),
      errorRate: await this.getErrorRate(),
      uptime: await this.getUptime(),
      throughput: await this.getThroughput(),
      memoryUsage: await this.getMemoryUsage(),
      cpuUsage: await this.getCPUUsage(),
      databasePerformance: await this.getDatabasePerformance(),
      networkLatency: await this.getNetworkLatency()
    };
  }

  // 📈 Historical Data Collection
  async startHistoricalDataCollection() {
    setInterval(() => {
      this.collectHistoricalData();
    }, this.config.historicalUpdateInterval);
  }

  async collectHistoricalData() {
    try {
      const timestamp = Date.now();
      
      // Store current metrics as historical data
      await this.storeHistoricalData('trading', this.metrics.trading, timestamp);
      await this.storeHistoricalData('user', this.metrics.user, timestamp);
      await this.storeHistoricalData('financial', this.metrics.financial, timestamp);
      await this.storeHistoricalData('performance', this.metrics.performance, timestamp);
      
      // Clean up old data
      await this.cleanupOldData();
      
    } catch (error) {
      console.error('Historical data collection failed:', error);
    }
  }

  async storeHistoricalData(category, data, timestamp) {
    const key = `historical:${category}:${timestamp}`;
    await this.redis.setex(key, this.config.dataRetentionDays * 24 * 60 * 60, JSON.stringify(data));
  }

  async cleanupOldData() {
    const cutoffTime = Date.now() - (this.config.dataRetentionDays * 24 * 60 * 60 * 1000);
    
    // Clean up old historical data
    const keys = await this.redis.keys('historical:*');
    for (const key of keys) {
      const timestamp = parseInt(key.split(':')[2]);
      if (timestamp < cutoffTime) {
        await this.redis.del(key);
      }
    }
  }

  // 📊 Business Intelligence
  async generateBusinessIntelligenceReport(timeRange = '30d') {
    try {
      const startTime = moment().subtract(1, timeRange).toDate();
      const endTime = new Date();
      
      const report = {
        period: { startTime, endTime, timeRange },
        executive: await this.generateExecutiveSummary(startTime, endTime),
        trading: await this.generateTradingAnalysis(startTime, endTime),
        user: await this.generateUserAnalysis(startTime, endTime),
        financial: await this.generateFinancialAnalysis(startTime, endTime),
        performance: await this.generatePerformanceAnalysis(startTime, endTime),
        trends: await this.generateTrendAnalysis(startTime, endTime),
        predictions: await this.generatePredictions(startTime, endTime),
        recommendations: await this.generateRecommendations(startTime, endTime)
      };
      
      return report;
    } catch (error) {
      throw new Error(`Business intelligence report generation failed: ${error.message}`);
    }
  }

  async generateExecutiveSummary(startTime, endTime) {
    const tradingMetrics = await this.getHistoricalMetrics('trading', startTime, endTime);
    const userMetrics = await this.getHistoricalMetrics('user', startTime, endTime);
    const financialMetrics = await this.getHistoricalMetrics('financial', startTime, endTime);
    
    return {
      totalVolume: tradingMetrics.totalVolume || 0,
      totalRevenue: financialMetrics.totalRevenue || 0,
      activeUsers: userMetrics.activeUsers || 0,
      growthRate: this.calculateGrowthRate(tradingMetrics, userMetrics),
      marketShare: await this.calculateMarketShare(),
      keyMetrics: {
        averageOrderSize: tradingMetrics.averageTradeSize || 0,
        userRetention: userMetrics.userRetention || 0,
        profitMargin: financialMetrics.profitMargin || 0,
        systemUptime: await this.getUptime()
      }
    };
  }

  async generateTradingAnalysis(startTime, endTime) {
    const tradingMetrics = await this.getHistoricalMetrics('trading', startTime, endTime);
    
    return {
      volumeAnalysis: {
        total: tradingMetrics.totalVolume || 0,
        bySymbol: await this.getVolumeBySymbol(startTime, endTime),
        byTime: await this.getVolumeByTime(startTime, endTime),
        trends: await this.analyzeVolumeTrends(startTime, endTime)
      },
      tradeAnalysis: {
        total: tradingMetrics.totalTrades || 0,
        averageSize: tradingMetrics.averageTradeSize || 0,
        byType: await this.getTradesByType(startTime, endTime),
        patterns: await this.analyzeTradePatterns(startTime, endTime)
      },
      marketAnalysis: {
        activeSymbols: tradingMetrics.activeSymbols || 0,
        spreadAnalysis: tradingMetrics.spreadAnalysis || {},
        volatility: tradingMetrics.volatilityMetrics || {},
        sentiment: tradingMetrics.marketSentiment || {}
      }
    };
  }

  async generateUserAnalysis(startTime, endTime) {
    const userMetrics = await this.getHistoricalMetrics('user', startTime, endTime);
    
    return {
      userGrowth: {
        newUsers: userMetrics.newUsers || 0,
        activeUsers: userMetrics.activeUsers || 0,
        retention: userMetrics.userRetention || 0,
        churn: await this.calculateChurnRate(startTime, endTime)
      },
      userBehavior: {
        engagement: userMetrics.userEngagement || {},
        segments: userMetrics.userSegments || {},
        geographic: userMetrics.geographicDistribution || {},
        devices: userMetrics.deviceUsage || {}
      },
      userValue: {
        averageRevenuePerUser: await this.calculateARPU(startTime, endTime),
        lifetimeValue: await this.calculateLTV(startTime, endTime),
        acquisitionCost: await this.calculateCAC(startTime, endTime)
      }
    };
  }

  async generateFinancialAnalysis(startTime, endTime) {
    const financialMetrics = await this.getHistoricalMetrics('financial', startTime, endTime);
    
    return {
      revenue: {
        total: financialMetrics.totalRevenue || 0,
        byCurrency: financialMetrics.revenueByCurrency || {},
        growth: await this.calculateRevenueGrowth(startTime, endTime),
        projections: await this.projectRevenue(endTime)
      },
      costs: {
        total: financialMetrics.costAnalysis?.total || 0,
        breakdown: financialMetrics.costAnalysis?.breakdown || {},
        efficiency: await this.calculateCostEfficiency(startTime, endTime)
      },
      profitability: {
        margin: financialMetrics.profitMargin || 0,
        trends: await this.analyzeProfitabilityTrends(startTime, endTime),
        drivers: await this.identifyProfitabilityDrivers(startTime, endTime)
      }
    };
  }

  async generatePerformanceAnalysis(startTime, endTime) {
    const performanceMetrics = await this.getHistoricalMetrics('performance', startTime, endTime);
    
    return {
      system: {
        latency: performanceMetrics.systemLatency || 0,
        errorRate: performanceMetrics.errorRate || 0,
        uptime: performanceMetrics.uptime || 0,
        throughput: performanceMetrics.throughput || 0
      },
      infrastructure: {
        memory: performanceMetrics.memoryUsage || {},
        cpu: performanceMetrics.cpuUsage || {},
        database: performanceMetrics.databasePerformance || {},
        network: performanceMetrics.networkLatency || {}
      },
      optimization: {
        bottlenecks: await this.identifyBottlenecks(startTime, endTime),
        recommendations: await this.generatePerformanceRecommendations(startTime, endTime)
      }
    };
  }

  async generateTrendAnalysis(startTime, endTime) {
    return {
      volume: await this.analyzeVolumeTrends(startTime, endTime),
      users: await this.analyzeUserTrends(startTime, endTime),
      revenue: await this.analyzeRevenueTrends(startTime, endTime),
      performance: await this.analyzePerformanceTrends(startTime, endTime),
      market: await this.analyzeMarketTrends(startTime, endTime)
    };
  }

  async generatePredictions(startTime, endTime) {
    return {
      volume: await this.predictVolume(endTime),
      users: await this.predictUsers(endTime),
      revenue: await this.predictRevenue(endTime),
      performance: await this.predictPerformance(endTime)
    };
  }

  async generateRecommendations(startTime, endTime) {
    const recommendations = [];
    
    // Trading recommendations
    const tradingAnalysis = await this.generateTradingAnalysis(startTime, endTime);
    if (tradingAnalysis.volumeAnalysis.trends.growth < 0.1) {
      recommendations.push({
        category: 'TRADING',
        priority: 'HIGH',
        action: 'Implement marketing campaigns to increase trading volume',
        impact: 'HIGH',
        effort: 'MEDIUM'
      });
    }
    
    // User recommendations
    const userAnalysis = await this.generateUserAnalysis(startTime, endTime);
    if (userAnalysis.userGrowth.churn > 0.05) {
      recommendations.push({
        category: 'USER_RETENTION',
        priority: 'HIGH',
        action: 'Improve user onboarding and support processes',
        impact: 'HIGH',
        effort: 'MEDIUM'
      });
    }
    
    // Performance recommendations
    const performanceAnalysis = await this.generatePerformanceAnalysis(startTime, endTime);
    if (performanceAnalysis.system.latency > 100) {
      recommendations.push({
        category: 'PERFORMANCE',
        priority: 'MEDIUM',
        action: 'Optimize system architecture and database queries',
        impact: 'MEDIUM',
        effort: 'HIGH'
      });
    }
    
    return recommendations;
  }

  // 🚨 Alert System
  async checkAlerts() {
    const alerts = [];
    
    // Check volume alerts
    if (this.metrics.trading.totalVolume > this.config.alertThresholds.highVolume) {
      alerts.push({
        type: 'HIGH_VOLUME',
        severity: 'INFO',
        message: `Trading volume exceeded ${this.config.alertThresholds.highVolume}`,
        value: this.metrics.trading.totalVolume
      });
    }
    
    // Check performance alerts
    if (this.metrics.performance.systemLatency > this.config.alertThresholds.highLatency) {
      alerts.push({
        type: 'HIGH_LATENCY',
        severity: 'WARNING',
        message: `System latency exceeded ${this.config.alertThresholds.highLatency}ms`,
        value: this.metrics.performance.systemLatency
      });
    }
    
    // Check error rate alerts
    if (this.metrics.performance.errorRate > this.config.alertThresholds.errorRate) {
      alerts.push({
        type: 'HIGH_ERROR_RATE',
        severity: 'CRITICAL',
        message: `Error rate exceeded ${this.config.alertThresholds.errorRate * 100}%`,
        value: this.metrics.performance.errorRate
      });
    }
    
    // Emit alerts
    for (const alert of alerts) {
      this.emit('alert', alert);
    }
  }

  // 📊 Advanced Analytics
  async calculateGrowthRate(tradingMetrics, userMetrics) {
    // Mock growth rate calculation
    return 0.15; // 15% growth
  }

  async calculateMarketShare() {
    // Mock market share calculation
    return 0.025; // 2.5% market share
  }

  async calculateChurnRate(startTime, endTime) {
    // Mock churn rate calculation
    return 0.03; // 3% churn rate
  }

  async calculateARPU(startTime, endTime) {
    // Mock ARPU calculation
    return 150; // $150 per user
  }

  async calculateLTV(startTime, endTime) {
    // Mock LTV calculation
    return 2500; // $2500 lifetime value
  }

  async calculateCAC(startTime, endTime) {
    // Mock CAC calculation
    return 500; // $500 acquisition cost
  }

  async calculateRevenueGrowth(startTime, endTime) {
    // Mock revenue growth calculation
    return 0.25; // 25% growth
  }

  async projectRevenue(endTime) {
    // Mock revenue projection
    return {
      nextMonth: 1000000,
      nextQuarter: 3500000,
      nextYear: 15000000
    };
  }

  async calculateCostEfficiency(startTime, endTime) {
    // Mock cost efficiency calculation
    return 0.85; // 85% efficiency
  }

  async identifyBottlenecks(startTime, endTime) {
    // Mock bottleneck identification
    return [
      { component: 'Database', impact: 'HIGH', recommendation: 'Optimize queries' },
      { component: 'Network', impact: 'MEDIUM', recommendation: 'Increase bandwidth' }
    ];
  }

  // 📈 Prediction Models
  async predictVolume(endTime) {
    // Mock volume prediction
    return {
      nextDay: 500000,
      nextWeek: 3500000,
      nextMonth: 15000000
    };
  }

  async predictUsers(endTime) {
    // Mock user prediction
    return {
      nextDay: 1000,
      nextWeek: 7500,
      nextMonth: 30000
    };
  }

  async predictRevenue(endTime) {
    // Mock revenue prediction
    return {
      nextDay: 50000,
      nextWeek: 350000,
      nextMonth: 1500000
    };
  }

  async predictPerformance(endTime) {
    // Mock performance prediction
    return {
      latency: { current: 50, predicted: 45 },
      throughput: { current: 1000, predicted: 1100 },
      errorRate: { current: 0.01, predicted: 0.008 }
    };
  }

  // 🔧 Utility Methods
  async getHistoricalMetrics(category, startTime, endTime) {
    const keys = await this.redis.keys(`historical:${category}:*`);
    const metrics = [];
    
    for (const key of keys) {
      const timestamp = parseInt(key.split(':')[2]);
      if (timestamp >= startTime.getTime() && timestamp <= endTime.getTime()) {
        const data = await this.redis.get(key);
        if (data) {
          metrics.push(JSON.parse(data));
        }
      }
    }
    
    return this.aggregateMetrics(metrics);
  }

  aggregateMetrics(metrics) {
    if (metrics.length === 0) return {};
    
    const aggregated = {};
    
    // Aggregate numeric values
    for (const metric of metrics) {
      for (const [key, value] of Object.entries(metric)) {
        if (typeof value === 'number') {
          aggregated[key] = (aggregated[key] || 0) + value;
        } else if (typeof value === 'object') {
          aggregated[key] = aggregated[key] || {};
          // Handle nested objects
        }
      }
    }
    
    // Calculate averages where appropriate
    const count = metrics.length;
    for (const [key, value] of Object.entries(aggregated)) {
      if (typeof value === 'number' && key.includes('average')) {
        aggregated[key] = value / count;
      }
    }
    
    return aggregated;
  }

  async storeRealTimeData() {
    const key = `realtime:${Date.now()}`;
    await this.redis.setex(key, 300, JSON.stringify(this.metrics)); // 5 minutes TTL
  }

  // Mock data collection methods
  async getTotalVolume(startTime, endTime) { return Math.random() * 1000000; }
  async getTotalTrades(startTime, endTime) { return Math.floor(Math.random() * 10000); }
  async getActiveSymbols(startTime, endTime) { return Math.floor(Math.random() * 20); }
  async getAverageTradeSize(startTime, endTime) { return Math.random() * 1000; }
  async getTopTraders(startTime, endTime) { return []; }
  async getOrderBookDepth() { return {}; }
  async getSpreadAnalysis() { return {}; }
  async getVolatilityMetrics() { return {}; }
  async getMarketSentiment() { return {}; }
  async getActiveUsers(startTime, endTime) { return Math.floor(Math.random() * 1000); }
  async getNewUsers(startTime, endTime) { return Math.floor(Math.random() * 100); }
  async getUserRetention() { return Math.random() * 0.9; }
  async getUserEngagement() { return {}; }
  async getUserSegments() { return {}; }
  async getGeographicDistribution() { return {}; }
  async getDeviceUsage() { return {}; }
  async getSessionMetrics() { return {}; }
  async getTotalRevenue(startTime, endTime) { return Math.random() * 100000; }
  async getTotalFees(startTime, endTime) { return Math.random() * 5000; }
  async getProfitMargin(startTime, endTime) { return Math.random() * 0.3; }
  async getRevenueByCurrency(startTime, endTime) { return {}; }
  async getCostAnalysis(startTime, endTime) { return {}; }
  async getCashFlow(startTime, endTime) { return {}; }
  async getBalanceSheet() { return {}; }
  async getPnLMetrics() { return {}; }
  async getSystemLatency() { return Math.random() * 100; }
  async getErrorRate() { return Math.random() * 0.05; }
  async getUptime() { return 0.999; }
  async getThroughput() { return Math.random() * 1000; }
  async getMemoryUsage() { return {}; }
  async getCPUUsage() { return {}; }
  async getDatabasePerformance() { return {}; }
  async getNetworkLatency() { return Math.random() * 50; }
}

module.exports = new AnalyticsService(); 