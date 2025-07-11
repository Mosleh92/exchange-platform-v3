const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Account = require('../../src/models/Account');
const Transaction = require('../../src/models/Transaction');
const P2PTransaction = require('../../src/models/p2p/P2PTransaction');
const P2PPayment = require('../../src/models/p2p/P2PPayment');
const User = require('../../src/models/User');
const Tenant = require('../../src/models/tenants/Tenant');

describe('Critical Security Integration Tests', () => {
  let user1Token, user2Token, adminToken;
  let user1, user2, admin;
  let tenant1, tenant2;
  let account1, account2;
  let p2pTransaction;

  beforeAll(async () => {
    // Create test tenants
    tenant1 = await Tenant.create({
      name: 'Test Tenant 1',
      level: 1,
      isActive: true
    });

    tenant2 = await Tenant.create({
      name: 'Test Tenant 2',
      level: 1,
      isActive: true
    });

    // Create test users
    user1 = await User.create({
      email: 'user1@test.com',
      password: 'User123!',
      role: 'customer',
      tenantId: tenant1._id,
      isActive: true
    });

    user2 = await User.create({
      email: 'user2@test.com',
      password: 'User123!',
      role: 'customer',
      tenantId: tenant2._id,
      isActive: true
    });

    admin = await User.create({
      email: 'admin@test.com',
      password: 'Admin123!',
      role: 'admin',
      tenantId: tenant1._id,
      isActive: true
    });

    // Create test accounts
    account1 = await Account.create({
      userId: user1._id,
      tenantId: tenant1._id,
      currency: 'USD',
      balance: 1000
    });

    account2 = await Account.create({
      userId: user2._id,
      tenantId: tenant2._id,
      currency: 'EUR',
      balance: 2000
    });

    // Get authentication tokens
    user1Token = await getAuthToken(user1.email, 'User123!');
    user2Token = await getAuthToken(user2.email, 'User123!');
    adminToken = await getAuthToken(admin.email, 'Admin123!');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  describe('Data Isolation Tests', () => {
    test('Users cannot access accounts from other tenants', async () => {
      // User1 tries to access User2's account
      const response = await request(app)
        .get(`/api/v1/accounts/${account2._id}/balance`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Access denied');
    });

    test('Users cannot modify accounts from other tenants', async () => {
      // User1 tries to modify User2's account
      const response = await request(app)
        .put(`/api/v1/accounts/${account2._id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          balance: 5000
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Access denied');
    });

    test('Users cannot see transactions from other tenants', async () => {
      // Create transaction for user2
      await Transaction.create({
        userId: user2._id,
        tenantId: tenant2._id,
        amount: 500,
        currency: 'EUR',
        transactionType: 'EXCHANGE',
        status: 'COMPLETED'
      });

      // User1 tries to access transactions
      const response = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(200);
      
      // Should only see their own transactions
      const transactions = response.body;
      transactions.forEach(transaction => {
        expect(transaction.tenantId).toBe(tenant1._id.toString());
      });
    });
  });

  describe('P2P Payment Security Tests', () => {
    beforeEach(async () => {
      // Create P2P transaction
      p2pTransaction = await P2PTransaction.create({
        sellerId: user1._id,
        buyerId: user2._id,
        amount: 100,
        currency: 'USD',
        status: 'PENDING_PAYMENT',
        tenantId: tenant1._id
      });
    });

    test('Users cannot upload payment proof for other users transactions', async () => {
      // User1 tries to upload payment for User2's transaction
      const response = await request(app)
        .post(`/api/v1/p2p/transactions/${p2pTransaction._id}/payments`)
        .set('Authorization', `Bearer ${user1Token}`)
        .field('accountNumber', '123456789')
        .field('amount', '100')
        .attach('proofs', Buffer.from('fake image'), 'proof.jpg');

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('You can only upload payments for your own transactions');
    });

    test('Users cannot confirm payments for other users transactions', async () => {
      // Create payment for the transaction
      const payment = await P2PPayment.create({
        p2pTransactionId: p2pTransaction._id,
        accountNumber: '123456789',
        amount: 100,
        status: 'PENDING'
      });

      // User1 (seller) tries to confirm payment for User2's transaction
      const response = await request(app)
        .post(`/api/v1/p2p/transactions/${p2pTransaction._id}/payments/${payment._id}/confirm`)
        .set('Authorization', `Bearer ${user2Token}`); // User2 is not the seller

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Only the seller can confirm payments');
    });

    test('Payment proof files are validated', async () => {
      // User2 tries to upload invalid file type
      const response = await request(app)
        .post(`/api/v1/p2p/transactions/${p2pTransaction._id}/payments`)
        .set('Authorization', `Bearer ${user2Token}`)
        .field('accountNumber', '123456789')
        .field('amount', '100')
        .attach('proofs', Buffer.from('fake executable'), 'malware.exe');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid file type');
    });

    test('Payment proof file size is limited', async () => {
      // Create large file buffer (11MB)
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);

      const response = await request(app)
        .post(`/api/v1/p2p/transactions/${p2pTransaction._id}/payments`)
        .set('Authorization', `Bearer ${user2Token}`)
        .field('accountNumber', '123456789')
        .field('amount', '100')
        .attach('proofs', largeBuffer, 'large-file.jpg');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('File size too large');
    });
  });

  describe('Race Condition Tests', () => {
    test('Concurrent currency exchanges are handled safely', async () => {
      // Create account with initial balance
      const testAccount = await Account.create({
        userId: user1._id,
        tenantId: tenant1._id,
        currency: 'USD',
        balance: 1000
      });

      // Simulate concurrent exchange requests
      const exchangeRequests = Array(10).fill().map((_, index) => 
        request(app)
          .post('/api/v1/currency/exchange')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            fromAccountId: testAccount._id,
            toAccountId: testAccount._id, // Same account for testing
            amount: 10,
            fromCurrency: 'USD',
            toCurrency: 'IRR',
            exchangeRate: 1.5
          })
      );

      // Execute all requests concurrently
      const responses = await Promise.all(exchangeRequests);

      // Check that all requests were processed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify final balance is correct
      const finalAccount = await Account.findById(testAccount._id);
      expect(finalAccount.balance).toBe(1000); // Should not be negative
    });

    test('Concurrent balance updates are atomic', async () => {
      const testAccount = await Account.create({
        userId: user1._id,
        tenantId: tenant1._id,
        currency: 'USD',
        balance: 100
      });

      // Simulate concurrent balance updates
      const updateRequests = Array(5).fill().map((_, index) =>
        request(app)
          .put(`/api/v1/accounts/${testAccount._id}/balance`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            amount: 10,
            operation: 'DEBIT'
          })
      );

      const responses = await Promise.all(updateRequests);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Final balance should be correct
      const finalAccount = await Account.findById(testAccount._id);
      expect(finalAccount.balance).toBe(50); // 100 - (5 * 10)
    });
  });

  describe('Audit Logging Tests', () => {
    test('Financial transactions are properly logged', async () => {
      const response = await request(app)
        .post('/api/v1/currency/exchange')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          fromAccountId: account1._id,
          toAccountId: account1._id,
          amount: 50,
          fromCurrency: 'USD',
          toCurrency: 'IRR',
          exchangeRate: 1.5
        });

      expect(response.status).toBe(200);

      // Check audit logs
      const auditResponse = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          eventType: 'CURRENCY_EXCHANGE_COMPLETED',
          userId: user1._id
        });

      expect(auditResponse.status).toBe(200);
      expect(auditResponse.body.logs.length).toBeGreaterThan(0);
    });

    test('P2P transactions are properly logged', async () => {
      const response = await request(app)
        .post('/api/v1/p2p/transactions')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          sellerId: user1._id,
          buyerId: user2._id,
          amount: 100,
          currency: 'USD',
          paymentMethod: 'BANK_TRANSFER'
        });

      expect(response.status).toBe(201);

      // Check audit logs
      const auditResponse = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          eventType: 'P2P_TRANSACTION_CREATED',
          userId: user1._id
        });

      expect(auditResponse.status).toBe(200);
      expect(auditResponse.body.logs.length).toBeGreaterThan(0);
    });
  });

  describe('Tenant Hierarchy Tests', () => {
    test('Users cannot access data from sibling tenants', async () => {
      // Create sibling tenants
      const parentTenant = await Tenant.create({
        name: 'Parent Tenant',
        level: 1,
        isActive: true
      });

      const sibling1 = await Tenant.create({
        name: 'Sibling 1',
        level: 2,
        parent: parentTenant._id,
        isActive: true
      });

      const sibling2 = await Tenant.create({
        name: 'Sibling 2',
        level: 2,
        parent: parentTenant._id,
        isActive: true
      });

      // Create user in sibling1
      const sibling1User = await User.create({
        email: 'sibling1@test.com',
        password: 'User123!',
        role: 'customer',
        tenantId: sibling1._id,
        isActive: true
      });

      const sibling1Token = await getAuthToken(sibling1User.email, 'User123!');

      // Create account in sibling2
      const sibling2Account = await Account.create({
        userId: user2._id,
        tenantId: sibling2._id,
        currency: 'USD',
        balance: 1000
      });

      // Sibling1 user tries to access Sibling2 account
      const response = await request(app)
        .get(`/api/v1/accounts/${sibling2Account._id}/balance`)
        .set('Authorization', `Bearer ${sibling1Token}`);

      expect(response.status).toBe(403);
    });

    test('Parent tenants can access child tenant data', async () => {
      // Create parent-child relationship
      const parentTenant = await Tenant.create({
        name: 'Parent Tenant',
        level: 1,
        isActive: true
      });

      const childTenant = await Tenant.create({
        name: 'Child Tenant',
        level: 2,
        parent: parentTenant._id,
        isActive: true
      });

      // Create parent admin user
      const parentAdmin = await User.create({
        email: 'parentadmin@test.com',
        password: 'Admin123!',
        role: 'admin',
        tenantId: parentTenant._id,
        isActive: true
      });

      const parentAdminToken = await getAuthToken(parentAdmin.email, 'Admin123!');

      // Create account in child tenant
      const childAccount = await Account.create({
        userId: user1._id,
        tenantId: childTenant._id,
        currency: 'USD',
        balance: 1000
      });

      // Parent admin should be able to access child account
      const response = await request(app)
        .get(`/api/v1/accounts/${childAccount._id}/balance`)
        .set('Authorization', `Bearer ${parentAdminToken}`);

      expect(response.status).toBe(200);
    });
  });

  // Helper function to get authentication token
  async function getAuthToken(email, password) {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password });
    
    return response.body.token;
  }
}); 