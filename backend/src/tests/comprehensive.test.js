const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Tenant = require('../models/tenants/Tenant');
const JournalEntry = require('../models/accounting/JournalEntry');

/**
 * Comprehensive Test Suite
 * Covers all critical functionality including security, multi-tenancy, and financial operations
 */
describe('Exchange Platform - Comprehensive Test Suite', () => {
  let testUser, testTenant, authToken;

  beforeAll(async () => {
    // Setup test database
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/exchange_test');
    
    // Create test tenant
    testTenant = await Tenant.create({
      name: 'Test Exchange',
      level: 'EXCHANGE',
      isActive: true,
      settings: {
        currency: 'IRR',
        timezone: 'Asia/Tehran'
      }
    });

    // Create test user
    testUser = await User.create({
      email: 'test@exchange.com',
      password: 'TestPassword123!',
      role: 'admin',
      tenantId: testTenant._id,
      isActive: true,
      permissions: ['read', 'write', 'admin']
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear test data
    await Transaction.deleteMany({});
    await JournalEntry.deleteMany({});
  });

  describe('🔐 Security Tests', () => {
    test('should reject requests without authentication', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .expect(401);

      expect(response.body.code).toBe('TOKEN_MISSING');
    });

    test('should reject invalid tokens', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.code).toBe('TOKEN_INVALID');
    });

    test('should enforce rate limiting', async () => {
      const promises = Array(150).fill().map(() => 
        request(app)
          .post('/api/auth/login')
          .send({ email: 'test@example.com', password: 'password' })
      );

      const responses = await Promise.all(promises);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    test('should validate input data', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          type: 'invalid_type'
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    test('should prevent SQL injection attempts', async () => {
      const maliciousInput = "'; DROP TABLE users; --";
      
      const response = await request(app)
        .get(`/api/transactions?search=${encodeURIComponent(maliciousInput)}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('🏢 Multi-Tenancy Tests', () => {
    let tenant1, tenant2, user1, user2;

    beforeEach(async () => {
      // Create two separate tenants
      tenant1 = await Tenant.create({
        name: 'Tenant 1',
        level: 'EXCHANGE',
        isActive: true
      });

      tenant2 = await Tenant.create({
        name: 'Tenant 2',
        level: 'EXCHANGE',
        isActive: true
      });

      // Create users for each tenant
      user1 = await User.create({
        email: 'user1@tenant1.com',
        password: 'Password123!',
        role: 'user',
        tenantId: tenant1._id,
        isActive: true
      });

      user2 = await User.create({
        email: 'user2@tenant2.com',
        password: 'Password123!',
        role: 'user',
        tenantId: tenant2._id,
        isActive: true
      });
    });

    test('should isolate tenant data', async () => {
      // Create transactions for different tenants
      await Transaction.create([
        {
          tenantId: tenant1._id,
          customerId: user1._id,
          type: 'currency_buy',
          amount: 1000,
          transactionId: 'TXN-001'
        },
        {
          tenantId: tenant2._id,
          customerId: user2._id,
          type: 'currency_sell',
          amount: 2000,
          transactionId: 'TXN-002'
        }
      ]);

      // User 1 should only see their tenant's transactions
      const response1 = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${await getAuthToken(user1)}`)
        .set('x-tenant-id', tenant1._id.toString())
        .expect(200);

      expect(response1.body.data).toHaveLength(1);
      expect(response1.body.data[0].transactionId).toBe('TXN-001');

      // User 2 should only see their tenant's transactions
      const response2 = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${await getAuthToken(user2)}`)
        .set('x-tenant-id', tenant2._id.toString())
        .expect(200);

      expect(response2.body.data).toHaveLength(1);
      expect(response2.body.data[0].transactionId).toBe('TXN-002');
    });

    test('should prevent cross-tenant access', async () => {
      // User 1 trying to access tenant 2's data
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${await getAuthToken(user1)}`)
        .set('x-tenant-id', tenant2._id.toString())
        .expect(403);

      expect(response.body.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    test('should handle inactive tenants', async () => {
      // Deactivate tenant
      await Tenant.findByIdAndUpdate(tenant1._id, { isActive: false });

      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${await getAuthToken(user1)}`)
        .set('x-tenant-id', tenant1._id.toString())
        .expect(403);

      expect(response.body.code).toBe('TENANT_INACTIVE');
    });
  });

  describe('💰 Financial & Accounting Tests', () => {
    test('should create proper double-entry journal entries', async () => {
      const transaction = await Transaction.create({
        tenantId: testTenant._id,
        customerId: testUser._id,
        type: 'currency_buy',
        amount: 1000000,
        exchangeRate: 50000,
        commission: 50000,
        transactionId: 'TXN-TEST-001'
      });

      // Create journal entry
      const journalEntry = await JournalEntry.create({
        tenantId: testTenant._id,
        transactionId: transaction._id,
        entryDate: new Date(),
        accountingPeriod: { year: 2024, month: 1 },
        description: 'Currency purchase transaction',
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

      expect(journalEntry.totalDebit).toBe(journalEntry.totalCredit);
      expect(journalEntry.status).toBe('draft');
    });

    test('should validate double-entry principle', async () => {
      const invalidEntry = new JournalEntry({
        tenantId: testTenant._id,
        transactionId: new mongoose.Types.ObjectId(),
        entryDate: new Date(),
        accountingPeriod: { year: 2024, month: 1 },
        description: 'Invalid entry',
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
            credit: 500000, // Mismatch - should be 1000000
            currency: 'IRR'
          }
        ],
        createdBy: testUser._id
      });

      await expect(invalidEntry.save()).rejects.toThrow('Debits must equal credits');
    });

    test('should calculate trial balance correctly', async () => {
      // Create multiple journal entries
      const entries = [
        {
          tenantId: testTenant._id,
          transactionId: new mongoose.Types.ObjectId(),
          entryDate: new Date(),
          accountingPeriod: { year: 2024, month: 1 },
          description: 'Opening balance',
          entryType: 'opening_balance',
          entries: [
            { accountCode: '1001', accountName: 'Cash', debit: 1000000, credit: 0 },
            { accountCode: '3001', accountName: 'Capital', debit: 0, credit: 1000000 }
          ],
          createdBy: testUser._id,
          status: 'posted'
        }
      ];

      await JournalEntry.insertMany(entries);

      const trialBalance = await JournalEntry.getTrialBalance(testTenant._id);
      
      expect(trialBalance).toBeDefined();
      expect(Array.isArray(trialBalance)).toBe(true);
    });
  });

  describe('📊 Performance Tests', () => {
    test('should handle large datasets efficiently', async () => {
      // Create 1000 test transactions
      const transactions = Array(1000).fill().map((_, index) => ({
        tenantId: testTenant._id,
        customerId: testUser._id,
        type: 'currency_buy',
        amount: 1000000 + index,
        transactionId: `TXN-PERF-${index}`,
        createdAt: new Date()
      }));

      const startTime = Date.now();
      await Transaction.insertMany(transactions);
      const insertTime = Date.now() - startTime;

      // Query should be fast
      const queryStartTime = Date.now();
      const result = await Transaction.find({ tenantId: testTenant._id })
        .limit(100)
        .lean();
      const queryTime = Date.now() - queryStartTime;

      expect(insertTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(queryTime).toBeLessThan(1000); // Should query within 1 second
      expect(result).toHaveLength(100);
    });

    test('should use proper database indexes', async () => {
      const indexes = await Transaction.collection.getIndexes();
      
      // Check for critical indexes
      expect(indexes['tenantId_1_createdAt_-1']).toBeDefined();
      expect(indexes['tenantId_1_status_1']).toBeDefined();
      expect(indexes['transactionId_1']).toBeDefined();
    });
  });

  describe('🔄 Integration Tests', () => {
    test('should complete full transaction workflow', async () => {
      // 1. Create transaction
      const transactionResponse = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .send({
          type: 'currency_buy',
          amount: 1000000,
          fromCurrency: 'IRR',
          toCurrency: 'USD',
          exchangeRate: 50000,
          paymentMethod: 'bank_transfer'
        })
        .expect(201);

      const transactionId = transactionResponse.body.data._id;

      // 2. Update transaction status
      await request(app)
        .patch(`/api/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .send({ status: 'completed' })
        .expect(200);

      // 3. Verify journal entry was created
      const journalEntry = await JournalEntry.findOne({ transactionId });
      expect(journalEntry).toBeDefined();
      expect(journalEntry.status).toBe('posted');
    });

    test('should handle concurrent transactions', async () => {
      const concurrentRequests = Array(10).fill().map((_, index) =>
        request(app)
          .post('/api/transactions')
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-tenant-id', testTenant._id.toString())
          .send({
            type: 'currency_buy',
            amount: 1000000 + index,
            fromCurrency: 'IRR',
            toCurrency: 'USD',
            exchangeRate: 50000,
            paymentMethod: 'bank_transfer'
          })
      );

      const responses = await Promise.all(concurrentRequests);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Verify all transactions were created
      const transactions = await Transaction.find({ tenantId: testTenant._id });
      expect(transactions).toHaveLength(10);
    });
  });
});

// Helper function to get auth token
async function getAuthToken(user) {
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      email: user.email,
      password: 'Password123!'
    });

  return response.body.token;
} 