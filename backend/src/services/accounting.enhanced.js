const Decimal = require('decimal.js');
const Dinero = require('dinero.js');
const accounting = require('accounting-js');
const moment = require('moment-jalaali');
const Transaction = require('../models/Transaction');
const { logger } = require('../utils/logger');

// Configure Decimal.js for high precision
Decimal.config({ precision: 28, rounding: 4 });

class EnhancedAccountingService {
  /**
   * Calculate profit and loss for a specific period
   * @param {string} tenantId - Tenant ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Decimal} Profit/Loss amount
   */
  static async calculateProfitLoss(tenantId, startDate, endDate) {
    try {
      const transactions = await Transaction.find({
        tenantId,
        createdAt: { $gte: startDate, $lte: endDate }
      }).lean();

      return transactions.reduce((acc, transaction) => {
        const amount = new Decimal(transaction.amount || 0);
        return transaction.type === 'income' || transaction.type === 'currency_sell'
          ? acc.plus(amount)
          : acc.minus(amount);
      }, new Decimal(0));
    } catch (error) {
      logger.error('Error calculating profit/loss:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive financial reports
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Report options
   * @returns {Object} Financial report data
   */
  static async generateFinancialReport(tenantId, options = {}) {
    try {
      const data = await this.gatherFinancialData(tenantId, options);
      
      return {
        balanceSheet: this.calculateBalanceSheet(data),
        incomeStatement: this.calculateIncomeStatement(data),
        cashFlow: this.calculateCashFlow(data),
        profitLoss: await this.calculateProfitLoss(
          tenantId, 
          options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          options.endDate || new Date()
        )
      };
    } catch (error) {
      logger.error('Error generating financial report:', error);
      throw error;
    }
  }

  /**
   * Gather financial data for reporting
   * @param {string} tenantId - Tenant ID
   * @param {Object} options - Query options
   * @returns {Object} Financial data
   */
  static async gatherFinancialData(tenantId, options) {
    const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = options.endDate || new Date();

    const transactions = await Transaction.find({
      tenantId,
      createdAt: { $gte: startDate, $lte: endDate }
    }).lean();

    return {
      transactions,
      startDate,
      endDate
    };
  }

  /**
   * Calculate balance sheet data
   * @param {Object} data - Financial data
   * @returns {Object} Balance sheet
   */
  static calculateBalanceSheet(data) {
    let assets = new Decimal(0);
    let liabilities = new Decimal(0);

    data.transactions.forEach(transaction => {
      const amount = new Decimal(transaction.amount || 0);
      
      if (transaction.type === 'currency_buy' || transaction.type === 'deposit') {
        assets = assets.plus(amount);
      } else if (transaction.type === 'currency_sell' || transaction.type === 'withdraw') {
        liabilities = liabilities.plus(amount);
      }
    });

    return {
      assets: assets.toNumber(),
      liabilities: liabilities.toNumber(),
      equity: assets.minus(liabilities).toNumber(),
      formattedAssets: this.formatCurrency(assets.toNumber()),
      formattedLiabilities: this.formatCurrency(liabilities.toNumber()),
      formattedEquity: this.formatCurrency(assets.minus(liabilities).toNumber())
    };
  }

  /**
   * Calculate income statement data
   * @param {Object} data - Financial data
   * @returns {Object} Income statement
   */
  static calculateIncomeStatement(data) {
    let revenue = new Decimal(0);
    let expenses = new Decimal(0);

    data.transactions.forEach(transaction => {
      const commission = new Decimal(transaction.commission || 0);
      
      if (transaction.type === 'currency_sell') {
        revenue = revenue.plus(commission);
      } else if (transaction.type === 'currency_buy') {
        expenses = expenses.plus(commission);
      }
    });

    const netIncome = revenue.minus(expenses);

    return {
      revenue: revenue.toNumber(),
      expenses: expenses.toNumber(),
      netIncome: netIncome.toNumber(),
      formattedRevenue: this.formatCurrency(revenue.toNumber()),
      formattedExpenses: this.formatCurrency(expenses.toNumber()),
      formattedNetIncome: this.formatCurrency(netIncome.toNumber())
    };
  }

  /**
   * Calculate cash flow data
   * @param {Object} data - Financial data
   * @returns {Object} Cash flow statement
   */
  static calculateCashFlow(data) {
    let operatingCashFlow = new Decimal(0);
    let investingCashFlow = new Decimal(0);
    let financingCashFlow = new Decimal(0);

    data.transactions.forEach(transaction => {
      const amount = new Decimal(transaction.amount || 0);
      
      switch (transaction.type) {
        case 'currency_buy':
        case 'currency_sell':
          operatingCashFlow = operatingCashFlow.plus(amount);
          break;
        case 'deposit':
          financingCashFlow = financingCashFlow.plus(amount);
          break;
        case 'withdraw':
          financingCashFlow = financingCashFlow.minus(amount);
          break;
      }
    });

    const netCashFlow = operatingCashFlow.plus(investingCashFlow).plus(financingCashFlow);

    return {
      operating: operatingCashFlow.toNumber(),
      investing: investingCashFlow.toNumber(),
      financing: financingCashFlow.toNumber(),
      net: netCashFlow.toNumber(),
      formattedOperating: this.formatCurrency(operatingCashFlow.toNumber()),
      formattedInvesting: this.formatCurrency(investingCashFlow.toNumber()),
      formattedFinancing: this.formatCurrency(financingCashFlow.toNumber()),
      formattedNet: this.formatCurrency(netCashFlow.toNumber())
    };
  }

  /**
   * Format currency using accounting.js
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency code
   * @returns {string} Formatted currency string
   */
  static formatCurrency(amount, currency = 'IRR') {
    const options = {
      symbol: currency === 'IRR' ? 'ریال' : 'درهم',
      precision: 2,
      thousand: ',',
      decimal: '.',
      format: '%v %s'
    };

    return accounting.formatMoney(amount, options);
  }

  /**
   * Convert amount using Dinero.js for precise currency operations
   * @param {number} amount - Amount to convert
   * @param {number} rate - Exchange rate
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @returns {Object} Converted amount with Dinero object
   */
  static convertCurrency(amount, rate, fromCurrency, toCurrency) {
    try {
      const sourceAmount = Dinero({ amount: Math.round(amount * 100), currency: fromCurrency });
      const convertedAmount = sourceAmount.multiply(rate);
      
      return {
        original: sourceAmount,
        converted: convertedAmount,
        formattedOriginal: this.formatCurrency(amount, fromCurrency),
        formattedConverted: this.formatCurrency(convertedAmount.getAmount() / 100, toCurrency)
      };
    } catch (error) {
      logger.error('Error converting currency:', error);
      throw error;
    }
  }

  /**
   * Calculate double-entry accounting entries
   * @param {Object} transaction - Transaction data
   * @returns {Array} Journal entries
   */
  static calculateDoubleEntryEntries(transaction) {
    const entries = [];
    const amount = new Decimal(transaction.amount || 0);

    switch (transaction.type) {
      case 'currency_buy':
        entries.push({
          account: 'cash',
          debit: amount,
          credit: new Decimal(0),
          description: `خرید ${transaction.currency_to}`
        });
        entries.push({
          account: 'currency_inventory',
          debit: new Decimal(0),
          credit: amount,
          description: `خرید ${transaction.currency_to}`
        });
        break;

      case 'currency_sell':
        entries.push({
          account: 'currency_inventory',
          debit: amount,
          credit: new Decimal(0),
          description: `فروش ${transaction.currency_from}`
        });
        entries.push({
          account: 'cash',
          debit: new Decimal(0),
          credit: amount,
          description: `فروش ${transaction.currency_from}`
        });
        break;
    }

    return entries;
  }

  /**
   * Format date using Persian calendar
   * @param {Date} date - Date to format
   * @returns {string} Formatted Persian date
   */
  static formatPersianDate(date) {
    return moment(date).format('jYYYY/jMM/jDD');
  }

  /**
   * Get current Persian date
   * @returns {string} Current Persian date
   */
  static getCurrentPersianDate() {
    return moment().format('jYYYY/jMM/jDD HH:mm:ss');
  }
}

module.exports = EnhancedAccountingService;