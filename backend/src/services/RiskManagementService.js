const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const AdvancedOrder = require('../models/AdvancedOrder');
const moment = require('moment');

class RiskManagementService {
  constructor() {
    this.riskLimits = {
      maxPositionSize: 0.1, // 10% of portfolio
      maxDailyLoss: 0.05, // 5% of portfolio
      maxDrawdown: 0.20, // 20% of portfolio
      maxLeverage: 3.0,
      maxConcentration: 0.25 // 25% in single asset
    };
    
    this.riskMetrics = {
      var95: 0,
      var99: 0,
      expectedShortfall: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0
    };
  }

  async analyzePortfolioRisk(userId) {
    try {
      const accounts = await Account.find({ userId });
      const transactions = await Transaction.find({ 
        userId, 
        status: 'completed',
        createdAt: { $gte: moment().subtract(30, 'days').toDate() }
      });

      const portfolioValue = await this.calculatePortfolioValue(accounts);
      const positionRisks = await this.calculatePositionRisks(accounts);
      const portfolioRisk = this.calculatePortfolioRisk(transactions, portfolioValue);
      const riskAlerts = this.generateRiskAlerts(positionRisks, portfolioRisk);

      return {
        userId,
        portfolioValue,
        positionRisks,
        portfolioRisk,
        riskAlerts,
        riskScore: this.calculateRiskScore(positionRisks, portfolioRisk),
        recommendations: this.generateRiskRecommendations(positionRisks, portfolioRisk),
        calculatedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Risk analysis failed: ${error.message}`);
    }
  }

  async calculatePositionRisks(accounts) {
    const risks = [];

    for (const account of accounts) {
      if (account.balance > 0) {
        const volatility = await this.calculateAssetVolatility(account.currency);
        const correlation = await this.calculateAssetCorrelation(account.currency);
        const liquidity = await this.calculateAssetLiquidity(account.currency);
        
        const positionValue = account.balance * (account.currentRate || 0);
        const positionRisk = {
          asset: account.currency,
          quantity: account.balance,
          value: positionValue,
          volatility,
          correlation,
          liquidity,
          riskScore: this.calculatePositionRiskScore(volatility, correlation, liquidity),
          concentrationRisk: this.calculateConcentrationRisk(positionValue, account.userId),
          leverageRisk: this.calculateLeverageRisk(account)
        };

        risks.push(positionRisk);
      }
    }

    return risks;
  }

  calculatePortfolioRisk(transactions, portfolioValue) {
    const returns = this.calculateReturns(transactions);
    
    return {
      var95: this.calculateVaR(returns, 0.95),
      var99: this.calculateVaR(returns, 0.99),
      expectedShortfall: this.calculateExpectedShortfall(returns, 0.95),
      volatility: this.calculateVolatility(returns),
      sharpeRatio: this.calculateSharpeRatio(returns),
      sortinoRatio: this.calculateSortinoRatio(returns),
      calmarRatio: this.calculateCalmarRatio(returns),
      maxDrawdown: this.calculateMaxDrawdown(returns),
      beta: this.calculateBeta(returns),
      correlation: this.calculateCorrelation(returns)
    };
  }

  calculateReturns(transactions) {
    const dailyReturns = [];
    const dailyGroups = {};

    // Group transactions by date
    transactions.forEach(tx => {
      const date = moment(tx.createdAt).format('YYYY-MM-DD');
      if (!dailyGroups[date]) {
        dailyGroups[date] = { pnl: 0 };
      }
      if (tx.type === 'sell') {
        dailyGroups[date].pnl += tx.amount * tx.rate;
      }
    });

    // Calculate daily returns
    Object.keys(dailyGroups).forEach(date => {
      dailyReturns.push(dailyGroups[date].pnl);
    });

    return dailyReturns;
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

  calculateVolatility(returns) {
    if (returns.length < 2) return 0;
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    
    return Math.sqrt(variance);
  }

  calculateSharpeRatio(returns, riskFreeRate = 0.02) {
    if (returns.length === 0) return 0;
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const volatility = this.calculateVolatility(returns);
    
    return volatility > 0 ? (mean - riskFreeRate) / volatility : 0;
  }

  calculateSortinoRatio(returns, riskFreeRate = 0.02) {
    if (returns.length === 0) return 0;
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const negativeReturns = returns.filter(r => r < 0);
    
    if (negativeReturns.length === 0) return 0;
    
    const downsideDeviation = Math.sqrt(
      negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length
    );
    
    return downsideDeviation > 0 ? (mean - riskFreeRate) / downsideDeviation : 0;
  }

  calculateCalmarRatio(returns) {
    const maxDrawdown = this.calculateMaxDrawdown(returns);
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    
    return maxDrawdown > 0 ? mean / maxDrawdown : 0;
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

  calculateBeta(returns) {
    // Mock beta calculation - in real implementation, compare with market index
    return 1.0;
  }

  calculateCorrelation(returns) {
    // Mock correlation calculation - in real implementation, compare with market index
    return 0.5;
  }

  async calculateAssetVolatility(currency) {
    // Mock volatility calculation - in real implementation, fetch historical data
    const mockVolatilities = {
      BTC: 0.8,
      ETH: 0.7,
      USDT: 0.01,
      BNB: 0.6
    };
    return mockVolatilities[currency] || 0.5;
  }

  async calculateAssetCorrelation(currency) {
    // Mock correlation calculation - in real implementation, calculate with market
    const mockCorrelations = {
      BTC: 0.7,
      ETH: 0.6,
      USDT: 0.1,
      BNB: 0.5
    };
    return mockCorrelations[currency] || 0.5;
  }

  async calculateAssetLiquidity(currency) {
    // Mock liquidity calculation - in real implementation, fetch market data
    const mockLiquidity = {
      BTC: 0.9,
      ETH: 0.8,
      USDT: 0.95,
      BNB: 0.7
    };
    return mockLiquidity[currency] || 0.5;
  }

  calculatePositionRiskScore(volatility, correlation, liquidity) {
    // Weighted risk score calculation
    const volatilityWeight = 0.4;
    const correlationWeight = 0.3;
    const liquidityWeight = 0.3;
    
    return (volatility * volatilityWeight) + 
           (correlation * correlationWeight) + 
           ((1 - liquidity) * liquidityWeight);
  }

  async calculateConcentrationRisk(positionValue, userId) {
    const accounts = await Account.find({ userId });
    const totalPortfolioValue = accounts.reduce((sum, account) => {
      return sum + (account.balance * (account.currentRate || 0));
    }, 0);
    
    return totalPortfolioValue > 0 ? positionValue / totalPortfolioValue : 0;
  }

  calculateLeverageRisk(account) {
    // Mock leverage risk calculation
    return account.leverage || 1.0;
  }

  calculateRiskScore(positionRisks, portfolioRisk) {
    const positionRiskScore = positionRisks.reduce((sum, risk) => sum + risk.riskScore, 0) / positionRisks.length;
    const portfolioRiskScore = (portfolioRisk.var95 + portfolioRisk.volatility) / 2;
    
    return (positionRiskScore + portfolioRiskScore) / 2;
  }

  generateRiskAlerts(positionRisks, portfolioRisk) {
    const alerts = [];

    // Position concentration alerts
    positionRisks.forEach(risk => {
      if (risk.concentrationRisk > this.riskLimits.maxConcentration) {
        alerts.push({
          type: 'CONCENTRATION_RISK',
          severity: 'HIGH',
          message: `${risk.asset} concentration (${(risk.concentrationRisk * 100).toFixed(1)}%) exceeds limit (${this.riskLimits.maxConcentration * 100}%)`,
          asset: risk.asset,
          value: risk.concentrationRisk
        });
      }
    });

    // Portfolio risk alerts
    if (portfolioRisk.var95 < -this.riskLimits.maxDailyLoss) {
      alerts.push({
        type: 'VAR_RISK',
        severity: 'HIGH',
        message: `VaR (${Math.abs(portfolioRisk.var95).toFixed(2)}%) exceeds daily loss limit (${this.riskLimits.maxDailyLoss * 100}%)`,
        value: portfolioRisk.var95
      });
    }

    if (portfolioRisk.maxDrawdown > this.riskLimits.maxDrawdown) {
      alerts.push({
        type: 'DRAWDOWN_RISK',
        severity: 'MEDIUM',
        message: `Max drawdown (${(portfolioRisk.maxDrawdown * 100).toFixed(1)}%) exceeds limit (${this.riskLimits.maxDrawdown * 100}%)`,
        value: portfolioRisk.maxDrawdown
      });
    }

    return alerts;
  }

  generateRiskRecommendations(positionRisks, portfolioRisk) {
    const recommendations = [];

    // Diversification recommendations
    if (positionRisks.length < 3) {
      recommendations.push({
        type: 'DIVERSIFICATION',
        priority: 'HIGH',
        message: 'Consider diversifying portfolio across more assets to reduce concentration risk',
        action: 'ADD_ASSETS'
      });
    }

    // Risk reduction recommendations
    if (portfolioRisk.var95 < -0.03) {
      recommendations.push({
        type: 'RISK_REDUCTION',
        priority: 'HIGH',
        message: 'Consider reducing position sizes or adding hedging strategies',
        action: 'REDUCE_POSITIONS'
      });
    }

    // Performance optimization recommendations
    if (portfolioRisk.sharpeRatio < 1.0) {
      recommendations.push({
        type: 'PERFORMANCE',
        priority: 'MEDIUM',
        message: 'Consider rebalancing portfolio to improve risk-adjusted returns',
        action: 'REBALANCE'
      });
    }

    return recommendations;
  }

  async validateOrderRisk(userId, order) {
    const accounts = await Account.find({ userId });
    const portfolioValue = await this.calculatePortfolioValue(accounts);
    
    const orderValue = order.amount * order.rate;
    const positionSize = orderValue / portfolioValue;
    
    const riskChecks = {
      positionSize: positionSize <= this.riskLimits.maxPositionSize,
      leverage: (order.leverage || 1) <= this.riskLimits.maxLeverage,
      dailyLoss: await this.checkDailyLossLimit(userId, orderValue),
      concentration: await this.checkConcentrationLimit(userId, order.currency, orderValue)
    };

    const isValid = Object.values(riskChecks).every(check => check === true);
    
    return {
      isValid,
      checks: riskChecks,
      riskScore: this.calculateOrderRiskScore(order, portfolioValue)
    };
  }

  async checkDailyLossLimit(userId, orderValue) {
    const today = moment().startOf('day');
    const todayTransactions = await Transaction.find({
      userId,
      type: 'sell',
      status: 'completed',
      createdAt: { $gte: today.toDate() }
    });

    const dailyLoss = todayTransactions.reduce((sum, tx) => sum + (tx.amount * tx.rate), 0);
    const accounts = await Account.find({ userId });
    const portfolioValue = await this.calculatePortfolioValue(accounts);
    
    return (dailyLoss + orderValue) / portfolioValue <= this.riskLimits.maxDailyLoss;
  }

  async checkConcentrationLimit(userId, currency, orderValue) {
    const accounts = await Account.find({ userId });
    const currentPosition = accounts.find(acc => acc.currency === currency);
    const currentValue = currentPosition ? currentPosition.balance * (currentPosition.currentRate || 0) : 0;
    const totalPortfolioValue = await this.calculatePortfolioValue(accounts);
    
    return (currentValue + orderValue) / totalPortfolioValue <= this.riskLimits.maxConcentration;
  }

  calculateOrderRiskScore(order, portfolioValue) {
    const orderValue = order.amount * order.rate;
    const positionSize = orderValue / portfolioValue;
    const leverageRisk = (order.leverage || 1) / this.riskLimits.maxLeverage;
    
    return (positionSize + leverageRisk) / 2;
  }

  async calculatePortfolioValue(accounts) {
    let totalValue = 0;
    
    for (const account of accounts) {
      const currentPrice = await this.getCurrentPrice(account.currency);
      totalValue += account.balance * currentPrice;
    }
    
    return totalValue;
  }

  async getCurrentPrice(currency) {
    // Mock price - in real implementation, fetch from price feed
    const mockPrices = {
      BTC: 45000,
      ETH: 3000,
      USDT: 1,
      BNB: 300
    };
    return mockPrices[currency] || 100;
  }

  async setRiskLimits(userId, limits) {
    // Update user-specific risk limits
    this.riskLimits = { ...this.riskLimits, ...limits };
    
    // In real implementation, save to database
    return this.riskLimits;
  }

  async getRiskLimits(userId) {
    // In real implementation, fetch from database
    return this.riskLimits;
  }
}

module.exports = new RiskManagementService(); 