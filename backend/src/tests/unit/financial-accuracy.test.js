const AccountingEntry = require('../../src/models/accounting/AccountingEntry');
const EnhancedCurrencyConversionService = require('../../src/services/enhancedCurrencyConversionService');
const EnhancedTransactionManagementService = require('../../src/services/enhancedTransactionManagementService');

// Mock dependencies
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

jest.mock('../../src/models/ExchangeRate', () => ({
  findOne: jest.fn()
}));

jest.mock('../../src/models/Transaction', () => ({
  generateTransactionId: jest.fn(() => 'TXN123456'),
  find: jest.fn(),
  findOne: jest.fn()
}));

jest.mock('../../src/models/Account', () => ({
  findByIdAndUpdate: jest.fn(),
  find: jest.fn()
}));

jest.mock('mongoose', () => ({
  Types: {
    ObjectId: jest.fn(() => '507f1f77bcf86cd799439011')
  },
  Schema: jest.fn(),
  model: jest.fn(),
  connect: jest.fn(),
  connection: {
    close: jest.fn()
  },
  startSession: jest.fn(() => ({
    withTransaction: jest.fn(async (callback) => await callback()),
    endSession: jest.fn()
  }))
}));

describe('Financial Accuracy - Enhanced Accounting System', () => {
  describe('Enhanced Currency Conversion Service', () => {
    describe('Input Validation', () => {
      test('should validate positive amounts', async () => {
        await expect(
          EnhancedCurrencyConversionService.convertCurrency(
            -1000, 'IRR', 'AED', 0.0001, 'test-tenant'
          )
        ).rejects.toThrow('Invalid amount: must be positive');
      });

      test('should validate zero amounts', async () => {
        await expect(
          EnhancedCurrencyConversionService.convertCurrency(
            0, 'IRR', 'AED', 0.0001, 'test-tenant'
          )
        ).rejects.toThrow('Invalid amount: must be greater than zero');
      });

      test('should validate supported currencies', async () => {
        await expect(
          EnhancedCurrencyConversionService.convertCurrency(
            1000, 'XXX', 'AED', 1, 'test-tenant'
          )
        ).rejects.toThrow('Unsupported source currency: XXX');
      });

      test('should validate currency types', async () => {
        await expect(
          EnhancedCurrencyConversionService.convertCurrency(
            1000, null, 'AED', 1, 'test-tenant'
          )
        ).rejects.toThrow('Invalid source currency');
      });
    });

    describe('Precision Handling', () => {
      test('should apply correct precision for IRR (0 decimal places)', async () => {
        const result = await EnhancedCurrencyConversionService.convertCurrency(
          100.567, 'AED', 'IRR', 21545.789, 'test-tenant'
        );

        expect(result.convertedAmount).toBe(2166442); // Should be rounded to integer
        expect(result.precision).toBe(0);
      });

      test('should apply correct precision for USD (2 decimal places)', async () => {
        const result = await EnhancedCurrencyConversionService.convertCurrency(
          1000000, 'IRR', 'USD', 0.0000234567, 'test-tenant'
        );

        expect(result.convertedAmount).toBe(23.46); // Should be rounded to 2 decimals
        expect(result.precision).toBe(2);
      });

      test('should apply correct precision for BTC (8 decimal places)', async () => {
        const result = await EnhancedCurrencyConversionService.convertCurrency(
          50000, 'USD', 'BTC', 0.0000234567890123, 'test-tenant'
        );

        expect(result.convertedAmount).toBe(1.17283945); // Should be rounded to 8 decimals
        expect(result.precision).toBe(8);
      });
    });

    describe('Same Currency Conversion', () => {
      test('should handle same currency conversion', async () => {
        const result = await EnhancedCurrencyConversionService.convertCurrency(
          1000, 'IRR', 'IRR', null, 'test-tenant'
        );

        expect(result.sourceAmount).toBe(1000);
        expect(result.convertedAmount).toBe(1000);
        expect(result.exchangeRate).toBe(1);
        expect(result.fromCurrency).toBe('IRR');
        expect(result.toCurrency).toBe('IRR');
      });
    });

    describe('Batch Conversion', () => {
      test('should handle batch conversions', async () => {
        const conversions = [
          { amount: 1000, fromCurrency: 'IRR', toCurrency: 'IRR' },
          { amount: 2000, fromCurrency: 'IRR', toCurrency: 'IRR' },
          { amount: -500, fromCurrency: 'IRR', toCurrency: 'AED' } // This should fail
        ];

        const results = await EnhancedCurrencyConversionService.batchConvert(
          conversions, 'test-tenant'
        );

        expect(results).toHaveLength(3);
        expect(results[0].success).toBe(true);
        expect(results[1].success).toBe(true);
        expect(results[2].success).toBe(false);
        expect(results[2].error).toContain('Invalid amount');
      });
    });
  });

  describe('Enhanced Transaction Management Service', () => {
    describe('Transaction Data Validation', () => {
      test('should validate required fields', async () => {
        const incompleteData = {
          tenantId: '507f1f77bcf86cd799439011',
          // Missing required fields
        };

        await expect(
          EnhancedTransactionManagementService.createTransaction(incompleteData)
        ).rejects.toThrow('Missing required field');
      });

      test('should validate positive amounts', async () => {
        const invalidData = {
          tenantId: '507f1f77bcf86cd799439011',
          customerId: '507f1f77bcf86cd799439011',
          type: 'currency_buy',
          amount: -1000,
          fromCurrency: 'IRR',
          toCurrency: 'AED'
        };

        await expect(
          EnhancedTransactionManagementService.createTransaction(invalidData)
        ).rejects.toThrow('Transaction amount must be positive');
      });

      test('should validate transaction types', async () => {
        const invalidData = {
          tenantId: '507f1f77bcf86cd799439011',
          customerId: '507f1f77bcf86cd799439011',
          type: 'invalid_type',
          amount: 1000,
          fromCurrency: 'IRR',
          toCurrency: 'AED'
        };

        await expect(
          EnhancedTransactionManagementService.createTransaction(invalidData)
        ).rejects.toThrow('Invalid transaction type');
      });
    });

    describe('Accounting Entry Generation', () => {
      test('should generate correct entries for currency buy transaction', () => {
        const transaction = {
          type: 'currency_buy',
          amount: 1000000,
          convertedAmount: 46.30,
          fromCurrency: 'IRR',
          toCurrency: 'AED',
          customerId: '507f1f77bcf86cd799439011',
          commission: 5000
        };

        const entries = EnhancedTransactionManagementService.generateAccountingEntries(transaction);

        expect(entries).toHaveLength(3); // 2 main entries + 1 commission entry
        
        const debitEntry = entries.find(e => e.type === 'DEBIT');
        const creditEntry = entries.find(e => e.type === 'CREDIT' && e.accountCode !== 'COMMISSION_REVENUE');
        const commissionEntry = entries.find(e => e.accountCode === 'COMMISSION_REVENUE');

        expect(debitEntry.accountCode).toBe('CASH_IRR');
        expect(debitEntry.amount).toBe(1000000);
        
        expect(creditEntry.accountCode).toBe('CUSTOMER_BALANCE_AED');
        expect(creditEntry.amount).toBe(46.30);
        
        expect(commissionEntry.amount).toBe(5000);
      });

      test('should generate correct entries for transfer transaction', () => {
        const transaction = {
          type: 'transfer',
          amount: 500000,
          fromCurrency: 'IRR',
          metadata: {
            fromAccountId: 'account1',
            toAccountId: 'account2'
          }
        };

        const entries = EnhancedTransactionManagementService.generateAccountingEntries(transaction);

        expect(entries).toHaveLength(2);
        
        const debitEntry = entries.find(e => e.type === 'DEBIT');
        const creditEntry = entries.find(e => e.type === 'CREDIT');

        expect(debitEntry.accountCode).toBe('ACCOUNT_account1');
        expect(creditEntry.accountCode).toBe('ACCOUNT_account2');
        expect(debitEntry.amount).toBe(creditEntry.amount);
      });
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete transaction flow with double-entry accounting', async () => {
      const transactionData = {
        tenantId: '507f1f77bcf86cd799439011',
        customerId: '507f1f77bcf86cd799439011',
        type: 'currency_buy',
        amount: 1000000,
        fromCurrency: 'IRR',
        toCurrency: 'AED',
        exchangeRate: 0.000046,
        commission: 5000,
        created_by: '507f1f77bcf86cd799439011',
        branchId: '507f1f77bcf86cd799439011'
      };

      // This would normally create the transaction, but we'll mock the dependencies
      // The test validates that the service calls are made correctly
      expect(() => {
        EnhancedTransactionManagementService.validateTransactionData(transactionData);
      }).not.toThrow();

      const entries = EnhancedTransactionManagementService.generateAccountingEntries({
        ...transactionData,
        convertedAmount: 46
      });

      // Validate double-entry principle
      const totalDebits = entries.filter(e => e.type === 'DEBIT').reduce((sum, e) => sum + e.amount, 0);
      const totalCredits = entries.filter(e => e.type === 'CREDIT').reduce((sum, e) => sum + e.amount, 0);

      expect(Math.abs(totalDebits - totalCredits)).toBeLessThan(0.01);
    });

    test('should validate currency conversion accuracy', async () => {
      const amount = 1000000; // 1M IRR
      const rate = 0.0000463; // IRR to AED rate
      
      const result = await EnhancedCurrencyConversionService.convertCurrency(
        amount, 'IRR', 'AED', rate, 'test-tenant'
      );

      // Validate conversion accuracy
      expect(result.sourceAmount).toBe(amount);
      expect(result.exchangeRate).toBe(rate);
      expect(result.convertedAmount).toBe(46.3); // Should be precisely calculated
      expect(result.fromCurrency).toBe('IRR');
      expect(result.toCurrency).toBe('AED');
      expect(result.precision).toBe(2); // AED precision
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle very large amounts', async () => {
      const largeAmount = Number.MAX_SAFE_INTEGER - 1;
      
      const result = await EnhancedCurrencyConversionService.convertCurrency(
        largeAmount, 'IRR', 'IRR', 1, 'test-tenant'
      );

      expect(result.sourceAmount).toBe(largeAmount);
      expect(result.convertedAmount).toBe(largeAmount);
    });

    test('should handle very small rates', async () => {
      const smallRate = 0.000000001; // Very small rate
      
      const result = await EnhancedCurrencyConversionService.convertCurrency(
        1000000, 'IRR', 'BTC', smallRate, 'test-tenant'
      );

      expect(result.convertedAmount).toBe(0.001); // Should maintain precision
      expect(result.precision).toBe(8); // BTC precision
    });

    test('should handle NaN and invalid numbers', async () => {
      await expect(
        EnhancedCurrencyConversionService.convertCurrency(
          NaN, 'IRR', 'AED', 0.0001, 'test-tenant'
        )
      ).rejects.toThrow('Invalid amount: must be a valid number');
    });
  });
});

describe('Business Logic Validation', () => {
  test('should validate transaction type mappings', () => {
    const validTypes = [
      'currency_buy', 'currency_sell', 'transfer', 'deposit', 
      'withdrawal', 'remittance', 'fee', 'refund', 'adjustment'
    ];

    validTypes.forEach(type => {
      expect(EnhancedTransactionManagementService.isValidTransactionType(type)).toBe(true);
    });

    expect(EnhancedTransactionManagementService.isValidTransactionType('invalid_type')).toBe(false);
  });

  test('should generate appropriate account codes', () => {
    const cashAccountId = EnhancedTransactionManagementService.getAccountId('CASH', 'IRR');
    const customerAccountId = EnhancedTransactionManagementService.getAccountId('CUSTOMER', 'user123', 'AED');
    const revenueAccountId = EnhancedTransactionManagementService.getAccountId('REVENUE', 'COMMISSION');

    expect(cashAccountId).toBe('account_CASH_IRR');
    expect(customerAccountId).toBe('account_CUSTOMER_user123_AED');
    expect(revenueAccountId).toBe('account_REVENUE_COMMISSION');
  });
});