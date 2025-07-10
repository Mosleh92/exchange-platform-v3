const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');
const Tenant = require('../../models/tenants/Tenant');
const Transaction = require('../../models/Transaction');

/**
 * Comprehensive Integration Tests for API Endpoints
 * Tests all critical API functionality with proper authentication and authorization
 */
describe('API Integration Tests', () => {
  let testTenant, adminUser, regularUser, authToken;

  beforeAll(async () => {
    // Setup test database
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/exchange_test');
    
    // Create test tenant
    testTenant = await Tenant.create({
      name: 'Test API Tenant',
      level: 'EXCHANGE',
      isActive: true
    });

    // Create admin user
    adminUser = await User.create({
      email: 'admin@test.com',
      password: 'AdminPassword123!',
      role: 'admin',
      tenantId: testTenant._id,
      isActive: true,
      permissions: ['read', 'write', 'admin']
    });

    // Create regular user
    regularUser = await User.create({
      email: 'user@test.com',
      password: 'UserPassword123!',
      role: 'user',
      tenantId: testTenant._id,
      isActive: true,
      permissions: ['read', 'write']
    });

    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'AdminPassword123!'
      });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear test data
    await Transaction.deleteMany({});
  });

  describe('🔐 Authentication & Authorization', () => {
    test('should authenticate user with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'AdminPassword123!'
        })
        .expect(200);

      expect(response.body.token).to.exist;
      expect(response.body.user).to.exist;
      expect(response.body.user.email).to.equal('admin@test.com');
    });

    test('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.code).to.equal('AUTH_ERROR');
    });

    test('should require authentication for protected routes', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .expect(401);

      expect(response.body.code).to.equal('TOKEN_MISSING');
    });

    test('should enforce role-based access control', async () => {
      // Admin should have access
      const adminResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .expect(200);

      expect(adminResponse.body).to.exist;

      // Regular user should not have admin access
      const userLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@test.com',
          password: 'UserPassword123!'
        });

      const userResponse = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userLoginResponse.body.token}`)
        .set('x-tenant-id', testTenant._id.toString())
        .expect(403);

      expect(userResponse.body.code).to.equal('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('🏢 Multi-tenancy API', () => {
    let tenant2, user2;

    beforeAll(async () => {
      // Create second tenant
      tenant2 = await Tenant.create({
        name: 'Test API Tenant 2',
        level: 'EXCHANGE',
        isActive: true
      });

      user2 = await User.create({
        email: 'user2@test.com',
        password: 'UserPassword123!',
        role: 'user',
        tenantId: tenant2._id,
        isActive: true
      });
    });

    test('should isolate tenant data', async () => {
      // Create transactions for different tenants
      await Transaction.create([
        {
          tenantId: testTenant._id,
          customerId: adminUser._id,
          type: 'currency_buy',
          amount: 1000000,
          exchangeRate: 50000,
          totalAmount: 1000000,
          transactionId: 'TXN-TENANT-1'
        },
        {
          tenantId: tenant2._id,
          customerId: user2._id,
          type: 'currency_sell',
          amount: 2000000,
          exchangeRate: 52000,
          totalAmount: 2000000,
          transactionId: 'TXN-TENANT-2'
        }
      ]);

      // User from tenant 1 should only see tenant 1 data
      const response1 = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .expect(200);

      expect(response1.body.data).to.have.length(1);
      expect(response1.body.data[0].transactionId).to.equal('TXN-TENANT-1');

      // User from tenant 2 should only see tenant 2 data
      const user2LoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user2@test.com',
          password: 'UserPassword123!'
        });

      const response2 = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${user2LoginResponse.body.token}`)
        .set('x-tenant-id', tenant2._id.toString())
        .expect(200);

      expect(response2.body.data).to.have.length(1);
      expect(response2.body.data[0].transactionId).to.equal('TXN-TENANT-2');
    });

    test('should prevent cross-tenant access', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', tenant2._id.toString()) // Wrong tenant
        .expect(403);

      expect(response.body.code).to.equal('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('💰 Transaction API', () => {
    test('should create transaction successfully', async () => {
      const transactionData = {
        type: 'currency_buy',
        fromCurrency: 'IRR',
        toCurrency: 'USD',
        amount: 1000000,
        exchangeRate: 50000,
        paymentMethod: 'bank_transfer',
        deliveryMethod: 'account_credit'
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .send(transactionData)
        .expect(201);

      expect(response.body.data.transactionId).to.exist;
      expect(response.body.data.type).to.equal('currency_buy');
      expect(response.body.data.status).to.equal('pending');
    });

    test('should validate transaction data', async () => {
      const invalidTransaction = {
        type: 'invalid_type',
        amount: -1000 // Invalid negative amount
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .send(invalidTransaction)
        .expect(400);

      expect(response.body.code).to.equal('VALIDATION_ERROR');
    });

    test('should update transaction status', async () => {
      // Create transaction
      const createResponse = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .send({
          type: 'currency_buy',
          fromCurrency: 'IRR',
          toCurrency: 'USD',
          amount: 1000000,
          exchangeRate: 50000,
          paymentMethod: 'bank_transfer',
          deliveryMethod: 'account_credit'
        });

      const transactionId = createResponse.body.data._id;

      // Update status
      const updateResponse = await request(app)
        .patch(`/api/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .send({ status: 'completed' })
        .expect(200);

      expect(updateResponse.body.data.status).to.equal('completed');
    });

    test('should list transactions with pagination', async () => {
      // Create multiple transactions
      const transactions = Array(5).fill().map((_, index) => ({
        type: 'currency_buy',
        fromCurrency: 'IRR',
        toCurrency: 'USD',
        amount: 1000000 + index * 100000,
        exchangeRate: 50000,
        paymentMethod: 'bank_transfer',
        deliveryMethod: 'account_credit'
      }));

      for (const transaction of transactions) {
        await request(app)
          .post('/api/transactions')
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-tenant-id', testTenant._id.toString())
          .send(transaction);
      }

      // Test pagination
      const response = await request(app)
        .get('/api/transactions?page=1&limit=3')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .expect(200);

      expect(response.body.data).to.have.length(3);
      expect(response.body.pagination).to.exist;
      expect(response.body.pagination.total).to.equal(5);
    });
  });

  describe('📊 Reporting API', () => {
    beforeEach(async () => {
      // Create test transactions for reporting
      await Transaction.create([
        {
          tenantId: testTenant._id,
          customerId: adminUser._id,
          type: 'currency_buy',
          amount: 1000000,
          exchangeRate: 50000,
          commission: 50000,
          totalAmount: 1050000,
          status: 'completed',
          transactionId: 'TXN-REPORT-001'
        },
        {
          tenantId: testTenant._id,
          customerId: adminUser._id,
          type: 'currency_sell',
          amount: 500000,
          exchangeRate: 52000,
          commission: 25000,
          totalAmount: 475000,
          status: 'completed',
          transactionId: 'TXN-REPORT-002'
        }
      ]);
    });

    test('should generate financial reports', async () => {
      const response = await request(app)
        .get('/api/reports/financial')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .query({
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        })
        .expect(200);

      expect(response.body.balanceSheet).to.exist;
      expect(response.body.incomeStatement).to.exist;
      expect(response.body.cashFlow).to.exist;
    });

    test('should generate transaction reports', async () => {
      const response = await request(app)
        .get('/api/reports/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .expect(200);

      expect(response.body.data).to.be.an('array');
      expect(response.body.summary).to.exist;
    });
  });

  describe('🔒 Security API', () => {
    test('should enforce rate limiting', async () => {
      const requests = Array(150).fill().map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'password'
          })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    test('should validate input data', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .send({
          type: 'invalid_type',
          amount: 'not_a_number'
        })
        .expect(400);

      expect(response.body.code).to.equal('VALIDATION_ERROR');
    });

    test('should prevent SQL injection', async () => {
      const maliciousInput = "'; DROP TABLE users; --";
      
      const response = await request(app)
        .get(`/api/transactions?search=${encodeURIComponent(maliciousInput)}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .expect(400);

      expect(response.body.code).to.equal('VALIDATION_ERROR');
    });
  });

  describe('📈 Performance API', () => {
    test('should handle concurrent requests', async () => {
      const concurrentRequests = Array(50).fill().map(() =>
        request(app)
          .get('/api/transactions')
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-tenant-id', testTenant._id.toString())
      );

      const startTime = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const endTime = Date.now();

      const successfulRequests = responses.filter(r => r.status === 200);
      const averageResponseTime = (endTime - startTime) / responses.length;

      expect(successfulRequests.length).to.be.greaterThan(45); // 90% success rate
      expect(averageResponseTime).to.be.lessThan(1000); // Less than 1 second average
    });

    test('should handle large datasets', async () => {
      // Create 100 test transactions
      const transactions = Array(100).fill().map((_, index) => ({
        tenantId: testTenant._id,
        customerId: adminUser._id,
        type: 'currency_buy',
        amount: 1000000 + index,
        exchangeRate: 50000,
        totalAmount: 1000000 + index,
        transactionId: `TXN-PERF-${index}`,
        status: 'completed'
      }));

      await Transaction.insertMany(transactions);

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/transactions?limit=100')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.data).to.have.length(100);
      expect(responseTime).to.be.lessThan(2000); // Less than 2 seconds
    });
  });

  describe('🔄 Error Handling API', () => {
    test('should handle database errors gracefully', async () => {
      // Test with invalid ObjectId
      const response = await request(app)
        .get('/api/transactions/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .expect(400);

      expect(response.body.code).to.equal('INVALID_ID');
    });

    test('should handle missing resources', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/transactions/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .expect(404);

      expect(response.body.code).to.equal('RESOURCE_NOT_FOUND');
    });

    test('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .send({}) // Empty data
        .expect(400);

      expect(response.body.code).to.equal('VALIDATION_ERROR');
      expect(response.body.details).to.be.an('array');
    });
  });
}); 