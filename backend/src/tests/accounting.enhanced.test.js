const Decimal = require('decimal.js');

// Mock the logger and Transaction model since we're testing in isolation
jest.mock('../utils/logger', () => ({
  error: jest.fn()
}));

jest.mock('../models/Transaction', () => ({
  find: jest.fn().mockReturnValue({
    lean: jest.fn().mockResolvedValue([])
  })
}));

const EnhancedAccountingService = require('../services/accounting.enhanced');

describe('EnhancedAccountingService', () => {
  describe('formatCurrency', () => {
    it('should format IRR currency correctly', () => {
      const formatted = EnhancedAccountingService.formatCurrency(1000000, 'IRR');
      expect(formatted).toContain('ریال');
      expect(formatted).toContain('1,000,000.00');
    });

    it('should format AED currency correctly', () => {
      const formatted = EnhancedAccountingService.formatCurrency(1000, 'AED');
      expect(formatted).toContain('درهم');
      expect(formatted).toContain('1,000.00');
    });
  });

  describe('formatPersianDate', () => {
    it('should format date in Persian calendar', () => {
      const date = new Date('2024-01-01');
      const formatted = EnhancedAccountingService.formatPersianDate(date);
      expect(formatted).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
    });
  });

  describe('calculateDoubleEntryEntries', () => {
    it('should create correct entries for currency buy', () => {
      const transaction = {
        type: 'currency_buy',
        amount: 1000,
        currency_to: 'AED'
      };

      const entries = EnhancedAccountingService.calculateDoubleEntryEntries(transaction);
      
      expect(entries).toHaveLength(2);
      expect(entries[0].account).toBe('cash');
      expect(entries[1].account).toBe('currency_inventory');
      expect(entries[0].debit.toNumber()).toBe(1000);
      expect(entries[1].credit.toNumber()).toBe(1000);
    });

    it('should create correct entries for currency sell', () => {
      const transaction = {
        type: 'currency_sell',
        amount: 1000,
        currency_from: 'AED'
      };

      const entries = EnhancedAccountingService.calculateDoubleEntryEntries(transaction);
      
      expect(entries).toHaveLength(2);
      expect(entries[0].account).toBe('currency_inventory');
      expect(entries[1].account).toBe('cash');
      expect(entries[0].debit.toNumber()).toBe(1000);
      expect(entries[1].credit.toNumber()).toBe(1000);
    });
  });

  describe('convertCurrency', () => {
    it('should convert currency with correct precision', () => {
      const result = EnhancedAccountingService.convertCurrency(1000, 0.25, 'IRR', 'AED');
      
      expect(result.original).toBeDefined();
      expect(result.converted).toBeDefined();
      expect(result.formattedOriginal).toContain('ریال');
      expect(result.formattedConverted).toContain('درهم');
    });
  });

  describe('calculateBalanceSheet', () => {
    it('should calculate balance sheet correctly', () => {
      const data = {
        transactions: [
          { type: 'currency_buy', amount: 1000 },
          { type: 'currency_sell', amount: 500 },
          { type: 'deposit', amount: 200 }
        ]
      };

      const result = EnhancedAccountingService.calculateBalanceSheet(data);
      
      expect(result.assets).toBe(1200); // 1000 + 200
      expect(result.liabilities).toBe(500);
      expect(result.equity).toBe(700); // 1200 - 500
      expect(result.formattedAssets).toContain('ریال');
    });
  });

  describe('calculateIncomeStatement', () => {
    it('should calculate income statement correctly', () => {
      const data = {
        transactions: [
          { type: 'currency_sell', commission: 100 },
          { type: 'currency_buy', commission: 50 },
          { type: 'currency_sell', commission: 75 }
        ]
      };

      const result = EnhancedAccountingService.calculateIncomeStatement(data);
      
      expect(result.revenue).toBe(175); // 100 + 75
      expect(result.expenses).toBe(50);
      expect(result.netIncome).toBe(125); // 175 - 50
    });
  });
});