const Decimal = require('decimal.js');
const ExchangeRate = require('../models/ExchangeRate');
const logger = require('../utils/logger');

/**
 * Enhanced Currency Conversion Service
 * Provides accurate currency conversion with precision handling,
 * validation, and historical rate tracking
 */
class EnhancedCurrencyConversionService {
  constructor() {
    // Set decimal precision for financial calculations
    Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });
    
    this.supportedCurrencies = [
      'IRR', 'USD', 'EUR', 'AED', 'GBP', 'TRY', 
      'BTC', 'ETH', 'USDT', 'BNB'
    ];
    
    this.conversionPrecision = {
      'IRR': 0, // No decimal places for Iranian Rial
      'USD': 2,
      'EUR': 2,
      'AED': 2,
      'GBP': 2,
      'TRY': 2,
      'BTC': 8,
      'ETH': 6,
      'USDT': 2,
      'BNB': 4
    };
  }

  /**
   * Convert amount from one currency to another with precision
   * @param {number|string} amount - Amount to convert
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency  
   * @param {number} exchangeRate - Exchange rate (optional, will fetch if not provided)
   * @param {string} tenantId - Tenant ID for rate lookup
   * @returns {Promise<Object>} Conversion result with detailed breakdown
   */
  async convertCurrency(amount, fromCurrency, toCurrency, exchangeRate = null, tenantId = null) {
    try {
      // Input validation
      this.validateCurrencyInputs(amount, fromCurrency, toCurrency);

      // Same currency conversion
      if (fromCurrency === toCurrency) {
        return this.createConversionResult(amount, amount, 1, fromCurrency, toCurrency);
      }

      // Get exchange rate
      const rate = exchangeRate || await this.getExchangeRate(fromCurrency, toCurrency, tenantId);
      if (!rate) {
        throw new Error(`Exchange rate not available for ${fromCurrency}/${toCurrency}`);
      }

      // Perform conversion with high precision
      const sourceAmount = new Decimal(amount);
      const conversionRate = new Decimal(rate);
      const convertedAmount = sourceAmount.mul(conversionRate);

      // Apply currency-specific precision
      const targetPrecision = this.conversionPrecision[toCurrency] || 2;
      const finalAmount = convertedAmount.toDecimalPlaces(targetPrecision);

      // Calculate conversion spread and fees
      const spread = await this.calculateSpread(fromCurrency, toCurrency, rate, tenantId);
      const fees = await this.calculateConversionFees(amount, fromCurrency, toCurrency, tenantId);

      const result = this.createConversionResult(
        sourceAmount.toNumber(),
        finalAmount.toNumber(),
        conversionRate.toNumber(),
        fromCurrency,
        toCurrency,
        spread,
        fees
      );

      // Log conversion for audit trail
      this.logConversion(result, tenantId);

      return result;

    } catch (error) {
      logger.error('Currency conversion error:', {
        amount,
        fromCurrency,
        toCurrency,
        exchangeRate,
        tenantId,
        error: error.message
      });
      throw new Error(`Currency conversion failed: ${error.message}`);
    }
  }

  /**
   * Get current exchange rate with fallback mechanisms
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<number>} Exchange rate
   */
  async getExchangeRate(fromCurrency, toCurrency, tenantId) {
    try {
      // Try to get tenant-specific rate first
      if (tenantId) {
        const tenantRate = await ExchangeRate.findOne({
          tenantId,
          fromCurrency,
          toCurrency,
          isActive: true
        }).sort({ updatedAt: -1 });

        if (tenantRate && this.isRateValid(tenantRate)) {
          return tenantRate.rate;
        }
      }

      // Fallback to system-wide rate
      const systemRate = await ExchangeRate.findOne({
        tenantId: null,
        fromCurrency,
        toCurrency,
        isActive: true
      }).sort({ updatedAt: -1 });

      if (systemRate && this.isRateValid(systemRate)) {
        return systemRate.rate;
      }

      // Try inverse rate calculation
      const inverseRate = await ExchangeRate.findOne({
        fromCurrency: toCurrency,
        toCurrency: fromCurrency,
        isActive: true
      }).sort({ updatedAt: -1 });

      if (inverseRate && this.isRateValid(inverseRate)) {
        return new Decimal(1).div(inverseRate.rate).toNumber();
      }

      throw new Error(`No valid exchange rate found for ${fromCurrency}/${toCurrency}`);

    } catch (error) {
      logger.error('Exchange rate lookup error:', error);
      throw error;
    }
  }

  /**
   * Calculate currency conversion spread
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @param {number} rate - Base exchange rate
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Spread information
   */
  async calculateSpread(fromCurrency, toCurrency, rate, tenantId) {
    try {
      // Default spread percentages by currency pair
      const defaultSpreads = {
        'IRR/AED': 0.005, // 0.5%
        'IRR/USD': 0.01,  // 1%
        'IRR/EUR': 0.01,  // 1%
        'AED/USD': 0.003, // 0.3%
        'BTC/USD': 0.002, // 0.2%
        'ETH/USD': 0.003  // 0.3%
      };

      const pair = `${fromCurrency}/${toCurrency}`;
      const inversePair = `${toCurrency}/${fromCurrency}`;
      
      let spreadPercentage = defaultSpreads[pair] || defaultSpreads[inversePair] || 0.005;

      // Apply tenant-specific spread adjustments if available
      if (tenantId) {
        const tenantSpread = await this.getTenantSpread(tenantId, fromCurrency, toCurrency);
        if (tenantSpread) {
          spreadPercentage = tenantSpread.percentage;
        }
      }

      const spreadAmount = new Decimal(rate).mul(spreadPercentage);

      return {
        percentage: spreadPercentage,
        amount: spreadAmount.toNumber(),
        description: `${(spreadPercentage * 100).toFixed(2)}% spread for ${pair}`
      };

    } catch (error) {
      logger.error('Spread calculation error:', error);
      return { percentage: 0.005, amount: 0, description: 'Default spread' };
    }
  }

  /**
   * Calculate conversion fees
   * @param {number} amount - Source amount
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Object>} Fee information
   */
  async calculateConversionFees(amount, fromCurrency, toCurrency, tenantId) {
    try {
      const fees = {
        conversionFee: 0,
        serviceFee: 0,
        total: 0,
        currency: fromCurrency
      };

      // Base conversion fee (percentage of amount)
      const conversionFeeRate = 0.001; // 0.1%
      fees.conversionFee = new Decimal(amount).mul(conversionFeeRate).toNumber();

      // Fixed service fee for smaller amounts
      if (amount < 1000000) { // Less than 1M IRR equivalent
        fees.serviceFee = 50000; // 50,000 IRR equivalent
      }

      fees.total = fees.conversionFee + fees.serviceFee;

      return fees;

    } catch (error) {
      logger.error('Fee calculation error:', error);
      return { conversionFee: 0, serviceFee: 0, total: 0, currency: fromCurrency };
    }
  }

  /**
   * Validate currency conversion inputs
   * @param {*} amount - Amount to validate
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   */
  validateCurrencyInputs(amount, fromCurrency, toCurrency) {
    // Validate amount
    if (amount === null || amount === undefined || isNaN(amount)) {
      throw new Error('Invalid amount: must be a valid number');
    }

    if (amount < 0) {
      throw new Error('Invalid amount: must be positive');
    }

    if (amount === 0) {
      throw new Error('Invalid amount: must be greater than zero');
    }

    // Validate currencies
    if (!fromCurrency || typeof fromCurrency !== 'string') {
      throw new Error('Invalid source currency');
    }

    if (!toCurrency || typeof toCurrency !== 'string') {
      throw new Error('Invalid target currency');
    }

    if (!this.supportedCurrencies.includes(fromCurrency.toUpperCase())) {
      throw new Error(`Unsupported source currency: ${fromCurrency}`);
    }

    if (!this.supportedCurrencies.includes(toCurrency.toUpperCase())) {
      throw new Error(`Unsupported target currency: ${toCurrency}`);
    }
  }

  /**
   * Check if exchange rate is valid and not stale
   * @param {Object} rateRecord - Exchange rate record
   * @returns {boolean} True if rate is valid
   */
  isRateValid(rateRecord) {
    if (!rateRecord || !rateRecord.rate || rateRecord.rate <= 0) {
      return false;
    }

    // Check if rate is not too old (default: 1 hour for crypto, 24 hours for fiat)
    const now = new Date();
    const rateAge = now - rateRecord.updatedAt;
    const maxAge = this.isCryptoCurrency(rateRecord.fromCurrency) || 
                   this.isCryptoCurrency(rateRecord.toCurrency) ? 
                   60 * 60 * 1000 : // 1 hour for crypto
                   24 * 60 * 60 * 1000; // 24 hours for fiat

    return rateAge <= maxAge;
  }

  /**
   * Check if currency is cryptocurrency
   * @param {string} currency - Currency code
   * @returns {boolean} True if cryptocurrency
   */
  isCryptoCurrency(currency) {
    const cryptoCurrencies = ['BTC', 'ETH', 'USDT', 'BNB'];
    return cryptoCurrencies.includes(currency.toUpperCase());
  }

  /**
   * Create standardized conversion result
   * @param {number} sourceAmount - Original amount
   * @param {number} convertedAmount - Converted amount
   * @param {number} rate - Exchange rate used
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @param {Object} spread - Spread information
   * @param {Object} fees - Fee information
   * @returns {Object} Conversion result
   */
  createConversionResult(sourceAmount, convertedAmount, rate, fromCurrency, toCurrency, spread = null, fees = null) {
    return {
      sourceAmount,
      convertedAmount,
      exchangeRate: rate,
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: toCurrency.toUpperCase(),
      spread,
      fees,
      timestamp: new Date(),
      precision: this.conversionPrecision[toCurrency.toUpperCase()] || 2
    };
  }

  /**
   * Get tenant-specific spread configuration
   * @param {string} tenantId - Tenant ID
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @returns {Promise<Object|null>} Tenant spread configuration
   */
  async getTenantSpread(tenantId, fromCurrency, toCurrency) {
    try {
      // This would typically query a tenant configuration table
      // For now, return null to use default spreads
      return null;
    } catch (error) {
      logger.error('Tenant spread lookup error:', error);
      return null;
    }
  }

  /**
   * Log conversion for audit trail
   * @param {Object} conversionResult - Conversion result
   * @param {string} tenantId - Tenant ID
   */
  logConversion(conversionResult, tenantId) {
    logger.info('Currency conversion completed', {
      tenantId,
      sourceAmount: conversionResult.sourceAmount,
      convertedAmount: conversionResult.convertedAmount,
      fromCurrency: conversionResult.fromCurrency,
      toCurrency: conversionResult.toCurrency,
      exchangeRate: conversionResult.exchangeRate,
      timestamp: conversionResult.timestamp
    });
  }

  /**
   * Batch convert multiple amounts
   * @param {Array} conversions - Array of conversion requests
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Array of conversion results
   */
  async batchConvert(conversions, tenantId) {
    const results = [];
    
    for (const conversion of conversions) {
      try {
        const result = await this.convertCurrency(
          conversion.amount,
          conversion.fromCurrency,
          conversion.toCurrency,
          conversion.exchangeRate,
          tenantId
        );
        results.push({ success: true, data: result });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error.message,
          conversion 
        });
      }
    }

    return results;
  }

  /**
   * Get historical conversion rates
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<Array>} Historical rates
   */
  async getHistoricalRates(fromCurrency, toCurrency, startDate, endDate, tenantId) {
    try {
      const query = {
        fromCurrency,
        toCurrency,
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      };

      if (tenantId) {
        query.tenantId = tenantId;
      }

      const rates = await ExchangeRate.find(query)
        .sort({ createdAt: -1 })
        .lean();

      return rates.map(rate => ({
        rate: rate.rate,
        date: rate.createdAt,
        source: rate.source || 'manual',
        tenantId: rate.tenantId
      }));

    } catch (error) {
      logger.error('Historical rates lookup error:', error);
      throw error;
    }
  }
}

module.exports = new EnhancedCurrencyConversionService();