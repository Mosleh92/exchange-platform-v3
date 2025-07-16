const moment = require('moment');
const redis = require('redis');

class BusinessRulesService {
  constructor() {
    this.rules = {
      trading: {
        minOrderSize: 0.001,
        maxOrderSize: 1000000,
        maxDailyVolume: 1000000,
        maxOpenOrders: 100,
        minBalance: 10,
        tradingHours: {
          start: '00:00',
          end: '23:59',
          timezone: 'UTC'
        },
        allowedSymbols: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT'],
        leverageLimits: {
          max: 10,
          default: 1
        }
      },
      compliance: {
        kycRequired: true,
        amlEnabled: true,
        suspiciousAmountThreshold: 10000,
        reportingThreshold: 50000,
        retentionPeriod: 7 * 365, // 7 years
        restrictedCountries: ['IR', 'CU', 'KP', 'SD', 'SY'],
        restrictedUsers: []
      },
      risk: {
        maxDrawdown: 0.2, // 20%
        maxExposure: 0.5, // 50% of portfolio
        stopLossRequired: true,
        maxLeverage: 10,
        marginCallThreshold: 0.8, // 80%
        liquidationThreshold: 0.5 // 50%
      },
      fees: {
        maker: 0.001, // 0.1%
        taker: 0.002, // 0.2%
        withdrawal: 0.01, // 1%
        deposit: 0,
        transfer: 0.001
      }
    };
    
    this.redis = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    this.violations = new Map();
    this.ruleChecks = new Map();
    
    this.init();
  }

  async init() {
    try {
      await this.redis.connect();
      await this.loadRules();
      await this.startRuleMonitoring();
      
      console.log('Business Rules Service initialized successfully');
    } catch (error) {
      console.error('Business Rules Service initialization failed:', error);
      throw error;
    }
  }

  // 📋 Rule Management
  async loadRules() {
    // Load rules from database or configuration
    const storedRules = await this.redis.get('business_rules');
    if (storedRules) {
      this.rules = { ...this.rules, ...JSON.parse(storedRules) };
    }
  }

  async updateRule(category, ruleName, value) {
    if (this.rules[category] && this.rules[category][ruleName] !== undefined) {
      this.rules[category][ruleName] = value;
      await this.saveRules();
      return true;
    }
    return false;
  }

  async saveRules() {
    await this.redis.set('business_rules', JSON.stringify(this.rules));
  }

  // 🎯 Trading Rules
  async validateTradingOrder(userId, order) {
    const violations = [];
    
    // Check order size limits
    if (order.quantity < this.rules.trading.minOrderSize) {
      violations.push({
        rule: 'MIN_ORDER_SIZE',
        message: `Order size must be at least ${this.rules.trading.minOrderSize}`,
        severity: 'HIGH'
      });
    }
    
    if (order.quantity > this.rules.trading.maxOrderSize) {
      violations.push({
        rule: 'MAX_ORDER_SIZE',
        message: `Order size cannot exceed ${this.rules.trading.maxOrderSize}`,
        severity: 'HIGH'
      });
    }

    // Check symbol restrictions
    if (!this.rules.trading.allowedSymbols.includes(order.symbol)) {
      violations.push({
        rule: 'SYMBOL_RESTRICTION',
        message: `Trading not allowed for symbol: ${order.symbol}`,
        severity: 'HIGH'
      });
    }

    // Check trading hours
    if (!this.isWithinTradingHours()) {
      violations.push({
        rule: 'TRADING_HOURS',
        message: 'Trading is currently closed',
        severity: 'MEDIUM'
      });
    }

    // Check user limits
    const userLimits = await this.checkUserLimits(userId, order);
    violations.push(...userLimits);

    // Check leverage limits
    if (order.leverage && order.leverage > this.rules.trading.leverageLimits.max) {
      violations.push({
        rule: 'MAX_LEVERAGE',
        message: `Leverage cannot exceed ${this.rules.trading.leverageLimits.max}x`,
        severity: 'HIGH'
      });
    }

    return {
      valid: violations.length === 0,
      violations,
      warnings: violations.filter(v => v.severity === 'MEDIUM')
    };
  }

  async checkUserLimits(userId, order) {
    const violations = [];
    
    // Check daily volume limit
    const dailyVolume = await this.getUserDailyVolume(userId);
    if (dailyVolume + order.quantity > this.rules.trading.maxDailyVolume) {
      violations.push({
        rule: 'DAILY_VOLUME_LIMIT',
        message: 'Daily trading volume limit exceeded',
        severity: 'HIGH'
      });
    }

    // Check open orders limit
    const openOrders = await this.getUserOpenOrders(userId);
    if (openOrders.length >= this.rules.trading.maxOpenOrders) {
      violations.push({
        rule: 'MAX_OPEN_ORDERS',
        message: `Maximum ${this.rules.trading.maxOpenOrders} open orders allowed`,
        severity: 'MEDIUM'
      });
    }

    // Check balance requirements
    const balance = await this.getUserBalance(userId);
    if (balance < this.rules.trading.minBalance) {
      violations.push({
        rule: 'MIN_BALANCE',
        message: `Minimum balance of ${this.rules.trading.minBalance} required`,
        severity: 'HIGH'
      });
    }

    return violations;
  }

  isWithinTradingHours() {
    const now = moment().utc();
    const start = moment(this.rules.trading.tradingHours.start, 'HH:mm');
    const end = moment(this.rules.trading.tradingHours.end, 'HH:mm');
    
    const currentTime = moment(now.format('HH:mm'), 'HH:mm');
    return currentTime.isBetween(start, end, null, '[]');
  }

  // 🔒 Compliance Rules
  async validateCompliance(userId, transaction) {
    const violations = [];
    
    // Check KYC requirement
    const kycStatus = await this.getUserKYCStatus(userId);
    if (this.rules.compliance.kycRequired && !kycStatus.verified) {
      violations.push({
        rule: 'KYC_REQUIRED',
        message: 'KYC verification required for trading',
        severity: 'HIGH'
      });
    }

    // Check AML requirements
    if (this.rules.compliance.amlEnabled) {
      const amlCheck = await this.performAMLCheck(userId, transaction);
      if (!amlCheck.passed) {
        violations.push({
          rule: 'AML_VIOLATION',
          message: amlCheck.reason,
          severity: 'HIGH'
        });
      }
    }

    // Check suspicious amount threshold
    if (transaction.amount > this.rules.compliance.suspiciousAmountThreshold) {
      violations.push({
        rule: 'SUSPICIOUS_AMOUNT',
        message: 'Transaction amount requires additional verification',
        severity: 'MEDIUM'
      });
    }

    // Check country restrictions
    const userCountry = await this.getUserCountry(userId);
    if (this.rules.compliance.restrictedCountries.includes(userCountry)) {
      violations.push({
        rule: 'COUNTRY_RESTRICTION',
        message: 'Trading not allowed in your country',
        severity: 'HIGH'
      });
    }

    // Check restricted users
    if (this.rules.compliance.restrictedUsers.includes(userId)) {
      violations.push({
        rule: 'USER_RESTRICTION',
        message: 'Account is restricted from trading',
        severity: 'HIGH'
      });
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }

  async performAMLCheck(userId, transaction) {
    // Mock AML check - in real implementation, integrate with AML service
    const userRisk = await this.calculateUserRisk(userId);
    const transactionRisk = this.calculateTransactionRisk(transaction);
    
    const totalRisk = userRisk + transactionRisk;
    
    if (totalRisk > 0.7) {
      return {
        passed: false,
        reason: 'Transaction flagged for AML review',
        riskScore: totalRisk
      };
    }
    
    return {
      passed: true,
      riskScore: totalRisk
    };
  }

  async calculateUserRisk(userId) {
    // Mock risk calculation based on user history
    const userHistory = await this.getUserTransactionHistory(userId);
    
    let riskScore = 0;
    
    // Check for unusual patterns
    if (userHistory.length < 5) riskScore += 0.2; // New user
    if (userHistory.some(tx => tx.amount > 50000)) riskScore += 0.3; // Large transactions
    if (userHistory.some(tx => tx.type === 'withdrawal')) riskScore += 0.1; // Withdrawals
    
    return Math.min(riskScore, 1.0);
  }

  calculateTransactionRisk(transaction) {
    let riskScore = 0;
    
    // Amount-based risk
    if (transaction.amount > 100000) riskScore += 0.4;
    else if (transaction.amount > 10000) riskScore += 0.2;
    
    // Time-based risk
    const hour = moment().hour();
    if (hour < 6 || hour > 22) riskScore += 0.1; // Off-hours
    
    // Frequency-based risk
    const recentTransactions = this.getRecentTransactions(transaction.userId);
    if (recentTransactions.length > 10) riskScore += 0.2; // High frequency
    
    return Math.min(riskScore, 1.0);
  }

  // ⚠️ Risk Management Rules
  async validateRiskLimits(userId, order) {
    const violations = [];
    
    // Check portfolio exposure
    const exposure = await this.calculatePortfolioExposure(userId);
    if (exposure > this.rules.risk.maxExposure) {
      violations.push({
        rule: 'MAX_EXPOSURE',
        message: `Portfolio exposure cannot exceed ${this.rules.risk.maxExposure * 100}%`,
        severity: 'HIGH'
      });
    }

    // Check drawdown limits
    const drawdown = await this.calculateDrawdown(userId);
    if (drawdown > this.rules.risk.maxDrawdown) {
      violations.push({
        rule: 'MAX_DRAWDOWN',
        message: `Maximum drawdown of ${this.rules.risk.maxDrawdown * 100}% exceeded`,
        severity: 'HIGH'
      });
    }

    // Check margin requirements
    if (order.leverage && order.leverage > 1) {
      const marginCheck = await this.checkMarginRequirements(userId, order);
      if (!marginCheck.sufficient) {
        violations.push({
          rule: 'INSUFFICIENT_MARGIN',
          message: marginCheck.reason,
          severity: 'HIGH'
        });
      }
    }

    // Check stop-loss requirement
    if (this.rules.risk.stopLossRequired && !order.stopLoss) {
      violations.push({
        rule: 'STOP_LOSS_REQUIRED',
        message: 'Stop-loss is required for this order',
        severity: 'MEDIUM'
      });
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }

  async calculatePortfolioExposure(userId) {
    const positions = await this.getUserPositions(userId);
    const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);
    const portfolioValue = await this.getPortfolioValue(userId);
    
    return portfolioValue > 0 ? totalValue / portfolioValue : 0;
  }

  async calculateDrawdown(userId) {
    const portfolioHistory = await this.getPortfolioHistory(userId);
    if (portfolioHistory.length < 2) return 0;
    
    const peak = Math.max(...portfolioHistory.map(p => p.value));
    const current = portfolioHistory[portfolioHistory.length - 1].value;
    
    return peak > 0 ? (peak - current) / peak : 0;
  }

  async checkMarginRequirements(userId, order) {
    const balance = await this.getUserBalance(userId);
    const requiredMargin = order.quantity * order.price / order.leverage;
    
    if (balance < requiredMargin) {
      return {
        sufficient: false,
        reason: `Insufficient margin. Required: ${requiredMargin}, Available: ${balance}`
      };
    }
    
    return { sufficient: true };
  }

  // 💰 Fee Calculation Rules
  calculateFees(order, userType = 'regular') {
    const baseFee = order.side === 'buy' ? this.rules.fees.taker : this.rules.fees.maker;
    
    // Apply volume discounts
    const volumeDiscount = this.calculateVolumeDiscount(order.userId);
    
    // Apply VIP discounts
    const vipDiscount = this.calculateVIPDiscount(userType);
    
    const finalFee = baseFee * (1 - volumeDiscount) * (1 - vipDiscount);
    
    return {
      baseFee,
      volumeDiscount,
      vipDiscount,
      finalFee,
      feeAmount: order.quantity * order.price * finalFee
    };
  }

  calculateVolumeDiscount(userId) {
    const monthlyVolume = this.getUserMonthlyVolume(userId);
    
    if (monthlyVolume > 1000000) return 0.5; // 50% discount
    if (monthlyVolume > 500000) return 0.3; // 30% discount
    if (monthlyVolume > 100000) return 0.1; // 10% discount
    
    return 0;
  }

  calculateVIPDiscount(userType) {
    const discounts = {
      vip: 0.2,
      premium: 0.1,
      regular: 0
    };
    
    return discounts[userType] || 0;
  }

  // 📊 Rule Monitoring
  async startRuleMonitoring() {
    setInterval(() => {
      this.monitorRuleViolations();
    }, 300000); // Check every 5 minutes
  }

  async monitorRuleViolations() {
    const violations = await this.detectRuleViolations();
    
    for (const violation of violations) {
      await this.handleRuleViolation(violation);
    }
  }

  async detectRuleViolations() {
    const violations = [];
    
    // Check for excessive trading
    const activeUsers = await this.getActiveUsers();
    for (const userId of activeUsers) {
      const dailyVolume = await this.getUserDailyVolume(userId);
      if (dailyVolume > this.rules.trading.maxDailyVolume) {
        violations.push({
          type: 'EXCESSIVE_TRADING',
          userId,
          severity: 'HIGH',
          details: { dailyVolume, limit: this.rules.trading.maxDailyVolume }
        });
      }
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = await this.detectSuspiciousPatterns();
    violations.push(...suspiciousPatterns);
    
    return violations;
  }

  async handleRuleViolation(violation) {
    // Log violation
    await this.logViolation(violation);
    
    // Take action based on severity
    switch (violation.severity) {
      case 'HIGH':
        await this.handleHighSeverityViolation(violation);
        break;
      case 'MEDIUM':
        await this.handleMediumSeverityViolation(violation);
        break;
      case 'LOW':
        await this.handleLowSeverityViolation(violation);
        break;
    }
  }

  async handleHighSeverityViolation(violation) {
    // Immediate action required
    switch (violation.type) {
      case 'EXCESSIVE_TRADING':
        await this.suspendUserTrading(violation.userId);
        break;
      case 'AML_VIOLATION':
        await this.flagForReview(violation.userId);
        break;
      case 'RISK_LIMIT_EXCEEDED':
        await this.forceLiquidation(violation.userId);
        break;
    }
  }

  async handleMediumSeverityViolation(violation) {
    // Warning and monitoring
    await this.sendWarning(violation.userId, violation);
  }

  async handleLowSeverityViolation(violation) {
    // Log and monitor
    await this.logViolation(violation);
  }

  // 🔍 Suspicious Pattern Detection
  async detectSuspiciousPatterns() {
    const patterns = [];
    
    // Check for wash trading
    const washTradingUsers = await this.detectWashTrading();
    patterns.push(...washTradingUsers);
    
    // Check for pump and dump
    const pumpAndDumpUsers = await this.detectPumpAndDump();
    patterns.push(...pumpAndDumpUsers);
    
    // Check for insider trading
    const insiderTradingUsers = await this.detectInsiderTrading();
    patterns.push(...insiderTradingUsers);
    
    return patterns;
  }

  async detectWashTrading() {
    // Mock wash trading detection
    const suspiciousUsers = [];
    
    // Check for users buying and selling the same asset frequently
    const users = await this.getActiveUsers();
    for (const userId of users) {
      const trades = await this.getUserTrades(userId, '24h');
      const washTradingScore = this.calculateWashTradingScore(trades);
      
      if (washTradingScore > 0.7) {
        suspiciousUsers.push({
          type: 'WASH_TRADING',
          userId,
          severity: 'HIGH',
          score: washTradingScore
        });
      }
    }
    
    return suspiciousUsers;
  }

  calculateWashTradingScore(trades) {
    if (trades.length < 10) return 0;
    
    let buyCount = 0;
    let sellCount = 0;
    let sameAssetTrades = 0;
    
    trades.forEach(trade => {
      if (trade.side === 'buy') buyCount++;
      else sellCount++;
      
      // Check for same asset trades within short time
      const sameAssetTradesInTimeframe = trades.filter(t => 
        t.symbol === trade.symbol && 
        Math.abs(t.timestamp - trade.timestamp) < 60000 // 1 minute
      );
      
      if (sameAssetTradesInTimeframe.length > 2) {
        sameAssetTrades++;
      }
    });
    
    const buySellRatio = Math.abs(buyCount - sellCount) / trades.length;
    const frequentTradingRatio = sameAssetTrades / trades.length;
    
    return (buySellRatio + frequentTradingRatio) / 2;
  }

  async detectPumpAndDump() {
    // Mock pump and dump detection
    return [];
  }

  async detectInsiderTrading() {
    // Mock insider trading detection
    return [];
  }

  // 📊 Reporting & Analytics
  async generateRuleReport(timeRange = '24h') {
    const startTime = moment().subtract(1, timeRange).toDate();
    
    const violations = Array.from(this.violations.values())
      .filter(v => v.timestamp >= startTime.getTime());
    
    const report = {
      period: timeRange,
      totalViolations: violations.length,
      violationsByType: this.groupViolationsByType(violations),
      violationsBySeverity: this.groupViolationsBySeverity(violations),
      topViolatingUsers: this.getTopViolatingUsers(violations),
      ruleEffectiveness: await this.calculateRuleEffectiveness(violations)
    };
    
    return report;
  }

  groupViolationsByType(violations) {
    const grouped = {};
    
    violations.forEach(violation => {
      if (!grouped[violation.type]) {
        grouped[violation.type] = 0;
      }
      grouped[violation.type]++;
    });
    
    return grouped;
  }

  groupViolationsBySeverity(violations) {
    const grouped = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    
    violations.forEach(violation => {
      grouped[violation.severity]++;
    });
    
    return grouped;
  }

  getTopViolatingUsers(violations) {
    const userViolations = {};
    
    violations.forEach(violation => {
      if (violation.userId) {
        userViolations[violation.userId] = (userViolations[violation.userId] || 0) + 1;
      }
    });
    
    return Object.entries(userViolations)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, violations: count }));
  }

  async calculateRuleEffectiveness(violations) {
    // Calculate how effective rules are at preventing violations
    const totalChecks = await this.getTotalRuleChecks();
    const preventedViolations = totalChecks - violations.length;
    
    return {
      totalChecks,
      preventedViolations,
      effectiveness: totalChecks > 0 ? preventedViolations / totalChecks : 0
    };
  }

  // 🗄️ Database Operations (Mock)
  async logViolation(violation) {
    violation.timestamp = Date.now();
    this.violations.set(violation.id || Date.now(), violation);
  }

  async getUserDailyVolume(userId) {
    // Mock implementation
    return Math.random() * 50000;
  }

  async getUserOpenOrders(userId) {
    // Mock implementation
    return [];
  }

  async getUserBalance(userId) {
    // Mock implementation
    return 10000;
  }

  async getUserKYCStatus(userId) {
    // Mock implementation
    return { verified: true, level: 'FULL' };
  }

  async getUserCountry(userId) {
    // Mock implementation
    return 'US';
  }

  async getUserTransactionHistory(userId) {
    // Mock implementation
    return [];
  }

  async getRecentTransactions(userId) {
    // Mock implementation
    return [];
  }

  async getUserPositions(userId) {
    // Mock implementation
    return [];
  }

  async getPortfolioValue(userId) {
    // Mock implementation
    return 50000;
  }

  async getPortfolioHistory(userId) {
    // Mock implementation
    return [];
  }

  async getActiveUsers() {
    // Mock implementation
    return ['user1', 'user2', 'user3'];
  }

  async getUserTrades(userId, timeRange) {
    // Mock implementation
    return [];
  }

  async getTotalRuleChecks() {
    // Mock implementation
    return 1000;
  }
}

module.exports = new BusinessRulesService(); 