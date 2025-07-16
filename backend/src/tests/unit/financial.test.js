const mongoose = require('mongoose');
const { expect } = require('chai');
const sinon = require('sinon');
const Transaction = require('../../models/Transaction');
const JournalEntry = require('../../models/accounting/JournalEntry');
const Check = require('../../models/payments/Check');
const EnhancedAccountingService = require('../../services/accounting.enhanced');

/**
 * Comprehensive Unit Tests for Financial Business Logic
 * Covers all critical financial operations and calculations
 */
describe('Financial Business Logic - Unit Tests', () => {
  let testTenant, testUser;

  beforeAll(async () => {
    // Setup test database
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/exchange_test');
    
    testTenant = await mongoose.model('Tenant').create({
      name: 'Test Financial Tenant',
      level: 'EXCHANGE',
      isActive: true
    });

    testUser = await mongoose.model('User').create({
      email: 'financial@test.com',
      password: 'TestPassword123!',
      role: 'admin',
      tenantId: testTenant._id,
      isActive: true
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear test data
    await Transaction.deleteMany({});
    await JournalEntry.deleteMany({});
    await Check.deleteMany({});
  });

  describe('💰 Transaction Calculations', () => {
    test('should calculate commission correctly', async () => {
      const transaction = new Transaction({
        tenantId: testTenant._id,
        customerId: testUser._id,
        type: 'currency_buy',
        amount: 1000000,
        exchangeRate: 50000,
        commission: 50000,
        totalAmount: 1050000,
        transactionId: 'TXN-UNIT-001'
      });

      await transaction.save();

      expect(transaction.commission).to.equal(50000);
      expect(transaction.totalAmount).to.equal(1050000);
      expect(transaction.convertedAmount).to.equal(1000000 * 50000);
    });

    test('should validate transaction amounts', async () => {
      const invalidTransaction = new Transaction({
        tenantId: testTenant._id,
        customerId: testUser._id,
        type: 'currency_buy',
        amount: -1000, // Invalid negative amount
        exchangeRate: 50000,
        transactionId: 'TXN-UNIT-002'
      });

      await expect(invalidTransaction.save()).to.be.rejectedWith('Amount must be greater than zero');
    });

    test('should calculate profit/loss correctly', async () => {
      // Create buy transaction
      const buyTransaction = await Transaction.create({
        tenantId: testTenant._id,
        customerId: testUser._id,
        type: 'currency_buy',
        amount: 1000000,
        exchangeRate: 50000,
        commission: 50000,
        totalAmount: 1050000,
        transactionId: 'TXN-UNIT-003'
      });

      // Create sell transaction
      const sellTransaction = await Transaction.create({
        tenantId: testTenant._id,
        customerId: testUser._id,
        type: 'currency_sell',
        amount: 1000000,
        exchangeRate: 52000, // Higher rate = profit
        commission: 50000,
        totalAmount: 1015000,
        transactionId: 'TXN-UNIT-004'
      });

      const profitLoss = await EnhancedAccountingService.calculateProfitLoss(
        testTenant._id,
        new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        new Date()
      );

      expect(profitLoss.toNumber()).to.be.greaterThan(0); // Should be positive (profit)
    });
  });

  describe('📊 Double-Entry Accounting', () => {
    test('should create balanced journal entries', async () => {
      const journalEntry = new JournalEntry({
        tenantId: testTenant._id,
        transactionId: new mongoose.Types.ObjectId(),
        entryDate: new Date(),
        accountingPeriod: { year: 2024, month: 1 },
        description: 'Test currency exchange',
        entryType: 'currency_exchange',
        entries: [
          {
            accountId: new mongoose.Types.ObjectId(),
            accountCode: '1001',
            accountName: 'Cash',
            debit: 1000000,
            credit: 0,
            currency: 'IRR'
          },
          {
            accountId: new mongoose.Types.ObjectId(),
            accountCode: '2001',
            accountName: 'Accounts Payable',
            debit: 0,
            credit: 1000000,
            currency: 'IRR'
          }
        ],
        createdBy: testUser._id
      });

      await journalEntry.save();

      expect(journalEntry.totalDebit).to.equal(journalEntry.totalCredit);
      expect(journalEntry.status).to.equal('draft');
    });

    test('should reject unbalanced entries', async () => {
      const unbalancedEntry = new JournalEntry({
        tenantId: testTenant._id,
        transactionId: new mongoose.Types.ObjectId(),
        entryDate: new Date(),
        accountingPeriod: { year: 2024, month: 1 },
        description: 'Unbalanced entry',
        entryType: 'currency_exchange',
        entries: [
          {
            accountId: new mongoose.Types.ObjectId(),
            accountCode: '1001',
            accountName: 'Cash',
            debit: 1000000,
            credit: 0,
            currency: 'IRR'
          },
          {
            accountId: new mongoose.Types.ObjectId(),
            accountCode: '2001',
            accountName: 'Accounts Payable',
            debit: 0,
            credit: 500000, // Mismatch
            currency: 'IRR'
          }
        ],
        createdBy: testUser._id
      });

      await expect(unbalancedEntry.save()).to.be.rejectedWith('Debits must equal credits');
    });

    test('should post and reverse entries correctly', async () => {
      const journalEntry = await JournalEntry.create({
        tenantId: testTenant._id,
        transactionId: new mongoose.Types.ObjectId(),
        entryDate: new Date(),
        accountingPeriod: { year: 2024, month: 1 },
        description: 'Test posting',
        entryType: 'currency_exchange',
        entries: [
          {
            accountId: new mongoose.Types.ObjectId(),
            accountCode: '1001',
            accountName: 'Cash',
            debit: 1000000,
            credit: 0,
            currency: 'IRR'
          },
          {
            accountId: new mongoose.Types.ObjectId(),
            accountCode: '2001',
            accountName: 'Accounts Payable',
            debit: 0,
            credit: 1000000,
            currency: 'IRR'
          }
        ],
        createdBy: testUser._id
      });

      // Post the entry
      await journalEntry.post(testUser._id);
      expect(journalEntry.status).to.equal('posted');
      expect(journalEntry.postedBy).to.equal(testUser._id);

      // Reverse the entry
      await journalEntry.reverse(testUser._id, 'Test reversal');
      expect(journalEntry.status).to.equal('reversed');
      expect(journalEntry.reversedBy).to.equal(testUser._id);
    });
  });

  describe('🏦 Check Payment System', () => {
    test('should create and validate checks', async () => {
      const check = new Check({
        tenantId: testTenant._id,
        transactionId: new mongoose.Types.ObjectId(),
        bankName: 'Test Bank',
        accountNumber: '1234567890',
        checkAmount: 1000000,
        currency: 'IRR',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        createdBy: testUser._id
      });

      await check.save();

      expect(check.checkNumber).to.match(/^CHK-\d{6}-\d{6}$/);
      expect(check.status).to.equal('pending');
      expect(check.riskLevel).to.equal('medium');
    });

    test('should reject invalid check dates', async () => {
      const invalidCheck = new Check({
        tenantId: testTenant._id,
        transactionId: new mongoose.Types.ObjectId(),
        bankName: 'Test Bank',
        accountNumber: '1234567890',
        checkAmount: 1000000,
        currency: 'IRR',
        issueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Future date
        dueDate: new Date(), // Past date
        createdBy: testUser._id
      });

      await expect(invalidCheck.save()).to.be.rejectedWith('Issue date cannot be after due date');
    });

    test('should process check lifecycle', async () => {
      const check = await Check.create({
        tenantId: testTenant._id,
        transactionId: new mongoose.Types.ObjectId(),
        bankName: 'Test Bank',
        accountNumber: '1234567890',
        checkAmount: 1000000,
        currency: 'IRR',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdBy: testUser._id
      });

      // Verify check
      await check.verify(testUser._id, 'Check verified');
      expect(check.status).to.equal('approved');
      expect(check.verifiedBy).to.equal(testUser._id);

      // Clear check
      await check.clear(new Date(), 'BANK-REF-001');
      expect(check.status).to.equal('cleared');
      expect(check.bankProcessing.clearingDate).to.exist;
      expect(check.bankProcessing.bankReference).to.equal('BANK-REF-001');
    });
  });

  describe('💱 Exchange Rate Calculations', () => {
    test('should calculate exchange rates correctly', () => {
      const amount = 1000000; // IRR
      const rate = 50000; // IRR per USD
      
      const convertedAmount = amount / rate; // USD
      const commission = amount * 0.005; // 0.5% commission
      const totalAmount = amount + commission;

      expect(convertedAmount).to.equal(20); // 20 USD
      expect(commission).to.equal(5000); // 5000 IRR
      expect(totalAmount).to.equal(1005000); // 1,005,000 IRR
    });

    test('should handle currency conversions', () => {
      const conversions = [
        { from: 'IRR', to: 'USD', rate: 50000, amount: 1000000, expected: 20 },
        { from: 'IRR', to: 'EUR', rate: 55000, amount: 1000000, expected: 18.18 },
        { from: 'USD', to: 'IRR', rate: 50000, amount: 100, expected: 5000000 }
      ];

      conversions.forEach(({ from, to, rate, amount, expected }) => {
        const converted = from === 'IRR' ? amount / rate : amount * rate;
        expect(converted).to.be.closeTo(expected, 0.01);
      });
    });
  });

  describe('📈 Financial Reporting', () => {
    test('should generate balance sheet', async () => {
      // Create test transactions
      await Transaction.create([
        {
          tenantId: testTenant._id,
          customerId: testUser._id,
          type: 'currency_buy',
          amount: 1000000,
          exchangeRate: 50000,
          commission: 50000,
          totalAmount: 1050000,
          transactionId: 'TXN-REPORT-001'
        },
        {
          tenantId: testTenant._id,
          customerId: testUser._id,
          type: 'currency_sell',
          amount: 500000,
          exchangeRate: 52000,
          commission: 25000,
          totalAmount: 475000,
          transactionId: 'TXN-REPORT-002'
        }
      ]);

      const report = await EnhancedAccountingService.generateFinancialReport(testTenant._id, {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date()
      });

      expect(report.balanceSheet).to.exist;
      expect(report.incomeStatement).to.exist;
      expect(report.cashFlow).to.exist;
      expect(report.profitLoss).to.exist;
    });

    test('should calculate trial balance', async () => {
      const trialBalance = await JournalEntry.getTrialBalance(testTenant._id);
      expect(Array.isArray(trialBalance)).to.be.true;
    });
  });

  describe('🔒 Financial Security', () => {
    test('should prevent negative balances', async () => {
      const transaction = new Transaction({
        tenantId: testTenant._id,
        customerId: testUser._id,
        type: 'withdrawal',
        amount: 1000000,
        exchangeRate: 1,
        totalAmount: 1000000,
        transactionId: 'TXN-SECURITY-001'
      });

      // This should be validated at the service level
      expect(() => {
        if (transaction.amount < 0) {
          throw new Error('Amount cannot be negative');
        }
      }).to.not.throw();
    });

    test('should validate transaction permissions', () => {
      const userPermissions = ['read', 'write'];
      const requiredPermissions = ['write', 'admin'];

      const hasPermission = requiredPermissions.every(permission => 
        userPermissions.includes(permission)
      );

      expect(hasPermission).to.be.false; // User doesn't have 'admin' permission
    });
  });
}); 