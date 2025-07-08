const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { User, Tenant } = require('../models/User');

describe('Security Tests', () => {
  let server;
  let testTenant1, testTenant2;
  let testUser1, testUser2;
  let token1, token2;

  beforeAll(async () => {
    // Create test tenants
    testTenant1 = new Tenant({
      name: 'Test Tenant 1',
      code: 'TEST1',
      type: 'exchange',
      status: 'active'
    });
    await testTenant1.save();

    testTenant2 = new Tenant({
      name: 'Test Tenant 2', 
      code: 'TEST2',
      type: 'exchange',
      status: 'active'
    });
    await testTenant2.save();

    // Create test users
    testUser1 = new User({
      username: 'testuser1',
      email: 'test1@example.com',
      password: 'Test@123456',
      fullName: 'Test User 1',
      phone: '09123456781',
      nationalId: '1234567891',
      role: 'tenant_admin',
      status: 'active',
      tenantId: testTenant1._id
    });
    await testUser1.save();

    testUser2 = new User({
      username: 'testuser2',
      email: 'test2@example.com', 
      password: 'Test@123456',
      fullName: 'Test User 2',
      phone: '09123456782',
      nationalId: '1234567892',
      role: 'tenant_admin',
      status: 'active',
      tenantId: testTenant2._id
    });
    await testUser2.save();

    // Generate tokens
    token1 = jwt.sign(
      { userId: testUser1._id, tenantId: testTenant1._id, role: 'tenant_admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    token2 = jwt.sign(
      { userId: testUser2._id, tenantId: testTenant2._id, role: 'tenant_admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Cleanup
    await User.deleteMany({});
    await Tenant.deleteMany({});
    if (server) {
      server.close();
    }
  });

  describe('Authentication Tests', () => {
    test('Should reject requests without authentication token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toMatch(/توکن احراز هویت/);
    });

    test('Should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toMatch(/توکن نامعتبر/);
    });

    test('Should reject requests with malformed token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'InvalidBearerFormat')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
    });

    test('Should accept requests with valid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token1}`);

      // Should not be 401 (may be 200 or other status depending on implementation)
      expect(response.status).not.toBe(401);
    });
  });

  describe('Tenant Isolation Tests', () => {
    test('Should prevent cross-tenant data access', async () => {
      // Try to access tenant2 data with tenant1 token
      const response = await request(app)
        .get(`/api/tenants/${testTenant2._id}/users`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toMatch(/دسترسی.*صرافی/);
    });

    test('Should allow access to own tenant data', async () => {
      const response = await request(app)
        .get(`/api/tenants/${testTenant1._id}/users`)
        .set('Authorization', `Bearer ${token1}`);

      // Should not be 403 (tenant isolation violation)
      expect(response.status).not.toBe(403);
    });

    test('Should prevent tenant ID manipulation in requests', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          tenantId: testTenant2._id, // Try to create transaction for different tenant
          type: 'currency_buy',
          amount: 100,
          sourceCurrency: 'USD',
          targetCurrency: 'EUR'
        })
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Input Validation Tests', () => {
    test('Should sanitize MongoDB injection attempts', async () => {
      const maliciousPayload = {
        username: { $ne: null },
        password: { $ne: null }
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(maliciousPayload)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    test('Should prevent XSS in input fields', async () => {
      const xssPayload = {
        username: 'testuser',
        fullName: '<script>alert("xss")</script>',
        password: 'Test@123456'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${token1}`)
        .send(xssPayload);

      // Should either reject or sanitize the input
      if (response.status === 200) {
        expect(response.body.data?.fullName).not.toContain('<script>');
      }
    });

    test('Should validate required fields', async () => {
      const incompleteData = {
        type: 'currency_buy'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token1}`)
        .send(incompleteData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Rate Limiting Tests', () => {
    test('Should enforce rate limits on auth endpoints', async () => {
      const invalidCredentials = {
        username: 'invalid',
        password: 'invalid'
      };

      // Make multiple rapid requests
      const promises = Array(15).fill().map(() =>
        request(app)
          .post('/api/auth/login')
          .send(invalidCredentials)
      );

      const responses = await Promise.all(promises);
      
      // At least one request should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Authorization Tests', () => {
    test('Should prevent unauthorized role escalation', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          role: 'super_admin' // Try to escalate privileges
        });

      // Should either reject the request or ignore the role change
      if (response.status === 200) {
        expect(response.body.data?.role).not.toBe('super_admin');
      }
    });

    test('Should enforce role-based access control', async () => {
      // Create a customer user token
      const customerUser = new User({
        username: 'customer1',
        email: 'customer1@example.com',
        password: 'Test@123456',
        fullName: 'Customer User',
        phone: '09123456783',
        nationalId: '1234567893',
        role: 'customer',
        status: 'active',
        tenantId: testTenant1._id
      });
      await customerUser.save();

      const customerToken = jwt.sign(
        { userId: customerUser._id, tenantId: testTenant1._id, role: 'customer' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Try to access admin-only endpoint
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toMatch(/دسترسی/);
    });
  });

  describe('Data Exposure Tests', () => {
    test('Should not expose sensitive data in responses', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${token1}`);

      if (response.status === 200) {
        // Should not expose password or other sensitive fields
        expect(response.body.data?.password).toBeUndefined();
        expect(response.body.data?.passwordResetToken).toBeUndefined();
      }
    });

    test('Should not expose internal system information in errors', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .set('Authorization', `Bearer ${token1}`)
        .expect(404);

      // Should not expose stack traces or internal paths in production
      if (process.env.NODE_ENV === 'production') {
        expect(response.body?.stack).toBeUndefined();
        expect(response.body?.error?.stack).toBeUndefined();
      }
    });
  });

  describe('Security Headers Tests', () => {
    test('Should include security headers in responses', async () => {
      const response = await request(app)
        .get('/health');

      // Check for common security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });
});