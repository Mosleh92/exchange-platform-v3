const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const moment = require('moment');

class TaxReportingService {
  constructor() {
    this.taxRates = {
      US: { shortTerm: 0.15, longTerm: 0.10, threshold: 50000 },
      UK: { shortTerm: 0.20, longTerm: 0.10, threshold: 50000 },
      CA: { shortTerm: 0.25, longTerm: 0.15, threshold: 50000 },
      EU: { shortTerm: 0.20, longTerm: 0.10, threshold: 50000 }
    };
  }

  async generateTaxReport(userId, year, jurisdiction = 'US') {
    try {
      const startDate = moment(`${year}-01-01`).startOf('year');
      const endDate = moment(`${year}-12-31`).endOf('year');

      // Get all transactions for the year
      const transactions = await Transaction.find({
        userId,
        createdAt: { $gte: startDate.toDate(), $lte: endDate.toDate() },
        status: 'completed'
      }).populate('currency');

      // Calculate realized gains/losses
      const realizedGains = this.calculateRealizedGains(transactions);
      
      // Calculate unrealized gains/losses
      const unrealizedGains = await this.calculateUnrealizedGains(userId, endDate);
      
      // Calculate tax liability
      const taxLiability = this.calculateTaxLiability(realizedGains, jurisdiction);
      
      // Generate tax report
      const taxReport = {
        userId,
        year,
        jurisdiction,
        realizedGains,
        unrealizedGains,
        taxLiability,
        transactions: transactions.length,
        reportDate: new Date(),
        breakdown: this.generateTaxBreakdown(transactions, jurisdiction)
      };

      return taxReport;
    } catch (error) {
      throw new Error(`Tax report generation failed: ${error.message}`);
    }
  }

  calculateRealizedGains(transactions) {
    const gains = {
      shortTerm: 0,
      longTerm: 0,
      total: 0,
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

    // Calculate gains for each asset
    Object.keys(assetGroups).forEach(asset => {
      const assetTxs = assetGroups[asset].sort((a, b) => a.createdAt - b.createdAt);
      let costBasis = 0;
      let totalQuantity = 0;

      assetTxs.forEach(tx => {
        if (tx.type === 'buy') {
          costBasis += tx.amount * tx.rate;
          totalQuantity += tx.amount;
        } else if (tx.type === 'sell') {
          const avgCost = costBasis / totalQuantity;
          const gain = (tx.rate - avgCost) * tx.amount;
          
          const holdingPeriod = moment(tx.createdAt).diff(moment(assetTxs[0].createdAt), 'days');
          const isLongTerm = holdingPeriod > 365;

          if (isLongTerm) {
            gains.longTerm += gain;
          } else {
            gains.shortTerm += gain;
          }

          gains.total += gain;
          gains.details.push({
            asset,
            gain,
            holdingPeriod,
            isLongTerm,
            date: tx.createdAt
          });

          // Update cost basis
          costBasis -= avgCost * tx.amount;
          totalQuantity -= tx.amount;
        }
      });
    });

    return gains;
  }

  async calculateUnrealizedGains(userId, asOfDate) {
    try {
      // Get current holdings
      const accounts = await Account.find({ userId, type: 'crypto' });
      
      let totalUnrealizedGain = 0;
      const holdings = [];

      for (const account of accounts) {
        if (account.balance > 0) {
          // Get average purchase price
          const buyTransactions = await Transaction.find({
            userId,
            currency: account.currency,
            type: 'buy',
            status: 'completed'
          });

          if (buyTransactions.length > 0) {
            const totalCost = buyTransactions.reduce((sum, tx) => sum + (tx.amount * tx.rate), 0);
            const totalQuantity = buyTransactions.reduce((sum, tx) => sum + tx.amount, 0);
            const avgCost = totalCost / totalQuantity;

            // Get current market price (this would need to be implemented)
            const currentPrice = await this.getCurrentPrice(account.currency);
            
            const unrealizedGain = (currentPrice - avgCost) * account.balance;
            totalUnrealizedGain += unrealizedGain;

            holdings.push({
              currency: account.currency,
              quantity: account.balance,
              avgCost,
              currentPrice,
              unrealizedGain
            });
          }
        }
      }

      return {
        total: totalUnrealizedGain,
        holdings
      };
    } catch (error) {
      throw new Error(`Unrealized gains calculation failed: ${error.message}`);
    }
  }

  calculateTaxLiability(gains, jurisdiction) {
    const rates = this.taxRates[jurisdiction] || this.taxRates.US;
    
    const shortTermTax = Math.max(0, gains.shortTerm) * rates.shortTerm;
    const longTermTax = Math.max(0, gains.longTerm) * rates.longTerm;
    
    return {
      shortTerm: shortTermTax,
      longTerm: longTermTax,
      total: shortTermTax + longTermTax,
      effectiveRate: gains.total > 0 ? (shortTermTax + longTermTax) / gains.total : 0
    };
  }

  generateTaxBreakdown(transactions, jurisdiction) {
    const breakdown = {
      byMonth: {},
      byAsset: {},
      byTransactionType: {},
      summary: {
        totalTransactions: transactions.length,
        totalVolume: 0,
        totalFees: 0
      }
    };

    transactions.forEach(tx => {
      const month = moment(tx.createdAt).format('YYYY-MM');
      const asset = tx.currency;
      const type = tx.type;

      // Monthly breakdown
      if (!breakdown.byMonth[month]) {
        breakdown.byMonth[month] = { volume: 0, count: 0 };
      }
      breakdown.byMonth[month].volume += tx.amount * tx.rate;
      breakdown.byMonth[month].count++;

      // Asset breakdown
      if (!breakdown.byAsset[asset]) {
        breakdown.byAsset[asset] = { volume: 0, count: 0 };
      }
      breakdown.byAsset[asset].volume += tx.amount * tx.rate;
      breakdown.byAsset[asset].count++;

      // Transaction type breakdown
      if (!breakdown.byTransactionType[type]) {
        breakdown.byTransactionType[type] = { volume: 0, count: 0 };
      }
      breakdown.byTransactionType[type].volume += tx.amount * tx.rate;
      breakdown.byTransactionType[type].count++;

      // Summary
      breakdown.summary.totalVolume += tx.amount * tx.rate;
      breakdown.summary.totalFees += tx.fee || 0;
    });

    return breakdown;
  }

  async getCurrentPrice(currency) {
    // This would integrate with external price feeds
    // For now, return a mock price
    const mockPrices = {
      BTC: 45000,
      ETH: 3000,
      USDT: 1,
      BNB: 300
    };
    return mockPrices[currency] || 100;
  }

  async generateTaxForms(userId, year, jurisdiction) {
    const taxReport = await this.generateTaxReport(userId, year, jurisdiction);
    
    // Generate different tax forms based on jurisdiction
    const forms = {
      US: this.generateUSForms(taxReport),
      UK: this.generateUKForms(taxReport),
      CA: this.generateCAForms(taxReport)
    };

    return forms[jurisdiction] || forms.US;
  }

  generateUSForms(taxReport) {
    return {
      form8949: {
        shortTerm: taxReport.realizedGains.details.filter(d => !d.isLongTerm),
        longTerm: taxReport.realizedGains.details.filter(d => d.isLongTerm)
      },
      scheduleD: {
        shortTermGains: taxReport.realizedGains.shortTerm,
        longTermGains: taxReport.realizedGains.longTerm,
        totalGains: taxReport.realizedGains.total
      },
      form1040: {
        totalIncome: taxReport.realizedGains.total,
        taxLiability: taxReport.taxLiability.total
      }
    };
  }

  generateUKForms(taxReport) {
    return {
      sa108: {
        totalGains: taxReport.realizedGains.total,
        taxLiability: taxReport.taxLiability.total
      }
    };
  }

  generateCAForms(taxReport) {
    return {
      t5008: {
        totalGains: taxReport.realizedGains.total,
        taxLiability: taxReport.taxLiability.total
      }
    };
  }
}

module.exports = new TaxReportingService(); 