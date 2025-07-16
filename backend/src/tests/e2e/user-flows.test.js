const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');
const Tenant = require('../../models/tenants/Tenant');
const Transaction = require('../../models/Transaction');

/**
 * End-to-End Tests for Critical User Flows
 * Tests complete user journeys from registration to financial operations
 */
describe('User Flows - End-to-End Tests', () => {
  let testTenant, adminUser, customerUser;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/exchange_test');
    
    testTenant = await Tenant.create({
      name: 'E2E Test Tenant',
      level: 'EXCHANGE',
      isActive: true
    });

    adminUser = await User.create({
      email: 'admin@e2e.com',
      password: 'AdminPassword123!',
      role: 'admin',
      tenantId: testTenant._id,
      isActive: true
    });

    customerUser = await User.create({
      email: 'customer@e2e.com',
      password: 'CustomerPassword123!',
      role: 'customer',
      tenantId: testTenant._id,
      isActive: true
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Transaction.deleteMany({});
  });

  describe('👤 User Registration & Authentication Flow', () => {
    test('should complete full user registration flow', async () => {
      // Step 1: Register new user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@e2e.com',
          password: 'NewUserPassword123!',
          firstName: 'New',
          lastName: 'User',
          phone: '+989123456789',
          tenantId: testTenant._id.toString()
        })
        .expect(201);

      expect(registerResponse.body.user.email).to.equal('newuser@e2e.com');
      expect(registerResponse.body.token).to.exist;

      // Step 2: Login with new account
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'newuser@e2e.com',
          password: 'NewUserPassword123!'
        })
        .expect(200);

      expect(loginResponse.body.token).to.exist;
      expect(loginResponse.body.user.isActive).to.be.true;

      // Step 3: Access protected resources
      const profileResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .set('x-tenant-id', testTenant._id.toString())
        .expect(200);

      expect(profileResponse.body.user.email).to.equal('newuser@e2e.com');
    });

    test('should handle password reset flow', async () => {
      // Step 1: Request password reset
      const resetRequestResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'customer@e2e.com'
        })
        .expect(200);

      expect(resetRequestResponse.body.message).to.include('reset');

      // Step 2: Reset password (simulate with token)
      const resetResponse = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'test-reset-token',
          newPassword: 'NewPassword123!'
        })
        .expect(200);

      // Step 3: Login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'customer@e2e.com',
          password: 'NewPassword123!'
        })
        .expect(200);

      expect(loginResponse.body.token).to.exist;
    });
  });

  describe('💰 Currency Exchange Flow', () => {
    test('should complete full currency exchange flow', async () => {
      // Step 1: Customer login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'customer@e2e.com',
          password: 'CustomerPassword123!'
        });

      const customerToken = loginResponse.body.token;

      // Step 2: Get exchange rates
      const ratesResponse = await request(app)
        .get('/api/exchange/rates')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .expect(200);

      expect(ratesResponse.body.rates).to.be.an('array');

      // Step 3: Create currency exchange transaction
      const transactionResponse = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .send({
          type: 'currency_buy',
          fromCurrency: 'IRR',
          toCurrency: 'USD',
          amount: 1000000,
          exchangeRate: 50000,
          paymentMethod: 'bank_transfer',
          deliveryMethod: 'account_credit'
        })
        .expect(201);

      const transactionId = transactionResponse.body.data._id;

      // Step 4: Upload payment receipt
      const receiptResponse = await request(app)
        .post(`/api/transactions/${transactionId}/receipts`)
        .set('Authorization', `Bearer ${customerToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .attach('receipt', Buffer.from('fake-receipt'), 'receipt.jpg')
        .field('description', 'Payment receipt')
        .expect(201);

      expect(receiptResponse.body.receipt).to.exist;

      // Step 5: Admin approves transaction
      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@e2e.com',
          password: 'AdminPassword123!'
        });

      const adminToken = adminLoginResponse.body.token;

      const approveResponse = await request(app)
        .patch(`/api/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .send({ status: 'completed' })
        .expect(200);

      expect(approveResponse.body.data.status).to.equal('completed');

      // Step 6: Customer views transaction history
      const historyResponse = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${customerToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .expect(200);

      expect(historyResponse.body.data).to.have.length(1);
      expect(historyResponse.body.data[0].status).to.equal('completed');
    });

    test('should handle P2P trading flow', async () => {
      // Step 1: Create P2P announcement
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'customer@e2e.com',
          password: 'CustomerPassword123!'
        });

      const userToken = loginResponse.body.token;

      const announcementResponse = await request(app)
        .post('/api/p2p/announcements')
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .send({
          type: 'sell',
          fromCurrency: 'USD',
          toCurrency: 'IRR',
          amount: 100,
          price: 50000,
          paymentMethod: 'bank_transfer',
          deliveryMethod: 'account_credit',
          description: 'Selling USD for IRR'
        })
        .expect(201);

      const announcementId = announcementResponse.body.data._id;

      // Step 2: Another user finds and matches the announcement
      const buyerUser = await User.create({
        email: 'buyer@e2e.com',
        password: 'BuyerPassword123!',
        role: 'customer',
        tenantId: testTenant._id,
        isActive: true
      });

      const buyerLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'buyer@e2e.com',
          password: 'BuyerPassword123!'
        });

      const buyerToken = buyerLoginResponse.body.token;

      const matchResponse = await request(app)
        .post(`/api/p2p/announcements/${announcementId}/match`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .expect(201);

      expect(matchResponse.body.transaction).to.exist;
      expect(matchResponse.body.transaction.type).to.equal('p2p_exchange');
    });
  });

  describe('📊 Reporting & Analytics Flow', () => {
    beforeEach(async () => {
      // Create test transactions for reporting
      await Transaction.create([
        {
          tenantId: testTenant._id,
          customerId: customerUser._id,
          type: 'currency_buy',
          amount: 1000000,
          exchangeRate: 50000,
          commission: 50000,
          totalAmount: 1050000,
          status: 'completed',
          transactionId: 'TXN-E2E-001'
        },
        {
          tenantId: testTenant._id,
          customerId: customerUser._id,
          type: 'currency_sell',
          amount: 500000,
          exchangeRate: 52000,
          commission: 25000,
          totalAmount: 475000,
          status: 'completed',
          transactionId: 'TXN-E2E-002'
        }
      ]);
    });

    test('should generate comprehensive reports', async () => {
      // Admin login
      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@e2e.com',
          password: 'AdminPassword123!'
        });

      const adminToken = adminLoginResponse.body.token;

      // Step 1: Get financial summary
      const summaryResponse = await request(app)
        .get('/api/reports/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .expect(200);

      expect(summaryResponse.body.totalTransactions).to.equal(2);
      expect(summaryResponse.body.totalVolume).to.be.greaterThan(0);

      // Step 2: Get detailed financial report
      const financialResponse = await request(app)
        .get('/api/reports/financial')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .query({
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        })
        .expect(200);

      expect(financialResponse.body.balanceSheet).to.exist;
      expect(financialResponse.body.incomeStatement).to.exist;
      expect(financialResponse.body.cashFlow).to.exist;

      // Step 3: Get customer analytics
      const analyticsResponse = await request(app)
        .get('/api/reports/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .expect(200);

      expect(analyticsResponse.body.customerMetrics).to.exist;
      expect(analyticsResponse.body.transactionMetrics).to.exist;
    });

    test('should handle export functionality', async () => {
      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@e2e.com',
          password: 'AdminPassword123!'
        });

      const adminToken = adminLoginResponse.body.token;

      // Export transactions to CSV
      const exportResponse = await request(app)
        .get('/api/reports/export/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .query({ format: 'csv' })
        .expect(200);

      expect(exportResponse.headers['content-type']).to.include('text/csv');
      expect(exportResponse.body).to.include('transactionId,type,amount');
    });
  });

  describe('🔒 Security & Compliance Flow', () => {
    test('should handle KYC verification flow', async () => {
      // Step 1: Customer submits KYC documents
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'customer@e2e.com',
          password: 'CustomerPassword123!'
        });

      const userToken = loginResponse.body.token;

      const kycResponse = await request(app)
        .post('/api/users/kyc')
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .attach('idDocument', Buffer.from('fake-id-document'), 'id.jpg')
        .attach('proofOfAddress', Buffer.from('fake-address-document'), 'address.pdf')
        .field('nationalId', '1234567890')
        .field('dateOfBirth', '1990-01-01')
        .expect(201);

      expect(kycResponse.body.status).to.equal('pending');

      // Step 2: Admin reviews KYC
      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@e2e.com',
          password: 'AdminPassword123!'
        });

      const adminToken = adminLoginResponse.body.token;

      const reviewResponse = await request(app)
        .patch('/api/users/kyc/review')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .send({
          userId: customerUser._id,
          status: 'approved',
          notes: 'Documents verified successfully'
        })
        .expect(200);

      expect(reviewResponse.body.status).to.equal('approved');
    });

    test('should handle audit trail', async () => {
      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@e2e.com',
          password: 'AdminPassword123!'
        });

      const adminToken = adminLoginResponse.body.token;

      // Create a transaction to generate audit trail
      const transactionResponse = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
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

      // Get audit trail
      const auditResponse = await request(app)
        .get('/api/audit/trail')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .expect(200);

      expect(auditResponse.body.auditLogs).to.be.an('array');
      expect(auditResponse.body.auditLogs.length).to.be.greaterThan(0);
    });
  });

  describe('📱 Mobile & API Integration Flow', () => {
    test('should handle mobile app authentication', async () => {
      // Step 1: Mobile app login
      const mobileLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'customer@e2e.com',
          password: 'CustomerPassword123!',
          deviceId: 'mobile-device-123',
          platform: 'ios'
        })
        .expect(200);

      expect(mobileLoginResponse.body.token).to.exist;
      expect(mobileLoginResponse.body.refreshToken).to.exist;

      // Step 2: Refresh token
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: mobileLoginResponse.body.refreshToken
        })
        .expect(200);

      expect(refreshResponse.body.token).to.exist;

      // Step 3: Mobile app gets user data
      const userDataResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${refreshResponse.body.token}`)
        .set('x-tenant-id', testTenant._id.toString())
        .set('User-Agent', 'ExchangeApp/1.0 iOS')
        .expect(200);

      expect(userDataResponse.body.user).to.exist;
    });

    test('should handle real-time notifications', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'customer@e2e.com',
          password: 'CustomerPassword123!'
        });

      const userToken = loginResponse.body.token;

      // Subscribe to notifications
      const subscribeResponse = await request(app)
        .post('/api/notifications/subscribe')
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .send({
          type: 'transaction_updates',
          channel: 'email'
        })
        .expect(200);

      expect(subscribeResponse.body.subscription).to.exist;

      // Create transaction to trigger notification
      await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${userToken}`)
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

      // Check notifications
      const notificationsResponse = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .expect(200);

      expect(notificationsResponse.body.notifications).to.be.an('array');
    });
  });

  describe('🔄 Error Recovery Flow', () => {
    test('should handle network failures gracefully', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'customer@e2e.com',
          password: 'CustomerPassword123!'
        });

      const userToken = loginResponse.body.token;

      // Simulate network timeout
      const timeoutResponse = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .timeout(100) // Very short timeout
        .catch(err => err.response);

      expect(timeoutResponse.status).to.equal(408);
    });

    test('should handle session expiration', async () => {
      // Create expired token
      const expiredToken = 'expired.jwt.token';

      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${expiredToken}`)
        .set('x-tenant-id', testTenant._id.toString())
        .expect(401);

      expect(response.body.code).to.equal('TOKEN_EXPIRED');
    });
  });
}); 