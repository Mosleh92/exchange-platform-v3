/**
 * Backtesting Engine for Algorithmic Trading Strategies
 * Phase 3: Advanced Analytics & Business Intelligence
 */

class BacktestingEngine {
  constructor() {
    this.strategies = new Map();
    this.historicalData = new Map();
    this.results = new Map();
  }

  /**
   * Add a trading strategy for backtesting
   */
  addStrategy(strategyId, strategy) {
    this.strategies.set(strategyId, {
      ...strategy,
      id: strategyId,
      created: new Date()
    });
  }

  /**
   * Load historical market data for backtesting
   */
  async loadHistoricalData(symbol, startDate, endDate, interval = '1h') {
    const cacheKey = `${symbol}_${startDate}_${endDate}_${interval}`;
    
    if (this.historicalData.has(cacheKey)) {
      return this.historicalData.get(cacheKey);
    }

    try {
      // Simulate historical data (replace with actual data feed)
      const data = this.generateSimulatedData(symbol, startDate, endDate, interval);
      this.historicalData.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error(`Failed to load historical data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Run backtest for a specific strategy
   */
  async runBacktest(strategyId, config = {}) {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      throw new Error(`Strategy ${strategyId} not found`);
    }

    const {
      symbols = ['BTC', 'ETH'],
      startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
      endDate = new Date(),
      initialCapital = 100000,
      commission = 0.001, // 0.1%
      slippage = 0.0005 // 0.05%
    } = config;

    console.log(`Running backtest for strategy: ${strategy.name}`);

    try {
      const backtest = {
        strategyId,
        config,
        startDate,
        endDate,
        initialCapital,
        results: {},
        trades: [],
        portfolio: this.initializePortfolio(initialCapital, symbols),
        performance: {},
        riskMetrics: {},
        timestamp: new Date()
      };

      // Load historical data for all symbols
      const marketData = {};
      for (const symbol of symbols) {
        marketData[symbol] = await this.loadHistoricalData(symbol, startDate, endDate);
      }

      // Run simulation
      await this.simulate(backtest, strategy, marketData, commission, slippage);

      // Calculate performance metrics
      this.calculatePerformanceMetrics(backtest);
      this.calculateRiskMetrics(backtest);

      // Store results
      this.results.set(strategyId, backtest);

      return backtest;
    } catch (error) {
      console.error(`Backtest failed for strategy ${strategyId}:`, error);
      throw error;
    }
  }

  /**
   * Simulate trading strategy over historical data
   */
  async simulate(backtest, strategy, marketData, commission, slippage) {
    const { portfolio, trades } = backtest;
    const symbols = Object.keys(marketData);
    
    // Get all timestamps and sort them
    const allTimestamps = new Set();
    symbols.forEach(symbol => {
      marketData[symbol].forEach(bar => allTimestamps.add(bar.timestamp));
    });
    const sortedTimestamps = Array.from(allTimestamps).sort();

    let portfolioValue = backtest.initialCapital;
    const portfolioHistory = [];

    for (const timestamp of sortedTimestamps) {
      // Update current prices
      const currentPrices = {};
      symbols.forEach(symbol => {
        const bar = marketData[symbol].find(b => b.timestamp === timestamp);
        if (bar) currentPrices[symbol] = bar.close;
      });

      // Apply strategy logic
      const signals = await this.generateSignals(strategy, currentPrices, timestamp, marketData);

      // Execute trades based on signals
      for (const signal of signals) {
        if (signal.action === 'BUY' || signal.action === 'SELL') {
          const trade = await this.executeTrade(
            signal, 
            portfolio, 
            currentPrices[signal.symbol],
            commission,
            slippage,
            timestamp
          );
          
          if (trade) {
            trades.push(trade);
          }
        }
      }

      // Calculate portfolio value
      portfolioValue = this.calculatePortfolioValue(portfolio, currentPrices);
      portfolioHistory.push({
        timestamp,
        value: portfolioValue,
        cash: portfolio.cash,
        positions: { ...portfolio.positions }
      });
    }

    backtest.portfolioHistory = portfolioHistory;
    backtest.finalValue = portfolioValue;
  }

  /**
   * Generate trading signals based on strategy
   */
  async generateSignals(strategy, currentPrices, timestamp, marketData) {
    const signals = [];

    // Simple moving average strategy example
    if (strategy.type === 'SMA_CROSSOVER') {
      for (const symbol of Object.keys(currentPrices)) {
        const prices = marketData[symbol]
          .filter(bar => bar.timestamp <= timestamp)
          .map(bar => bar.close)
          .slice(-50); // Last 50 periods

        if (prices.length >= 20) {
          const sma20 = this.calculateSMA(prices.slice(-20));
          const sma50 = this.calculateSMA(prices.slice(-50));
          const prevSma20 = this.calculateSMA(prices.slice(-21, -1));
          const prevSma50 = this.calculateSMA(prices.slice(-51, -1));

          // Generate signals
          if (sma20 > sma50 && prevSma20 <= prevSma50) {
            signals.push({
              symbol,
              action: 'BUY',
              confidence: 0.7,
              reasoning: 'SMA20 crossed above SMA50',
              timestamp
            });
          } else if (sma20 < sma50 && prevSma20 >= prevSma50) {
            signals.push({
              symbol,
              action: 'SELL',
              confidence: 0.7,
              reasoning: 'SMA20 crossed below SMA50',
              timestamp
            });
          }
        }
      }
    }

    // Mean reversion strategy
    if (strategy.type === 'MEAN_REVERSION') {
      for (const symbol of Object.keys(currentPrices)) {
        const prices = marketData[symbol]
          .filter(bar => bar.timestamp <= timestamp)
          .map(bar => bar.close)
          .slice(-20);

        if (prices.length >= 20) {
          const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
          const stdDev = Math.sqrt(
            prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length
          );
          const currentPrice = prices[prices.length - 1];
          
          const zScore = (currentPrice - mean) / stdDev;

          if (zScore < -2) {
            signals.push({
              symbol,
              action: 'BUY',
              confidence: Math.min(0.9, Math.abs(zScore) / 3),
              reasoning: `Price ${Math.round(Math.abs(zScore) * 100)/100} std devs below mean`,
              timestamp
            });
          } else if (zScore > 2) {
            signals.push({
              symbol,
              action: 'SELL',
              confidence: Math.min(0.9, Math.abs(zScore) / 3),
              reasoning: `Price ${Math.round(zScore * 100)/100} std devs above mean`,
              timestamp
            });
          }
        }
      }
    }

    return signals;
  }

  /**
   * Execute a trade and update portfolio
   */
  async executeTrade(signal, portfolio, price, commission, slippage, timestamp) {
    const { symbol, action, confidence } = signal;
    
    // Calculate position size (simplified)
    const portfolioValue = portfolio.cash + Object.values(portfolio.positions)
      .reduce((sum, pos) => sum + pos.quantity * price, 0);
    const riskAmount = portfolioValue * 0.02; // 2% risk per trade
    const positionSize = Math.floor(riskAmount / price);

    if (positionSize <= 0) return null;

    // Apply slippage
    const executionPrice = action === 'BUY' 
      ? price * (1 + slippage)
      : price * (1 - slippage);

    const trade = {
      symbol,
      action,
      quantity: positionSize,
      price: executionPrice,
      commission: executionPrice * positionSize * commission,
      timestamp,
      confidence,
      reasoning: signal.reasoning
    };

    // Update portfolio
    if (action === 'BUY') {
      const totalCost = executionPrice * positionSize + trade.commission;
      if (portfolio.cash >= totalCost) {
        portfolio.cash -= totalCost;
        portfolio.positions[symbol] = (portfolio.positions[symbol] || 0) + positionSize;
        trade.status = 'EXECUTED';
      } else {
        trade.status = 'REJECTED_INSUFFICIENT_FUNDS';
      }
    } else if (action === 'SELL') {
      if (portfolio.positions[symbol] >= positionSize) {
        const totalReceived = executionPrice * positionSize - trade.commission;
        portfolio.cash += totalReceived;
        portfolio.positions[symbol] -= positionSize;
        trade.status = 'EXECUTED';
      } else {
        trade.status = 'REJECTED_INSUFFICIENT_POSITION';
      }
    }

    return trade;
  }

  /**
   * Calculate portfolio performance metrics
   */
  calculatePerformanceMetrics(backtest) {
    const { portfolioHistory, initialCapital, trades } = backtest;
    
    if (portfolioHistory.length === 0) return;

    const finalValue = portfolioHistory[portfolioHistory.length - 1].value;
    const totalReturn = (finalValue - initialCapital) / initialCapital;
    
    // Calculate daily returns
    const dailyReturns = [];
    for (let i = 1; i < portfolioHistory.length; i++) {
      const prevValue = portfolioHistory[i - 1].value;
      const currentValue = portfolioHistory[i].value;
      const dailyReturn = (currentValue - prevValue) / prevValue;
      dailyReturns.push(dailyReturn);
    }

    // Calculate volatility (annualized)
    const avgDailyReturn = dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgDailyReturn, 2), 0) / dailyReturns.length;
    const dailyVolatility = Math.sqrt(variance);
    const annualizedVolatility = dailyVolatility * Math.sqrt(365);

    // Calculate Sharpe ratio (assuming 2% risk-free rate)
    const riskFreeRate = 0.02;
    const annualizedReturn = Math.pow(1 + totalReturn, 365 / portfolioHistory.length) - 1;
    const sharpeRatio = (annualizedReturn - riskFreeRate) / annualizedVolatility;

    // Calculate maximum drawdown
    let maxValue = initialCapital;
    let maxDrawdown = 0;
    for (const point of portfolioHistory) {
      if (point.value > maxValue) {
        maxValue = point.value;
      }
      const drawdown = (maxValue - point.value) / maxValue;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    // Trade statistics
    const executedTrades = trades.filter(t => t.status === 'EXECUTED');
    const winningTrades = executedTrades.filter(t => 
      t.action === 'SELL' && t.price > (t.buyPrice || 0)
    ).length;
    const winRate = executedTrades.length > 0 ? winningTrades / executedTrades.length : 0;

    backtest.performance = {
      totalReturn: Math.round(totalReturn * 10000) / 100, // Percentage
      annualizedReturn: Math.round(annualizedReturn * 10000) / 100,
      volatility: Math.round(annualizedVolatility * 10000) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 10000) / 100,
      winRate: Math.round(winRate * 10000) / 100,
      totalTrades: executedTrades.length,
      profitFactor: this.calculateProfitFactor(executedTrades)
    };
  }

  /**
   * Calculate risk metrics
   */
  calculateRiskMetrics(backtest) {
    const { portfolioHistory } = backtest;
    
    if (portfolioHistory.length === 0) return;

    // Value at Risk (VaR) at 95% confidence
    const returns = [];
    for (let i = 1; i < portfolioHistory.length; i++) {
      const ret = (portfolioHistory[i].value - portfolioHistory[i - 1].value) / portfolioHistory[i - 1].value;
      returns.push(ret);
    }
    
    returns.sort((a, b) => a - b);
    const var95 = returns[Math.floor(returns.length * 0.05)];
    const var99 = returns[Math.floor(returns.length * 0.01)];

    // Expected Shortfall (Conditional VaR)
    const var95Index = Math.floor(returns.length * 0.05);
    const expectedShortfall = returns.slice(0, var95Index).reduce((sum, ret) => sum + ret, 0) / var95Index;

    backtest.riskMetrics = {
      var95: Math.round(var95 * 10000) / 100,
      var99: Math.round(var99 * 10000) / 100,
      expectedShortfall: Math.round(expectedShortfall * 10000) / 100,
      beta: this.calculateBeta(returns), // Simplified
      correlation: this.calculateCorrelation(returns) // Simplified
    };
  }

  // Helper methods
  calculateSMA(prices) {
    return prices.reduce((sum, price) => sum + price, 0) / prices.length;
  }

  calculatePortfolioValue(portfolio, currentPrices) {
    let value = portfolio.cash;
    for (const [symbol, quantity] of Object.entries(portfolio.positions)) {
      if (currentPrices[symbol]) {
        value += quantity * currentPrices[symbol];
      }
    }
    return value;
  }

  calculateProfitFactor(trades) {
    const profits = trades.filter(t => t.profit > 0).reduce((sum, t) => sum + t.profit, 0);
    const losses = Math.abs(trades.filter(t => t.profit < 0).reduce((sum, t) => sum + t.profit, 0));
    return losses > 0 ? profits / losses : profits > 0 ? 999 : 0;
  }

  calculateBeta(returns) {
    // Simplified beta calculation (would need market returns for actual calculation)
    return 1.0;
  }

  calculateCorrelation(returns) {
    // Simplified correlation calculation
    return 0.7;
  }

  initializePortfolio(initialCapital, symbols) {
    const portfolio = {
      cash: initialCapital,
      positions: {}
    };
    
    symbols.forEach(symbol => {
      portfolio.positions[symbol] = 0;
    });
    
    return portfolio;
  }

  generateSimulatedData(symbol, startDate, endDate, interval) {
    const data = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    let currentTime = start;
    let price = 50 + Math.random() * 100; // Starting price $50-$150
    
    while (currentTime < end) {
      // Generate OHLCV data
      const open = price;
      const volatility = 0.02; // 2% volatility
      const change = (Math.random() - 0.5) * volatility * 2;
      const close = open * (1 + change);
      
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const volume = Math.floor(Math.random() * 1000000) + 100000;

      data.push({
        timestamp: currentTime.getTime(),
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume
      });

      price = close;
      
      // Move to next interval
      currentTime = new Date(currentTime.getTime() + this.getIntervalMs(interval));
    }
    
    return data;
  }

  getIntervalMs(interval) {
    const intervals = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    };
    return intervals[interval] || intervals['1h'];
  }

  /**
   * Get backtest results
   */
  getResults(strategyId) {
    return this.results.get(strategyId);
  }

  /**
   * Compare multiple strategies
   */
  compareStrategies(strategyIds) {
    const comparison = {
      strategies: [],
      metrics: ['totalReturn', 'sharpeRatio', 'maxDrawdown', 'winRate'],
      timestamp: new Date()
    };

    for (const strategyId of strategyIds) {
      const result = this.results.get(strategyId);
      if (result) {
        comparison.strategies.push({
          id: strategyId,
          name: this.strategies.get(strategyId)?.name || strategyId,
          performance: result.performance,
          riskMetrics: result.riskMetrics
        });
      }
    }

    return comparison;
  }
}

module.exports = BacktestingEngine;