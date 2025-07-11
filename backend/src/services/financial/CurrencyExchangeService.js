// src/services/financial/CurrencyExchangeService.js
const AccountingService = require('./AccountingService');
const { Transaction, AccountBalance, User } = require('../../models/postgresql');

/**
 * Currency Exchange Service
 * Handles single and dual currency exchanges with real-time rates
 */
class CurrencyExchangeService {
  constructor() {
    this.exchangeRateCache = new Map();
    this.cacheTimeout = 60000; // 1 minute cache
    this.supportedCurrencies = [
      'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY',
      'BTC', 'ETH', 'LTC', 'XRP', 'ADA', 'DOT', 'LINK', 'BCH'
    ];
    
    // Commission rates by currency pair type
    this.commissionRates = {
      fiat_to_fiat: 0.001,    // 0.1%
      fiat_to_crypto: 0.005,  // 0.5%
      crypto_to_fiat: 0.005,  // 0.5%
      crypto_to_crypto: 0.003 // 0.3%
    };
  }
  
  /**
   * Execute currency exchange transaction
   */
  async executeCurrencyExchange(exchangeData) {
    const {
      tenantId,
      userId,
      fromCurrency,
      toCurrency,
      fromAmount,
      exchangeRate = null,
      description = 'Currency Exchange'
    } = exchangeData;
    
    try {
      // Validate currencies
      if (!this.supportedCurrencies.includes(fromCurrency) || 
          !this.supportedCurrencies.includes(toCurrency)) {
        throw new Error('Unsupported currency pair');
      }
      
      // Get current exchange rate
      const currentRate = exchangeRate || await this.getExchangeRate(fromCurrency, toCurrency);
      if (!currentRate) {
        throw new Error('Unable to fetch exchange rate');
      }
      
      // Calculate amounts
      const toAmount = parseFloat(fromAmount) * currentRate;
      const commission = this.calculateCommission(fromCurrency, toCurrency, fromAmount);
      const netFromAmount = parseFloat(fromAmount) + commission;
      
      // Verify user has sufficient balance
      const userBalance = await AccountBalance.findOne({
        where: { userId, currency: fromCurrency }
      });
      
      if (!userBalance || parseFloat(userBalance.availableBalance) < netFromAmount) {
        throw new Error('Insufficient balance for exchange');
      }
      
      // Create exchange transaction using double-entry accounting
      const exchangeResult = await AccountingService.createDoubleEntryTransaction({
        tenantId,
        fromUserId: userId,
        toUserId: userId, // Same user for currency exchange
        amount: fromAmount,
        currency: fromCurrency,
        type: 'exchange',
        description,
        counterpartAmount: toAmount,
        counterpartCurrency: toCurrency,
        exchangeRate: currentRate,
        commission,
        metadata: {
          exchangeType: 'currency_exchange',
          originalAmount: fromAmount,
          exchangedAmount: toAmount,
          rate: currentRate,
          timestamp: new Date().toISOString()
        }
      });
      
      // Update balances for currency exchange
      await this.updateExchangeBalances({
        userId,
        fromCurrency,
        toCurrency,
        fromAmount: netFromAmount,
        toAmount
      });
      
      return {
        success: true,
        exchangeId: exchangeResult.referenceNumber,
        fromAmount,
        toAmount,
        exchangeRate: currentRate,
        commission,
        netFromAmount,
        fromCurrency,
        toCurrency,
        transactions: exchangeResult.transactions
      };
      
    } catch (error) {
      throw new Error(`Currency exchange failed: ${error.message}`);
    }
  }
  
  /**
   * Get real-time exchange rate
   */
  async getExchangeRate(fromCurrency, toCurrency, useCache = true) {
    const cacheKey = `${fromCurrency}_${toCurrency}`;
    
    // Check cache first
    if (useCache && this.exchangeRateCache.has(cacheKey)) {
      const cached = this.exchangeRateCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.rate;
      }
    }
    
    try {
      // In production, this would call external APIs like:
      // - CoinGecko API for crypto rates
      // - Fixer.io or similar for fiat rates
      // - Internal rate management system
      
      let rate = await this.fetchExternalRate(fromCurrency, toCurrency);
      
      // Apply spread for profit margin (0.1%)
      const spread = 0.001;
      rate = rate * (1 + spread);
      
      // Cache the rate
      this.exchangeRateCache.set(cacheKey, {
        rate,
        timestamp: Date.now()
      });
      
      return rate;
      
    } catch (error) {
      // Fallback to historical rates or manual rates
      return this.getFallbackRate(fromCurrency, toCurrency);
    }
  }
  
  /**
   * Fetch rate from external API (mock implementation)
   */
  async fetchExternalRate(fromCurrency, toCurrency) {
    // Mock exchange rates - in production, use real APIs
    const mockRates = {
      'USD_EUR': 0.85,
      'EUR_USD': 1.18,
      'USD_GBP': 0.73,
      'GBP_USD': 1.37,
      'USD_JPY': 110.0,
      'JPY_USD': 0.0091,
      'USD_BTC': 0.000025, // 1 USD = 0.000025 BTC (assuming BTC = $40,000)
      'BTC_USD': 40000,
      'USD_ETH': 0.0005,   // 1 USD = 0.0005 ETH (assuming ETH = $2,000)
      'ETH_USD': 2000,
      'BTC_ETH': 20,       // 1 BTC = 20 ETH
      'ETH_BTC': 0.05
    };
    
    const key = `${fromCurrency}_${toCurrency}`;
    const reverseKey = `${toCurrency}_${fromCurrency}`;
    
    if (mockRates[key]) {
      return mockRates[key];
    } else if (mockRates[reverseKey]) {
      return 1 / mockRates[reverseKey];
    } else {
      // Calculate via USD if direct pair not available
      const fromToUSD = mockRates[`${fromCurrency}_USD`] || (1 / mockRates[`USD_${fromCurrency}`]);
      const USDToTo = mockRates[`USD_${toCurrency}`] || (1 / mockRates[`${toCurrency}_USD`]);
      
      if (fromToUSD && USDToTo) {
        return fromToUSD * USDToTo;
      }
    }
    
    throw new Error('Exchange rate not available');
  }
  
  /**
   * Get fallback rate when external API fails
   */
  getFallbackRate(fromCurrency, toCurrency) {
    // Use hardcoded fallback rates or database stored rates
    const fallbackRates = {
      'USD_EUR': 0.85,
      'EUR_USD': 1.18,
      'USD_BTC': 0.000025,
      'BTC_USD': 40000
    };
    
    const key = `${fromCurrency}_${toCurrency}`;
    return fallbackRates[key] || 1;
  }
  
  /**
   * Calculate commission based on currency types
   */
  calculateCommission(fromCurrency, toCurrency, amount) {
    const fromType = this.getCurrencyType(fromCurrency);
    const toType = this.getCurrencyType(toCurrency);
    
    let commissionRate;
    
    if (fromType === 'fiat' && toType === 'fiat') {
      commissionRate = this.commissionRates.fiat_to_fiat;
    } else if (fromType === 'fiat' && toType === 'crypto') {
      commissionRate = this.commissionRates.fiat_to_crypto;
    } else if (fromType === 'crypto' && toType === 'fiat') {
      commissionRate = this.commissionRates.crypto_to_fiat;
    } else {
      commissionRate = this.commissionRates.crypto_to_crypto;
    }
    
    return parseFloat(amount) * commissionRate;
  }
  
  /**
   * Determine if currency is fiat or crypto
   */
  getCurrencyType(currency) {
    const cryptoCurrencies = ['BTC', 'ETH', 'LTC', 'XRP', 'ADA', 'DOT', 'LINK', 'BCH'];
    return cryptoCurrencies.includes(currency) ? 'crypto' : 'fiat';
  }
  
  /**
   * Update account balances for currency exchange
   */
  async updateExchangeBalances(balanceData) {
    const { userId, fromCurrency, toCurrency, fromAmount, toAmount } = balanceData;
    
    // Subtract from source currency balance
    const fromBalance = await AccountBalance.findOne({
      where: { userId, currency: fromCurrency }
    });
    
    if (fromBalance) {
      await fromBalance.subtractBalance(fromAmount, 'available');
    }
    
    // Add to destination currency balance
    const toBalance = await AccountBalance.findOrCreate({
      where: { userId, currency: toCurrency },
      defaults: {
        userId,
        currency: toCurrency,
        availableBalance: 0
      }
    });
    
    await toBalance[0].addBalance(toAmount, 'available');
  }
  
  /**
   * Get supported currency pairs
   */
  getSupportedPairs() {
    const pairs = [];
    
    for (const from of this.supportedCurrencies) {
      for (const to of this.supportedCurrencies) {
        if (from !== to) {
          pairs.push({
            from,
            to,
            pair: `${from}_${to}`,
            fromType: this.getCurrencyType(from),
            toType: this.getCurrencyType(to),
            commissionRate: this.calculateCommissionRate(from, to)
          });
        }
      }
    }
    
    return pairs;
  }
  
  /**
   * Calculate commission rate for display
   */
  calculateCommissionRate(fromCurrency, toCurrency) {
    const fromType = this.getCurrencyType(fromCurrency);
    const toType = this.getCurrencyType(toCurrency);
    
    if (fromType === 'fiat' && toType === 'fiat') {
      return this.commissionRates.fiat_to_fiat;
    } else if (fromType === 'fiat' && toType === 'crypto') {
      return this.commissionRates.fiat_to_crypto;
    } else if (fromType === 'crypto' && toType === 'fiat') {
      return this.commissionRates.crypto_to_fiat;
    } else {
      return this.commissionRates.crypto_to_crypto;
    }
  }
  
  /**
   * Get exchange rate history
   */
  async getExchangeRateHistory(fromCurrency, toCurrency, days = 30) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
    
    // In production, this would query historical rates from database
    // For now, return mock historical data
    const history = [];
    const currentRate = await this.getExchangeRate(fromCurrency, toCurrency);
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(endDate.getTime() - (i * 24 * 60 * 60 * 1000));
      const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
      const rate = currentRate * (1 + variation);
      
      history.push({
        date: date.toISOString().split('T')[0],
        rate: rate.toFixed(8),
        volume: Math.random() * 1000000 // Mock volume
      });
    }
    
    return history;
  }
  
  /**
   * Get exchange statistics
   */
  async getExchangeStatistics(tenantId, period = '24h') {
    const timeRanges = {
      '1h': 1 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    const timeRange = timeRanges[period] || timeRanges['24h'];
    const startTime = new Date(Date.now() - timeRange);
    
    const exchanges = await Transaction.findAll({
      where: {
        tenantId,
        type: 'exchange',
        status: 'completed',
        completedAt: {
          [require('sequelize').Op.gte]: startTime
        }
      }
    });
    
    const stats = {
      totalExchanges: exchanges.length,
      totalVolume: {},
      totalCommission: 0,
      averageExchangeAmount: 0,
      popularPairs: {},
      hourlyData: []
    };
    
    exchanges.forEach(exchange => {
      const amount = parseFloat(exchange.amount);
      const currency = exchange.currency;
      const commission = parseFloat(exchange.commission) || 0;
      
      // Volume by currency
      if (!stats.totalVolume[currency]) {
        stats.totalVolume[currency] = 0;
      }
      stats.totalVolume[currency] += Math.abs(amount);
      
      // Total commission
      stats.totalCommission += commission;
      
      // Popular pairs
      const pair = `${currency}_${exchange.counterpartCurrency}`;
      if (!stats.popularPairs[pair]) {
        stats.popularPairs[pair] = 0;
      }
      stats.popularPairs[pair]++;
    });
    
    // Calculate average
    const totalAmounts = Object.values(stats.totalVolume).reduce((sum, vol) => sum + vol, 0);
    stats.averageExchangeAmount = exchanges.length > 0 ? totalAmounts / exchanges.length : 0;
    
    return stats;
  }
  
  /**
   * Validate exchange request
   */
  validateExchangeRequest(exchangeData) {
    const { fromCurrency, toCurrency, fromAmount, userId } = exchangeData;
    
    const errors = [];
    
    if (!fromCurrency || !this.supportedCurrencies.includes(fromCurrency)) {
      errors.push('Invalid from currency');
    }
    
    if (!toCurrency || !this.supportedCurrencies.includes(toCurrency)) {
      errors.push('Invalid to currency');
    }
    
    if (fromCurrency === toCurrency) {
      errors.push('From and to currencies must be different');
    }
    
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      errors.push('Amount must be greater than 0');
    }
    
    if (!userId) {
      errors.push('User ID is required');
    }
    
    // Minimum exchange amounts
    const minimumAmounts = {
      'USD': 1,
      'EUR': 1,
      'BTC': 0.00001,
      'ETH': 0.001
    };
    
    const minAmount = minimumAmounts[fromCurrency] || 0.01;
    if (parseFloat(fromAmount) < minAmount) {
      errors.push(`Minimum exchange amount for ${fromCurrency} is ${minAmount}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = new CurrencyExchangeService();