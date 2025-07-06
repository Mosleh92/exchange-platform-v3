const request = require('supertest');
const app = require('../../server');
const User = require('../../models/User');
const Tenant = require('../../models/Tenant');
const Transaction = require('../../models/Transaction');
const Payment = require('../../models/Payment');
const Account = require('../../models/Account');

describe('Payment Integration Tests', () => {
  let tenant1, tenant2;
  let user1, user2;
  let account1, account2;
  let token1, token2;

  beforeEach(async () => {
    // Create test tenants
    tenant1 = await global.testUtils.createTestTenant({
      name: 'Exchange 1',
      code: 'EX1'
    });

    tenant2 = await global.testUtils.createTestTenant({
      name: 'Exchange 2',
      code: 'EX2'
    });

    // Create test users
    user1 = await global.testUtils.createTestUser({
      tenantId: tenant1._id,
      role: 'tenant_admin',
      status: 'active'
    });

    user2 = await global.testUtils.createTestUser({
      tenantId: tenant2._id,
      role: 'tenant_admin',
      status: 'active'
    });

    // Create test accounts
    account1 = await Account.create({
      tenantId: tenant1._id,
      userId: user1._id,
      accountNumber: 'ACC001',
      accountType: 'current',
      currency: 'USD',
      balance: 10000,
      status: 'active'
    });

    account2 = await Account.create({
      tenantId: tenant2._id,
      userId: user2._id,
      accountNumber: 'ACC002',
      accountType: 'current',
      currency: 'USD',
      balance: 5000,
      status: 'active'
    });

    // Generate tokens
    token1 = global.testUtils.generateTestToken({
      userId: user1._id,
      tenantId: tenant1._id,
      role: 'tenant_admin'
    });

    token2 = global.testUtils.generateTestToken({
      userId: user2._id,
      tenantId: tenant2._id,
      role: 'tenant_admin'
    });
  });

  describe('Payment Creation', () => {
    it('should create payment within same tenant', async () => {
      const paymentData = {
        tenantId: tenant1._id,
        fromAccountId: account1._id,
        amount: 1000,
        currency: 'USD',
        description: 'Test payment',
        type: 'transfer'
      };

      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token1}`)
        .send(paymentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.payment).toBeDefined();
      expect(response.body.data.payment.tenantId).toBe(tenant1._id.toString());
      expect(response.body.data.payment.status).toBe('pending');

      // Verify payment was created in database
      const payment = await Payment.findById(response.body.data.payment.id);
      expect(payment).toBeTruthy();
      expect(payment.tenantId.toString()).toBe(tenant1._id.toString());
    });

    it('should not allow payment to different tenant account', async () => {
      const paymentData = {
        tenantId: tenant1._id,
        fromAccountId: account1._id,
        toAccountId: account2._id, // Different tenant account
        amount: 1000,
        currency: 'USD',
        description: 'Cross-tenant payment attempt',
        type: 'transfer'
      };

      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token1}`)
        .send(paymentData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('دسترسی');
    });

    it('should validate payment amount against account balance', async () => {
      const paymentData = {
        tenantId: tenant1._id,
        fromAccountId: account1._id,
        amount: 15000, // More than account balance
        currency: 'USD',
        description: 'Insufficient funds payment',
        type: 'transfer'
      };

      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token1}`)
        .send(paymentData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('موجودی');
    });

    it('should reject payment with invalid currency', async () => {
      const paymentData = {
        tenantId: tenant1._id,
        fromAccountId: account1._id,
        amount: 1000,
        currency: 'INVALID',
        description: 'Invalid currency payment',
        type: 'transfer'
      };

      const response = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${token1}`)
        .send(paymentData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('ارز');
    });

    it('should require authentication for payment creation', async () => {
      const paymentData = {
        tenantId: tenant1._id,
        fromAccountId: account1._id,
        amount: 1000,
        currency: 'USD',
        type: 'transfer'
      };

      const response = await request(app)
        .post('/api/payments')
        .send(paymentData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Payment Processing', () => {
    let testPayment;

    beforeEach(async () => {
      testPayment = await Payment.create({
        tenantId: tenant1._id,
        fromAccountId: account1._id,
        amount: 1000,
        currency: 'USD',
        description: 'Test payment for processing',
        type: 'transfer',
        status: 'pending'
      });
    });

    it('should process payment successfully', async () => {
      const response = await request(app)
        .patch(`/api/payments/${testPayment._id}/process`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ action: 'approve' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.payment.status).toBe('processed');

      // Verify account balance was updated
      const updatedAccount = await Account.findById(account1._id);
      expect(updatedAccount.balance).toBe(9000); // 10000 - 1000
    });

    it('should not allow processing payment from different tenant', async () => {
      const response = await request(app)
        .patch(`/api/payments/${testPayment._id}/process`)
        .set('Authorization', `Bearer ${token2}`) // Different tenant user
        .send({ action: 'approve' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should reject payment successfully', async () => {
      const response = await request(app)
        .patch(`/api/payments/${testPayment._id}/process`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ 
          action: 'reject',
          reason: 'Suspicious transaction'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.payment.status).toBe('rejected');

      // Verify account balance was not changed
      const updatedAccount = await Account.findById(account1._id);
      expect(updatedAccount.balance).toBe(10000); // Original balance
    });

    it('should not allow processing already processed payment', async () => {
      // Process payment first
      await Payment.findByIdAndUpdate(testPayment._id, { status: 'processed' });

      const response = await request(app)
        .patch(`/api/payments/${testPayment._id}/process`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ action: 'approve' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('پردازش');
    });
  });

  describe('Payment Queries with Tenant Isolation', () => {
    let payment1, payment2;

    beforeEach(async () => {
      // Create payments for different tenants
      payment1 = await Payment.create({
        tenantId: tenant1._id,
        fromAccountId: account1._id,
        amount: 1000,
        currency: 'USD',
        description: 'Payment for tenant 1',
        type: 'transfer',
        status: 'pending'
      });

      payment2 = await Payment.create({
        tenantId: tenant2._id,
        fromAccountId: account2._id,
        amount: 500,
        currency: 'USD',
        description: 'Payment for tenant 2',
        type: 'transfer',
        status: 'pending'
      });
    });

    it('should return only tenant-specific payments in list', async () => {
      const response = await request(app)
        .get('/api/payments')
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.payments).toHaveLength(1);
      expect(response.body.data.payments[0].tenantId).toBe(tenant1._id.toString());
      expect(response.body.data.payments[0].id).toBe(payment1._id.toString());
    });

    it('should return specific payment only if belongs to tenant', async () => {
      const response = await request(app)
        .get(`/api/payments/${payment1._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.payment.id).toBe(payment1._id.toString());
    });

    it('should not return payment from different tenant', async () => {
      const response = await request(app)
        .get(`/api/payments/${payment2._id}`)
        .set('Authorization', `Bearer ${token1}`); // Tenant 1 trying to access Tenant 2's payment

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should filter payments by date range within tenant', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app)
        .get('/api/payments')
        .query({
          startDate: new Date().toISOString(),
          endDate: tomorrow.toISOString()
        })
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.payments).toHaveLength(1);
      expect(response.body.data.payments[0].tenantId).toBe(tenant1._id.toString());
    });
  });

  describe('Payment Statistics', () => {
    beforeEach(async () => {
      // Create multiple payments for statistics
      await Payment.create([
        {
          tenantId: tenant1._id,
          fromAccountId: account1._id,
          amount: 1000,
          currency: 'USD',
          type: 'transfer',
          status: 'processed'
        },
        {
          tenantId: tenant1._id,
          fromAccountId: account1._id,
          amount: 2000,
          currency: 'USD',
          type: 'exchange',
          status: 'processed'
        },
        {
          tenantId: tenant2._id,
          fromAccountId: account2._id,
          amount: 1500,
          currency: 'USD',
          type: 'transfer',
          status: 'processed'
        }
      ]);
    });

    it('should return tenant-specific payment statistics', async () => {
      const response = await request(app)
        .get('/api/payments/statistics')
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.statistics).toBeDefined();
      expect(response.body.data.statistics.totalAmount).toBe(3000); // Only tenant 1 payments
      expect(response.body.data.statistics.totalCount).toBe(2);
    });

    it('should not include other tenant data in statistics', async () => {
      const response1 = await request(app)
        .get('/api/payments/statistics')
        .set('Authorization', `Bearer ${token1}`);

      const response2 = await request(app)
        .get('/api/payments/statistics')
        .set('Authorization', `Bearer ${token2}`);

      expect(response1.body.data.statistics.totalAmount).toBe(3000);
      expect(response2.body.data.statistics.totalAmount).toBe(1500);
      
      // Total should not be same
      expect(response1.body.data.statistics.totalAmount)
        .not.toBe(response2.body.data.statistics.totalAmount);
    });
  });

  describe('Concurrent Payment Processing', () => {
    it('should handle concurrent payments with proper locking', async () => {
      const paymentData = {
        tenantId: tenant1._id,
        fromAccountId: account1._id,
        amount: 3000, // Each payment
        currency: 'USD',
        description: 'Concurrent payment test',
        type: 'transfer'
      };

      // Create two concurrent payment requests
      const promises = [
        request(app)
          .post('/api/payments')
          .set('Authorization', `Bearer ${token1}`)
          .send(paymentData),
        request(app)
          .post('/api/payments')
          .set('Authorization', `Bearer ${token1}`)
          .send(paymentData)
      ];

      const responses = await Promise.all(promises);

      // At least one should succeed, one might fail due to insufficient funds
      const successCount = responses.filter(r => r.status === 201).length;
      const failCount = responses.filter(r => r.status === 400).length;

      expect(successCount + failCount).toBe(2);
      expect(successCount).toBeGreaterThanOrEqual(1);

      // Verify account balance consistency
      const finalAccount = await Account.findById(account1._id);
      if (successCount === 1) {
        expect(finalAccount.balance).toBe(7000); // 10000 - 3000
      } else if (successCount === 2) {
        expect(finalAccount.balance).toBe(4000); // 10000 - 6000
      }
    });
  });
});
