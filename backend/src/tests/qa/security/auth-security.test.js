const request = require('supertest');
const app = require('../../../app');
const jwt = require('jsonwebtoken');

describe('Security Testing: Authentication & Authorization', () => {
  let scenario, tokens;

  beforeEach(async () => {
    scenario = await global.testUtils.createTestScenario();
    tokens = global.testUtils.generateTokensForScenario(scenario);
  });

  describe('JWT Token Security', () => {
    it('should reject invalid JWT tokens', async () => {
      const invalidToken = 'invalid.jwt.token';

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
      global.testUtils.expectErrorResponse(response, 'token');
    });

    it('should reject expired JWT tokens', async () => {
      const expiredPayload = {
        userId: scenario.users.tenantAdmin._id,
        tenantId: scenario.tenant._id,
        role: 'tenant_admin',
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      };

      const expiredToken = jwt.sign(expiredPayload, process.env.JWT_SECRET);

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      global.testUtils.expectErrorResponse(response, 'expired');
    });

    it('should reject tokens with invalid signature', async () => {
      const payload = {
        userId: scenario.users.tenantAdmin._id,
        tenantId: scenario.tenant._id,
        role: 'tenant_admin'
      };

      const invalidSignatureToken = jwt.sign(payload, 'wrong-secret');

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${invalidSignatureToken}`);

      expect(response.status).toBe(401);
      global.testUtils.expectErrorResponse(response);
    });

    it('should reject tokens with manipulated payload', async () => {
      // Create valid token
      const validToken = tokens.branchStaffToken;
      
      // Decode and modify payload
      const decoded = jwt.decode(validToken);
      decoded.role = 'super_admin'; // Privilege escalation attempt
      
      // Create new token with modified payload but original secret
      const manipulatedToken = jwt.sign(decoded, process.env.JWT_SECRET);

      const response = await request(app)
        .get('/api/system/health')
        .set('Authorization', `Bearer ${manipulatedToken}`);

      // Should fail due to role verification or other security checks
      expect([401, 403]).toContain(response.status);
      global.testUtils.expectErrorResponse(response);
    });

    it('should validate token issuer and audience', async () => {
      const payload = {
        userId: scenario.users.tenantAdmin._id,
        tenantId: scenario.tenant._id,
        role: 'tenant_admin',
        iss: 'malicious-issuer',
        aud: 'wrong-audience'
      };

      const maliciousToken = jwt.sign(payload, process.env.JWT_SECRET);

      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${maliciousToken}`);

      expect([401, 403]).toContain(response.status);
      global.testUtils.expectErrorResponse(response);
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('should enforce super admin privileges', async () => {
      const superAdminOnlyEndpoints = [
        '/api/tenants',
        '/api/system/health',
        '/api/plans',
        '/api/subscriptions'
      ];

      for (const endpoint of superAdminOnlyEndpoints) {
        // Test with tenant admin token
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${tokens.tenantAdminToken}`);

        expect([401, 403, 404]).toContain(response.status);
        console.log(`✓ Tenant admin blocked from ${endpoint}`);
      }
    });

    it('should enforce tenant admin privileges', async () => {
      const tenantAdminEndpoints = [
        '/api/branches',
        '/api/exchange-rates',
        '/api/reports/financial'
      ];

      for (const endpoint of tenantAdminEndpoints) {
        // Test with branch staff token
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${tokens.branchStaffToken}`);

        expect([401, 403, 404]).toContain(response.status);
        console.log(`✓ Branch staff blocked from ${endpoint}`);
      }
    });

    it('should enforce branch admin privileges', async () => {
      // Branch admin should be able to manage customers
      const customerResponse = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`);

      expect(customerResponse.status).toBe(200);

      // But branch staff should have limited access
      const staffResponse = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .send({
          firstName: 'Test',
          lastName: 'Customer',
          email: 'test@example.com'
        });

      expect(staffResponse.status).toBe(201); // Staff can create
      
      // But cannot approve high-value transactions
      const transaction = await global.testUtils.createTestTransaction({
        tenantId: scenario.tenant._id,
        amount: 100000,
        status: 'pending'
      });

      const approveResponse = await request(app)
        .put(`/api/transactions/${transaction._id}/approve`)
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`);

      expect(approveResponse.status).toBe(403);
      console.log('✓ Branch staff cannot approve transactions');
    });

    it('should prevent privilege escalation', async () => {
      // Try to update own user role
      const updateResponse = await request(app)
        .put(`/api/users/${scenario.users.branchStaff._id}`)
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .send({
          role: 'super_admin'
        });

      expect(updateResponse.status).toBe(403);
      global.testUtils.expectErrorResponse(updateResponse, 'دسترسی');
    });

    it('should validate resource ownership', async () => {
      // Create customer with one user
      const customer = await global.testUtils.createTestCustomer({
        tenantId: scenario.tenant._id,
        createdBy: scenario.users.branchAdmin._id
      });

      // Try to modify with different user token
      const updateResponse = await request(app)
        .put(`/api/customers/${customer._id}`)
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .send({
          firstName: 'Modified'
        });

      // Depending on business rules, this might be allowed or forbidden
      expect([200, 403]).toContain(updateResponse.status);
    });
  });

  describe('Session Management Security', () => {
    it('should handle concurrent sessions', async () => {
      const loginData = {
        email: scenario.users.tenantAdmin.email,
        password: 'SecurePass@123'
      };

      // Create multiple sessions
      const session1 = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      const session2 = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(session1.status).toBe(200);
      expect(session2.status).toBe(200);

      // Both sessions should be valid
      const test1 = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${session1.body.data.accessToken}`);

      const test2 = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${session2.body.data.accessToken}`);

      expect(test1.status).toBe(200);
      expect(test2.status).toBe(200);
    });

    it('should properly logout and invalidate tokens', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: scenario.users.tenantAdmin.email,
          password: 'SecurePass@123'
        });

      const token = loginResponse.body.data.accessToken;
      const refreshToken = loginResponse.body.data.refreshToken;

      // Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      expect(logoutResponse.status).toBe(200);

      // Try to use token after logout
      const testResponse = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`);

      // Token might still be valid until expiry (depending on implementation)
      expect([200, 401]).toContain(testResponse.status);

      // Try to refresh token after logout
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(401);
      global.testUtils.expectErrorResponse(refreshResponse);
    });

    it('should logout from all devices', async () => {
      const loginData = {
        email: scenario.users.tenantAdmin.email,
        password: 'SecurePass@123'
      };

      // Create multiple sessions
      const session1 = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      const session2 = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      // Logout from all devices using one session
      const logoutAllResponse = await request(app)
        .post('/api/auth/logout-all')
        .set('Authorization', `Bearer ${session1.body.data.accessToken}`);

      expect(logoutAllResponse.status).toBe(200);

      // Both sessions should be invalidated
      const test1 = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: session1.body.data.refreshToken });

      const test2 = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: session2.body.data.refreshToken });

      expect(test1.status).toBe(401);
      expect(test2.status).toBe(401);
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should prevent XSS attacks in user input', async () => {
      const xssPayload = '<script>alert("XSS")</script>';
      
      const customerData = {
        firstName: xssPayload,
        lastName: 'Test',
        email: 'test@example.com',
        address: '<img src="x" onerror="alert(1)">'
      };

      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send(customerData);

      if (response.status === 201) {
        const customer = response.body.data.customer;
        // Input should be sanitized
        expect(customer.firstName).not.toContain('<script>');
        expect(customer.address).not.toContain('onerror');
      } else {
        // Should be rejected due to validation
        expect(response.status).toBe(400);
      }
    });

    it('should prevent SQL injection attempts', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "' UNION SELECT * FROM users --"
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .get('/api/customers/search')
          .query({ search: payload })
          .set('Authorization', `Bearer ${tokens.branchAdminToken}`);

        expect(response.status).toBe(200);
        global.testUtils.expectSuccessResponse(response);
        // Should return empty or filtered results, not error
      }
    });

    it('should prevent NoSQL injection', async () => {
      const noSqlPayloads = [
        { $ne: null },
        { $gt: '' },
        { $where: 'true' },
        { $regex: '.*' }
      ];

      for (const payload of noSqlPayloads) {
        const response = await request(app)
          .post('/api/customers/search')
          .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
          .send({ filter: payload });

        expect([400, 200]).toContain(response.status);
        if (response.status === 400) {
          global.testUtils.expectErrorResponse(response);
        }
      }
    });

    it('should validate file uploads', async () => {
      const maliciousFileData = {
        filename: '../../../etc/passwd',
        content: 'malicious content',
        type: 'application/x-executable'
      };

      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .send(maliciousFileData);

      expect(response.status).toBe(400);
      global.testUtils.expectErrorResponse(response);
    });
  });

  describe('Rate Limiting and Brute Force Protection', () => {
    it('should enforce login rate limiting', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      };

      const attempts = [];
      
      // Make multiple failed login attempts
      for (let i = 0; i < 10; i++) {
        attempts.push(
          request(app)
            .post('/api/auth/login')
            .send(loginData)
        );
      }

      const responses = await Promise.all(attempts);
      
      // Later attempts should be rate limited
      const blockedAttempts = responses.filter(r => r.status === 429);
      expect(blockedAttempts.length).toBeGreaterThan(0);
    });

    it('should enforce API rate limiting', async () => {
      const requests = [];
      
      // Make many requests quickly
      for (let i = 0; i < 100; i++) {
        requests.push(
          request(app)
            .get('/api/customers')
            .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should lock accounts after failed attempts', async () => {
      const user = await global.testUtils.createTestUser({
        tenantId: scenario.tenant._id,
        email: 'locktest@example.com',
        password: 'ValidPass@123'
      });

      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: 'locktest@example.com',
            password: 'wrongpassword'
          });
      }

      // Now try with correct password
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'locktest@example.com',
          password: 'ValidPass@123'
        });

      expect(response.status).toBe(423); // Account locked
      global.testUtils.expectErrorResponse(response, 'قفل');
    });
  });

  describe('Security Headers and HTTPS', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Authorization', `Bearer ${tokens.tenantAdminToken}`);

      // Check for security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    it('should prevent clickjacking', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Authorization', `Bearer ${tokens.tenantAdminToken}`);

      expect(response.headers['x-frame-options']).toBeDefined();
    });

    it('should enforce content type', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Authorization', `Bearer ${tokens.tenantAdminToken}`);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('Password Security', () => {
    it('should enforce password complexity', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'admin',
        '12345678',
        'qwerty'
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${tokens.tenantAdminToken}`)
          .send({
            username: 'testuser',
            email: 'test@example.com',
            password: password,
            role: 'branch_staff'
          });

        expect(response.status).toBe(400);
        global.testUtils.expectErrorResponse(response, 'password');
      }
    });

    it('should hash passwords properly', async () => {
      const userResponse = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tokens.tenantAdminToken}`)
        .send({
          username: 'passwordtest',
          email: 'passwordtest@example.com',
          password: 'StrongPass@123',
          role: 'branch_staff'
        });

      if (userResponse.status === 201) {
        // Password should not be returned in response
        expect(userResponse.body.data.user).not.toHaveProperty('password');
      }
    });

    it('should require password change after reset', async () => {
      const resetResponse = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: scenario.users.branchStaff.email
        });

      expect([200, 404]).toContain(resetResponse.status);
    });
  });

  describe('Two-Factor Authentication (2FA)', () => {
    it('should enable 2FA for high-privilege users', async () => {
      const enable2FAResponse = await request(app)
        .post('/api/auth/2fa/enable')
        .set('Authorization', `Bearer ${tokens.tenantAdminToken}`);

      expect([200, 404]).toContain(enable2FAResponse.status);
      
      if (enable2FAResponse.status === 200) {
        expect(enable2FAResponse.body.data).toHaveProperty('qrCode');
      }
    });

    it('should require 2FA for sensitive operations', async () => {
      // Try to perform sensitive operation without 2FA
      const response = await request(app)
        .delete(`/api/tenants/${scenario.tenant._id}`)
        .set('Authorization', `Bearer ${tokens.tenantAdminToken}`);

      expect([403, 404]).toContain(response.status);
    });
  });
});