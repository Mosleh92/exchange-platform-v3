const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const moment = require('moment');

class FinancialDashboardService {
  constructor() {
    this.metrics = {
      totalVolume: 0,
      totalRevenue: 0,
      totalFees: 0,
      activeUsers: 0,
      dailyTransactions: 0,
      averageTransactionSize: 0
    };
  }

  async getDashboardMetrics(userId, period = '30d') {
    try {
      const startDate = this.getStartDate(period);
      const endDate = new Date();

      const [
        volumeMetrics,
        revenueMetrics,
        userMetrics,
        transactionMetrics,
        performanceMetrics,
        riskMetrics
      ] = await Promise.all([
        this.calculateVolumeMetrics(userId, startDate, endDate),
        this.calculateRevenueMetrics(userId, startDate, endDate),
        this.calculateUserMetrics(userId, startDate, endDate),
        this.calculateTransactionMetrics(userId, startDate, endDate),
        this.calculatePerformanceMetrics(userId, startDate, endDate),
        this.calculateRiskMetrics(userId, startDate, endDate)
      ]);

      return {
        period: { startDate, endDate },
        volumeMetrics,
        revenueMetrics,
        userMetrics,
        transactionMetrics,
        performanceMetrics,
        riskMetrics,
        summary: this.generateSummary(volumeMetrics, revenueMetrics, userMetrics),
        calculatedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Dashboard metrics calculation failed: ${error.message}`);
    }
  }

  getStartDate(period) {
    const now = moment();
    switch (period) {
      case '7d':
        return now.subtract(7, 'days').toDate();
      case '30d':
        return now.subtract(30, 'days').toDate();
      case '90d':
        return now.subtract(90, 'days').toDate();
      case '1y':
        return now.subtract(1, 'year').toDate();
      default:
        return now.subtract(30, 'days').toDate();
    }
  }

  async calculateVolumeMetrics(userId, startDate, endDate) {
    const transactions = await Transaction.find({
      userId,
      status: 'completed',
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const dailyVolume = {};
    let totalVolume = 0;
    let totalTransactions = 0;

    transactions.forEach(tx => {
      const date = moment(tx.createdAt).format('YYYY-MM-DD');
      const volume = tx.amount * tx.rate;
      
      if (!dailyVolume[date]) {
        dailyVolume[date] = 0;
      }
      dailyVolume[date] += volume;
      
      totalVolume += volume;
      totalTransactions++;
    });

    return {
      totalVolume,
      totalTransactions,
      averageTransactionSize: totalTransactions > 0 ? totalVolume / totalTransactions : 0,
      dailyVolume,
      volumeTrend: this.calculateTrend(Object.values(dailyVolume)),
      topAssets: this.getTopAssets(transactions)
    };
  }

  async calculateRevenueMetrics(userId, startDate, endDate) {
    const transactions = await Transaction.find({
      userId,
      status: 'completed',
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const dailyRevenue = {};
    let totalRevenue = 0;
    let totalFees = 0;

    transactions.forEach(tx => {
      const date = moment(tx.createdAt).format('YYYY-MM-DD');
      const fee = tx.fee || 0;
      
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = { revenue: 0, fees: 0 };
      }
      dailyRevenue[date].revenue += tx.amount * tx.rate;
      dailyRevenue[date].fees += fee;
      
      totalRevenue += tx.amount * tx.rate;
      totalFees += fee;
    });

    return {
      totalRevenue,
      totalFees,
      netRevenue: totalRevenue - totalFees,
      profitMargin: totalRevenue > 0 ? ((totalRevenue - totalFees) / totalRevenue) * 100 : 0,
      dailyRevenue,
      revenueTrend: this.calculateTrend(Object.values(dailyRevenue).map(d => d.revenue)),
      feeTrend: this.calculateTrend(Object.values(dailyRevenue).map(d => d.fees))
    };
  }

  async calculateUserMetrics(userId, startDate, endDate) {
    const transactions = await Transaction.find({
      userId,
      status: 'completed',
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const uniqueDays = new Set();
    const dailyActiveUsers = {};
    let totalSessions = 0;

    transactions.forEach(tx => {
      const date = moment(tx.createdAt).format('YYYY-MM-DD');
      uniqueDays.add(date);
      
      if (!dailyActiveUsers[date]) {
        dailyActiveUsers[date] = new Set();
      }
      dailyActiveUsers[date].add(userId);
      
      totalSessions++;
    });

    const activeDays = uniqueDays.size;
    const averageDailyActiveUsers = Object.values(dailyActiveUsers).reduce((sum, users) => sum + users.size, 0) / activeDays;

    return {
      activeDays,
      totalSessions,
      averageDailyActiveUsers,
      sessionDuration: this.calculateAverageSessionDuration(transactions),
      userRetention: this.calculateUserRetention(userId, startDate, endDate),
      dailyActiveUsers: Object.keys(dailyActiveUsers).map(date => ({
        date,
        count: dailyActiveUsers[date].size
      }))
    };
  }

  async calculateTransactionMetrics(userId, startDate, endDate) {
    const transactions = await Transaction.find({
      userId,
      status: 'completed',
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const dailyTransactions = {};
    const transactionTypes = {};
    const successRate = {};

    transactions.forEach(tx => {
      const date = moment(tx.createdAt).format('YYYY-MM-DD');
      
      if (!dailyTransactions[date]) {
        dailyTransactions[date] = 0;
      }
      dailyTransactions[date]++;
      
      if (!transactionTypes[tx.type]) {
        transactionTypes[tx.type] = 0;
      }
      transactionTypes[tx.type]++;
      
      if (!successRate[date]) {
        successRate[date] = { success: 0, total: 0 };
      }
      successRate[date].total++;
      if (tx.status === 'completed') {
        successRate[date].success++;
      }
    });

    return {
      totalTransactions: transactions.length,
      dailyTransactions,
      transactionTypes,
      successRate: Object.keys(successRate).map(date => ({
        date,
        rate: successRate[date].total > 0 ? (successRate[date].success / successRate[date].total) * 100 : 0
      })),
      averageTransactionTime: this.calculateAverageTransactionTime(transactions),
      transactionTrend: this.calculateTrend(Object.values(dailyTransactions))
    };
  }

  async calculatePerformanceMetrics(userId, startDate, endDate) {
    const transactions = await Transaction.find({
      userId,
      status: 'completed',
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const returns = this.calculateReturns(transactions);
    const performance = {
      totalReturn: returns.totalReturn,
      annualizedReturn: returns.annualizedReturn,
      sharpeRatio: this.calculateSharpeRatio(returns.dailyReturns),
      maxDrawdown: this.calculateMaxDrawdown(returns.cumulativeReturns),
      volatility: this.calculateVolatility(returns.dailyReturns),
      winRate: this.calculateWinRate(returns.dailyReturns),
      profitFactor: this.calculateProfitFactor(returns.dailyReturns)
    };

    return {
      ...performance,
      dailyReturns: returns.dailyReturns,
      cumulativeReturns: returns.cumulativeReturns,
      benchmarkComparison: await this.compareWithBenchmarks(returns)
    };
  }

  async calculateRiskMetrics(userId, startDate, endDate) {
    const transactions = await Transaction.find({
      userId,
      status: 'completed',
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const returns = this.calculateReturns(transactions);
    
    return {
      var95: this.calculateVaR(returns.dailyReturns, 0.95),
      var99: this.calculateVaR(returns.dailyReturns, 0.99),
      expectedShortfall: this.calculateExpectedShortfall(returns.dailyReturns, 0.95),
      beta: this.calculateBeta(returns.dailyReturns),
      correlation: this.calculateCorrelation(returns.dailyReturns),
      downsideDeviation: this.calculateDownsideDeviation(returns.dailyReturns),
      calmarRatio: this.calculateCalmarRatio(returns.dailyReturns, this.calculateMaxDrawdown(returns.cumulativeReturns))
    };
  }

  calculateReturns(transactions) {
    const dailyGroups = {};
    
    transactions.forEach(tx => {
      const date = moment(tx.createdAt).format('YYYY-MM-DD');
      if (!dailyGroups[date]) {
        dailyGroups[date] = { pnl: 0 };
      }
      if (tx.type === 'sell') {
        dailyGroups[date].pnl += tx.amount * tx.rate;
      }
    });

    const dates = Object.keys(dailyGroups).sort();
    const dailyReturns = [];
    const cumulativeReturns = [];
    let cumulative = 0;

    dates.forEach(date => {
      const dailyReturn = dailyGroups[date].pnl;
      dailyReturns.push(dailyReturn);
      cumulative += dailyReturn;
      cumulativeReturns.push(cumulative);
    });

    const totalReturn = cumulative;
    const days = dates.length;
    const annualizedReturn = days > 0 ? (Math.pow(1 + totalReturn / 100, 365 / days) - 1) * 100 : 0;

    return {
      totalReturn,
      annualizedReturn,
      dailyReturns,
      cumulativeReturns,
      dates
    };
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (val * (index + 1)), 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  getTopAssets(transactions) {
    const assetVolumes = {};
    
    transactions.forEach(tx => {
      if (!assetVolumes[tx.currency]) {
        assetVolumes[tx.currency] = 0;
      }
      assetVolumes[tx.currency] += tx.amount * tx.rate;
    });

    return Object.entries(assetVolumes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([asset, volume]) => ({ asset, volume }));
  }

  calculateAverageSessionDuration(transactions) {
    if (transactions.length === 0) return 0;
    
    const sessions = this.groupIntoSessions(transactions);
    const totalDuration = sessions.reduce((sum, session) => {
      const duration = moment(session.end).diff(moment(session.start), 'minutes');
      return sum + duration;
    }, 0);
    
    return totalDuration / sessions.length;
  }

  groupIntoSessions(transactions) {
    const sessions = [];
    let currentSession = null;
    const sessionTimeout = 30; // 30 minutes

    transactions.sort((a, b) => a.createdAt - b.createdAt).forEach(tx => {
      if (!currentSession) {
        currentSession = { start: tx.createdAt, end: tx.createdAt };
      } else {
        const timeDiff = moment(tx.createdAt).diff(moment(currentSession.end), 'minutes');
        if (timeDiff <= sessionTimeout) {
          currentSession.end = tx.createdAt;
        } else {
          sessions.push(currentSession);
          currentSession = { start: tx.createdAt, end: tx.createdAt };
        }
      }
    });

    if (currentSession) {
      sessions.push(currentSession);
    }

    return sessions;
  }

  calculateUserRetention(userId, startDate, endDate) {
    // Mock retention calculation - in real implementation, track user activity
    return 0.85; // 85% retention rate
  }

  calculateAverageTransactionTime(transactions) {
    if (transactions.length === 0) return 0;
    
    const totalTime = transactions.reduce((sum, tx) => {
      return sum + (tx.updatedAt - tx.createdAt);
    }, 0);
    
    return totalTime / transactions.length;
  }

  calculateSharpeRatio(returns, riskFreeRate = 0.02) {
    if (returns.length === 0) return 0;
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const volatility = this.calculateVolatility(returns);
    
    return volatility > 0 ? (mean - riskFreeRate) / volatility : 0;
  }

  calculateMaxDrawdown(returns) {
    let maxDrawdown = 0;
    let peak = returns[0] || 0;

    returns.forEach(value => {
      if (value > peak) {
        peak = value;
      }
      const drawdown = peak > 0 ? (peak - value) / peak : 0;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    return maxDrawdown;
  }

  calculateVolatility(returns) {
    if (returns.length < 2) return 0;
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    
    return Math.sqrt(variance);
  }

  calculateWinRate(returns) {
    if (returns.length === 0) return 0;
    
    const wins = returns.filter(r => r > 0).length;
    return wins / returns.length;
  }

  calculateProfitFactor(returns) {
    const wins = returns.filter(r => r > 0);
    const losses = returns.filter(r => r < 0);
    
    const totalWins = wins.reduce((sum, r) => sum + r, 0);
    const totalLosses = Math.abs(losses.reduce((sum, r) => sum + r, 0));
    
    return totalLosses > 0 ? totalWins / totalLosses : 0;
  }

  calculateVaR(returns, confidence) {
    if (returns.length === 0) return 0;
    
    const sortedReturns = returns.sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sortedReturns.length);
    return sortedReturns[index];
  }

  calculateExpectedShortfall(returns, confidence) {
    const var_ = this.calculateVaR(returns, confidence);
    const tailReturns = returns.filter(r => r <= var_);
    
    return tailReturns.length > 0 ? tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length : 0;
  }

  calculateBeta(returns) {
    // Mock beta calculation
    return 1.0;
  }

  calculateCorrelation(returns) {
    // Mock correlation calculation
    return 0.5;
  }

  calculateDownsideDeviation(returns) {
    const negativeReturns = returns.filter(r => r < 0);
    
    if (negativeReturns.length === 0) return 0;
    
    const mean = negativeReturns.reduce((sum, r) => sum + r, 0) / negativeReturns.length;
    const variance = negativeReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / negativeReturns.length;
    
    return Math.sqrt(variance);
  }

  calculateCalmarRatio(returns, maxDrawdown) {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    
    return maxDrawdown > 0 ? mean / maxDrawdown : 0;
  }

  async compareWithBenchmarks(returns) {
    // Mock benchmark comparison
    return {
      bitcoin: { outperformance: 0.15, correlation: 0.7 },
      sp500: { outperformance: 0.25, correlation: 0.3 },
      gold: { outperformance: 0.10, correlation: 0.2 }
    };
  }

  generateSummary(volumeMetrics, revenueMetrics, userMetrics) {
    return {
      totalVolume: volumeMetrics.totalVolume,
      totalRevenue: revenueMetrics.totalRevenue,
      netRevenue: revenueMetrics.netRevenue,
      activeUsers: userMetrics.averageDailyActiveUsers,
      totalTransactions: volumeMetrics.totalTransactions,
      averageTransactionSize: volumeMetrics.averageTransactionSize,
      profitMargin: revenueMetrics.profitMargin,
      volumeTrend: volumeMetrics.volumeTrend > 0 ? 'UP' : 'DOWN',
      revenueTrend: revenueMetrics.revenueTrend > 0 ? 'UP' : 'DOWN'
    };
  }
}

module.exports = new FinancialDashboardService(); 