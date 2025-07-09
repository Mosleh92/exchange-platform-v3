const mongoose = require('mongoose');

const tradingBotSchema = new mongoose.Schema({
  // Basic info
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },
  description: String,
  
  // Bot configuration
  strategy: {
    type: { type: String, enum: ['grid', 'dca', 'arbitrage', 'momentum', 'mean_reversion', 'custom'], required: true },
    parameters: mongoose.Schema.Types.Mixed,
    riskLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
  },
  
  // Trading pairs
  tradingPairs: [{
    currency: { type: String, required: true },
    baseCurrency: { type: String, required: true },
    minAmount: { type: Number },
    maxAmount: { type: Number },
    allocation: { type: Number, min: 0, max: 100 } // Percentage of total capital
  }],
  
  // Capital management
  capital: {
    total: { type: Number, required: true },
    allocated: { type: Number, default: 0 },
    available: { type: Number, default: 0 },
    maxDrawdown: { type: Number, default: 20 }, // Percentage
    stopLoss: { type: Number, default: 10 }, // Percentage
    takeProfit: { type: Number, default: 30 } // Percentage
  },
  
  // Performance tracking
  performance: {
    totalTrades: { type: Number, default: 0 },
    winningTrades: { type: Number, default: 0 },
    losingTrades: { type: Number, default: 0 },
    totalProfit: { type: Number, default: 0 },
    totalLoss: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    averageWin: { type: Number, default: 0 },
    averageLoss: { type: Number, default: 0 },
    maxDrawdown: { type: Number, default: 0 },
    sharpeRatio: { type: Number, default: 0 },
    profitFactor: { type: Number, default: 0 }
  },
  
  // Bot status
  status: {
    type: String,
    enum: ['active', 'paused', 'stopped', 'error', 'maintenance'],
    default: 'stopped'
  },
  
  // Schedule
  schedule: {
    enabled: { type: Boolean, default: false },
    timezone: { type: String, default: 'UTC' },
    tradingHours: {
      start: { type: String, default: '00:00' },
      end: { type: String, default: '23:59' }
    },
    daysOfWeek: [{ type: Number, min: 0, max: 6 }], // 0 = Sunday, 6 = Saturday
    holidays: [Date]
  },
  
  // Risk management
  riskManagement: {
    maxPositionSize: { type: Number, default: 10 }, // Percentage of capital
    maxDailyLoss: { type: Number, default: 5 }, // Percentage
    maxDailyTrades: { type: Number, default: 50 },
    correlationLimit: { type: Number, default: 0.7 }, // Maximum correlation between positions
    volatilityThreshold: { type: Number, default: 0.05 }, // 5% volatility threshold
    newsFilter: { type: Boolean, default: false },
    marketHoursOnly: { type: Boolean, default: true }
  },
  
  // Technical indicators
  indicators: [{
    name: { type: String, required: true },
    parameters: mongoose.Schema.Types.Mixed,
    weight: { type: Number, min: 0, max: 1, default: 1 }
  }],
  
  // Signal generation
  signals: {
    buyConditions: [mongoose.Schema.Types.Mixed],
    sellConditions: [mongoose.Schema.Types.Mixed],
    stopLossConditions: [mongoose.Schema.Types.Mixed],
    takeProfitConditions: [mongoose.Schema.Types.Mixed]
  },
  
  // Execution settings
  execution: {
    slippage: { type: Number, default: 0.1 }, // Percentage
    maxSpread: { type: Number, default: 0.5 }, // Percentage
    minVolume: { type: Number, default: 1000 },
    orderTimeout: { type: Number, default: 30 }, // Seconds
    retryAttempts: { type: Number, default: 3 },
    partialFills: { type: Boolean, default: true }
  },
  
  // Monitoring and alerts
  monitoring: {
    emailAlerts: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    telegramAlerts: { type: Boolean, default: false },
    alertThresholds: {
      profit: { type: Number, default: 10 }, // Percentage
      loss: { type: Number, default: 5 }, // Percentage
      drawdown: { type: Number, default: 15 } // Percentage
    }
  },
  
  // Backtesting results
  backtest: {
    enabled: { type: Boolean, default: false },
    startDate: { type: Date },
    endDate: { type: Date },
    results: mongoose.Schema.Types.Mixed,
    optimization: {
      enabled: { type: Boolean, default: false },
      parameters: [String],
      ranges: mongoose.Schema.Types.Mixed
    }
  },
  
  // Machine learning
  machineLearning: {
    enabled: { type: Boolean, default: false },
    model: { type: String, enum: ['linear', 'random_forest', 'neural_network', 'lstm'] },
    features: [String],
    trainingData: {
      startDate: { type: Date },
      endDate: { type: Date },
      accuracy: { type: Number },
      precision: { type: Number },
      recall: { type: Number }
    },
    predictions: [{
      timestamp: { type: Date },
      prediction: { type: String, enum: ['buy', 'sell', 'hold'] },
      confidence: { type: Number },
      actual: { type: String, enum: ['buy', 'sell', 'hold'] }
    }]
  },
  
  // Audit trail
  audit: {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    version: { type: Number, default: 1 },
    changes: [{
      timestamp: { type: Date, default: Date.now },
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed,
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }]
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastRun: { type: Date },
  nextRun: { type: Date }
}, {
  timestamps: true
});

// Indexes
tradingBotSchema.index({ userId: 1, status: 1 });
tradingBotSchema.index({ tenantId: 1, status: 1 });
tradingBotSchema.index({ 'strategy.type': 1 });
tradingBotSchema.index({ createdAt: -1 });

// Pre-save middleware
tradingBotSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculate performance metrics
  if (this.performance.totalTrades > 0) {
    this.performance.winRate = (this.performance.winningTrades / this.performance.totalTrades) * 100;
    this.performance.averageWin = this.performance.winningTrades > 0 ? this.performance.totalProfit / this.performance.winningTrades : 0;
    this.performance.averageLoss = this.performance.losingTrades > 0 ? this.performance.totalLoss / this.performance.losingTrades : 0;
    this.performance.profitFactor = this.performance.totalLoss > 0 ? this.performance.totalProfit / this.performance.totalLoss : 0;
  }
  
  next();
});

// Instance methods
tradingBotSchema.methods.isActive = function() {
  return this.status === 'active';
};

tradingBotSchema.methods.canTrade = function() {
  return this.isActive() && this.capital.available > 0;
};

tradingBotSchema.methods.updatePerformance = function(trade) {
  this.performance.totalTrades++;
  
  if (trade.profit > 0) {
    this.performance.winningTrades++;
    this.performance.totalProfit += trade.profit;
  } else {
    this.performance.losingTrades++;
    this.performance.totalLoss += Math.abs(trade.profit);
  }
  
  this.performance.netProfit = this.performance.totalProfit - this.performance.totalLoss;
  
  // Update drawdown
  if (this.performance.netProfit < this.performance.maxDrawdown) {
    this.performance.maxDrawdown = this.performance.netProfit;
  }
  
  this.save();
};

tradingBotSchema.methods.generateSignal = function(marketData) {
  // This would implement the bot's signal generation logic
  // based on the strategy type and indicators
  return {
    action: 'hold',
    confidence: 0.5,
    reason: 'No clear signal'
  };
};

tradingBotSchema.methods.executeTrade = function(signal, marketData) {
  if (!this.canTrade()) {
    return { success: false, reason: 'Bot not active or insufficient capital' };
  }
  
  // Implement trade execution logic
  return {
    success: true,
    orderId: 'mock_order_id',
    amount: signal.amount,
    price: marketData.price
  };
};

// Static methods
tradingBotSchema.statics.findActiveBots = function(userId) {
  return this.find({
    userId,
    status: 'active'
  });
};

tradingBotSchema.statics.findByStrategy = function(strategyType) {
  return this.find({
    'strategy.type': strategyType,
    status: 'active'
  });
};

module.exports = mongoose.model('TradingBot', tradingBotSchema); 
