const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const moment = require('moment');

class ProfitLossCalculator {
  constructor() {
    this.performanceMetrics = {
      totalReturn: 0,
      annualizedReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      volatility: 0,
      winRate: 0
    };
  }

  async calculatePortfolioPL(userId, startDate = null, endDate = null) {
    try {
      const query = { userId, status: 'completed' };
      
      if (startDate && endDate) {
        query.createdAt = {
          $gte: moment(startDate).startOf('day').toDate(),
          $lte: moment(endDate).endOf('day').toDate()
        };
      }

      const transactions = await Transaction.find(query).populate('currency');
      const accounts = await Account.find({ userId });

      // Calculate realized P&L
      const realizedPL = this.calculateRealizedPL(transactions);
      
      // Calculate unrealized P&L
      const unrealizedPL = await this.calculateUnrealizedPL(accounts);
      
      // Calculate performance metrics
      const performance = this.calculatePerformanceMetrics(transactions);
      
      // Calculate portfolio value
      const portfolioValue = this.calculatePortfolioValue(accounts);
      
      // Generate detailed breakdown
      const breakdown = this.generatePLBreakdown(transactions, accounts);

      return {
        userId,
        period: { startDate, endDate },
        realizedPL,
        unrealizedPL,
        totalPL: realizedPL.total + unrealizedPL.total,
        performance,
        portfolioValue,
        breakdown,
        calculatedAt: new Date()
      };
    } catch (error) {
      throw new Error(`P&L calculation failed: ${error.message}`);
    }
  }

  calculateRealizedPL(transactions) {
    const pl = {
      total: 0,
      byAsset: {},
      byPeriod: {},
      byTransactionType: {},
      details: []
    };

    // Group transactions by asset
    const assetGroups = {};
    transactions.forEach(tx => {
      if (!assetGroups[tx.currency]) {
        assetGroups[tx.currency] = [];
      }
      assetGroups[tx.currency].push(tx);
    });

    // Calculate P&L for each asset
    Object.keys(assetGroups).forEach(asset => {
      const assetTxs = assetGroups[asset].sort((a, b) => a.createdAt - b.createdAt);
      let costBasis = 0;
      let totalQuantity = 0;
      let assetPL = 0;

      assetTxs.forEach(tx => {
        if (tx.type === 'buy') {
          costBasis += tx.amount * tx.rate;
          totalQuantity += tx.amount;
        } else if (tx.type === 'sell') {
          const avgCost = costBasis / totalQuantity;
          const gain = (tx.rate - avgCost) * tx.amount;
          assetPL += gain;

          pl.details.push({
            asset,
            gain,
            quantity: tx.amount,
            buyPrice: avgCost,
            sellPrice: tx.rate,
            date: tx.createdAt,
            transactionId: tx._id
          });

          // Update cost basis
          costBasis -= avgCost * tx.amount;
          totalQuantity -= tx.amount;
        }
      });

      pl.byAsset[asset] = assetPL;
      pl.total += assetPL;
    });

    // Calculate by period
    const monthlyGroups = {};
    transactions.forEach(tx => {
      const month = moment(tx.createdAt).format('YYYY-MM');
      if (!monthlyGroups[month]) {
        monthlyGroups[month] = 0;
      }
      if (tx.type === 'sell') {
        monthlyGroups[month] += pl.details.find(d => d.transactionId.equals(tx._id))?.gain || 0;
      }
    });
    pl.byPeriod = monthlyGroups;

    // Calculate by transaction type
    pl.byTransactionType = {
      buy: transactions.filter(tx => tx.type === 'buy').length,
      sell: transactions.filter(tx => tx.type === 'sell').length,
      transfer: transactions.filter(tx => tx.type === 'transfer').length
    };

    return pl;
  }

  async calculateUnrealizedPL(accounts) {
    const pl = {
      total: 0,
      byAsset: {},
      details: []
    };

    for (const account of accounts) {
      if (account.balance > 0) {
        // Get average purchase price
        const buyTransactions = await Transaction.find({
          userId: account.userId,
          currency: account.currency,
          type: 'buy',
          status: 'completed'
        });

        if (buyTransactions.length > 0) {
          const totalCost = buyTransactions.reduce((sum, tx) => sum + (tx.amount * tx.rate), 0);
          const totalQuantity = buyTransactions.reduce((sum, tx) => sum + tx.amount, 0);
          const avgCost = totalCost / totalQuantity;

          // Get current market price
          const currentPrice = await this.getCurrentPrice(account.currency);
          
          const unrealizedGain = (currentPrice - avgCost) * account.balance;
          
          pl.byAsset[account.currency] = unrealizedGain;
          pl.total += unrealizedGain;

          pl.details.push({
            asset: account.currency,
            quantity: account.balance,
            avgCost,
            currentPrice,
            unrealizedGain,
            percentageChange: ((currentPrice - avgCost) / avgCost) * 100
          });
        }
      }
    }

    return pl;
  }

  calculatePerformanceMetrics(transactions) {
    const metrics = {
      totalReturn: 0,
      annualizedReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      volatility: 0,
      winRate: 0,
      profitFactor: 0,
      averageWin: 0,
      averageLoss: 0
    };

    if (transactions.length === 0) return metrics;

    // Calculate returns
    const returns = this.calculateReturns(transactions);
    metrics.totalReturn = returns.totalReturn;
    metrics.annualizedReturn = returns.annualizedReturn;

    // Calculate volatility
    metrics.volatility = this.calculateVolatility(returns.dailyReturns);

    // Calculate Sharpe ratio
    metrics.sharpeRatio = this.calculateSharpeRatio(returns.annualizedReturn, metrics.volatility);

    // Calculate max drawdown
    metrics.maxDrawdown = this.calculateMaxDrawdown(returns.cumulativeReturns);

    // Calculate win rate and profit factor
    const wins = returns.dailyReturns.filter(r => r > 0);
    const losses = returns.dailyReturns.filter(r => r < 0);
    
    metrics.winRate = wins.length / returns.dailyReturns.length;
    metrics.averageWin = wins.length > 0 ? wins.reduce((sum, r) => sum + r, 0) / wins.length : 0;
    metrics.averageLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, r) => sum + r, 0) / losses.length) : 0;
    metrics.profitFactor = losses.length > 0 ? wins.reduce((sum, r) => sum + r, 0) / Math.abs(losses.reduce((sum, r) => sum + r, 0)) : 0;

    return metrics;
  }

  calculateReturns(transactions) {
    // Group transactions by date
    const dailyGroups = {};
    transactions.forEach(tx => {
      const date = moment(tx.createdAt).format('YYYY-MM-DD');
      if (!dailyGroups[date]) {
        dailyGroups[date] = { pnl: 0, volume: 0 };
      }
      if (tx.type === 'sell') {
        dailyGroups[date].pnl += tx.amount * tx.rate;
      }
      dailyGroups[date].volume += tx.amount * tx.rate;
    });

    // Calculate daily returns
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

  calculateVolatility(returns) {
    if (returns.length < 2) return 0;
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    
    return Math.sqrt(variance);
  }

  calculateSharpeRatio(return_, volatility, riskFreeRate = 0.02) {
    if (volatility === 0) return 0;
    return (return_ - riskFreeRate) / volatility;
  }

  calculateMaxDrawdown(cumulativeReturns) {
    let maxDrawdown = 0;
    let peak = cumulativeReturns[0];

    cumulativeReturns.forEach(value => {
      if (value > peak) {
        peak = value;
      }
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    return maxDrawdown;
  }

  calculatePortfolioValue(accounts) {
    return accounts.reduce((total, account) => {
      return total + (account.balance * (account.currentRate || 0));
    }, 0);
  }

  generatePLBreakdown(transactions, accounts) {
    return {
      assetAllocation: this.calculateAssetAllocation(accounts),
      tradingActivity: this.calculateTradingActivity(transactions),
      riskMetrics: this.calculateRiskMetrics(transactions),
      comparisonMetrics: this.calculateComparisonMetrics(transactions)
    };
  }

  calculateAssetAllocation(accounts) {
    const totalValue = accounts.reduce((sum, account) => {
      return sum + (account.balance * (account.currentRate || 0));
    }, 0);

    return accounts.map(account => ({
      asset: account.currency,
      quantity: account.balance,
      value: account.balance * (account.currentRate || 0),
      percentage: totalValue > 0 ? (account.balance * (account.currentRate || 0)) / totalValue * 100 : 0
    }));
  }

  calculateTradingActivity(transactions) {
    const activity = {
      totalTrades: transactions.length,
      buyTrades: transactions.filter(tx => tx.type === 'buy').length,
      sellTrades: transactions.filter(tx => tx.type === 'sell').length,
      averageTradeSize: 0,
      mostTradedAsset: null,
      tradingFrequency: 0
    };

    if (transactions.length > 0) {
      const totalVolume = transactions.reduce((sum, tx) => sum + (tx.amount * tx.rate), 0);
      activity.averageTradeSize = totalVolume / transactions.length;

      // Find most traded asset
      const assetCounts = {};
      transactions.forEach(tx => {
        assetCounts[tx.currency] = (assetCounts[tx.currency] || 0) + 1;
      });
      
      const maxCount = Math.max(...Object.values(assetCounts));
      activity.mostTradedAsset = Object.keys(assetCounts).find(asset => assetCounts[asset] === maxCount);

      // Calculate trading frequency
      const firstTrade = new Date(Math.min(...transactions.map(tx => tx.createdAt)));
      const lastTrade = new Date(Math.max(...transactions.map(tx => tx.createdAt)));
      const daysDiff = moment(lastTrade).diff(moment(firstTrade), 'days');
      activity.tradingFrequency = daysDiff > 0 ? transactions.length / daysDiff : 0;
    }

    return activity;
  }

  calculateRiskMetrics(transactions) {
    const returns = this.calculateReturns(transactions);
    
    return {
      valueAtRisk: this.calculateVaR(returns.dailyReturns, 0.95),
      conditionalVaR: this.calculateCVaR(returns.dailyReturns, 0.95),
      beta: this.calculateBeta(returns.dailyReturns),
      correlation: this.calculateCorrelation(returns.dailyReturns)
    };
  }

  calculateVaR(returns, confidence) {
    if (returns.length === 0) return 0;
    
    const sortedReturns = returns.sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sortedReturns.length);
    return sortedReturns[index];
  }

  calculateCVaR(returns, confidence) {
    const var_ = this.calculateVaR(returns, confidence);
    const tailReturns = returns.filter(r => r <= var_);
    
    return tailReturns.length > 0 ? tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length : 0;
  }

  calculateBeta(returns) {
    // This would typically compare against a market index
    // For now, return a default value
    return 1.0;
  }

  calculateCorrelation(returns) {
    // This would calculate correlation with market indices
    // For now, return a default value
    return 0.5;
  }

  calculateComparisonMetrics(transactions) {
    // Compare performance against benchmarks
    return {
      vsBitcoin: this.compareWithBitcoin(transactions),
      vsSP500: this.compareWithSP500(transactions),
      vsGold: this.compareWithGold(transactions)
    };
  }

  compareWithBitcoin(transactions) {
    // Mock comparison - in real implementation, fetch Bitcoin performance
    return { outperformance: 0.15, correlation: 0.7 };
  }

  compareWithSP500(transactions) {
    // Mock comparison - in real implementation, fetch S&P 500 performance
    return { outperformance: 0.25, correlation: 0.3 };
  }

  compareWithGold(transactions) {
    // Mock comparison - in real implementation, fetch Gold performance
    return { outperformance: 0.10, correlation: 0.2 };
  }

  async getCurrentPrice(currency) {
    // This would integrate with external price feeds
    const mockPrices = {
      BTC: 45000,
      ETH: 3000,
      USDT: 1,
      BNB: 300
    };
    return mockPrices[currency] || 100;
  }
}

module.exports = new ProfitLossCalculator(); 