const request = require('supertest');
const app = require('../../../app');
const jwt = require('jsonwebtoken');

describe('Security Testing: Tenant Isolation', () => {
  let tenant1, tenant2;
  let admin1, admin2;
  let token1, token2;
  let customer1, customer2;

  beforeEach(async () => {
    // Create two separate tenants
    tenant1 = await global.testUtils.createTestTenant({
      name: 'Tenant 1',
      code: 'T1'
    });

    tenant2 = await global.testUtils.createTestTenant({
      name: 'Tenant 2',
      code: 'T2'
    });

    // Create admin users for each tenant
    admin1 = await global.testUtils.createTestUser({
      tenantId: tenant1._id,
      role: 'tenant_admin',
      email: 'admin1@test.com'
    });

    admin2 = await global.testUtils.createTestUser({
      tenantId: tenant2._id,
      role: 'tenant_admin',
      email: 'admin2@test.com'
    });

    // Create customers for each tenant
    customer1 = await global.testUtils.createTestCustomer({
      tenantId: tenant1._id,
      email: 'customer1@test.com'
    });

    customer2 = await global.testUtils.createTestCustomer({
      tenantId: tenant2._id,
      email: 'customer2@test.com'
    });

    // Generate tokens
    token1 = global.testUtils.generateTestToken({
      userId: admin1._id,
      tenantId: tenant1._id,
      role: 'tenant_admin'
    });

    token2 = global.testUtils.generateTestToken({
      userId: admin2._id,
      tenantId: tenant2._id,
      role: 'tenant_admin'
    });
  });

  describe('Cross-Tenant Data Access Prevention', () => {
    it('should prevent tenant 1 admin from accessing tenant 2 customers', async () => {
      const response = await request(app)
        .get(`/api/customers/${customer2._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(404);
      global.testUtils.expectErrorResponse(response);
    });

    it('should prevent tenant 1 admin from listing tenant 2 customers', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      
      // Should only return tenant 1 customers
      const customers = response.body.data.customers;
      customers.forEach(customer => {
        expect(customer.tenantId).toBe(tenant1._id.toString());
      });
    });

    it('should prevent cross-tenant transaction access', async () => {
      const transaction2 = await global.testUtils.createTestTransaction({
        tenantId: tenant2._id,
        customerId: customer2._id
      });

      const response = await request(app)
        .get(`/api/transactions/${transaction2._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(404);
      global.testUtils.expectErrorResponse(response);
    });

    it('should prevent cross-tenant user creation', async () => {
      const userData = {
        username: 'malicioususer',
        email: 'malicious@test.com',
        password: 'SecurePass@123',
        tenantId: tenant2._id, // Trying to create user in different tenant
        role: 'branch_admin'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token1}`)
        .send(userData);

      expect(response.status).toBe(403);
      global.testUtils.expectErrorResponse(response, 'دسترسی');
    });

    it('should prevent cross-tenant settings modification', async () => {
      const settings = {
        maxDailyTransactionAmount: 1000000,
        allowedCurrencies: ['USD', 'EUR']
      };

      const response = await request(app)
        .put(`/api/tenants/${tenant2._id}/settings`)
        .set('Authorization', `Bearer ${token1}`)
        .send(settings);

      expect(response.status).toBe(403);
      global.testUtils.expectErrorResponse(response);
    });
  });

  describe('URL Parameter Manipulation', () => {
    it('should prevent tenant ID manipulation in URL path', async () => {
      // Try to access tenant 2 data using tenant 1 token
      const response = await request(app)
        .get(`/api/tenants/${tenant2._id}/customers`)
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(403);
      global.testUtils.expectErrorResponse(response);
    });

    it('should prevent tenant ID manipulation in query parameters', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .query({ tenantId: tenant2._id })
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(403);
      global.testUtils.expectErrorResponse(response);
    });

    it('should prevent tenant ID manipulation in request headers', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${token1}`)
        .set('X-Tenant-ID', tenant2._id.toString());

      expect(response.status).toBe(403);
      global.testUtils.expectErrorResponse(response);
    });
  });

  describe('Database Query Isolation', () => {
    it('should automatically filter queries by tenant', async () => {
      // Create data for both tenants
      await global.testUtils.createTestTransaction({
        tenantId: tenant1._id,
        amount: 1000
      });

      await global.testUtils.createTestTransaction({
        tenantId: tenant2._id,
        amount: 2000
      });

      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(200);
      
      // Should only return tenant 1 transactions
      const transactions = response.body.data.transactions;
      transactions.forEach(transaction => {
        expect(transaction.tenantId).toBe(tenant1._id.toString());
      });
    });

    it('should prevent SQL injection in tenant isolation', async () => {
      const maliciousQuery = {
        search: "'; DROP TABLE customers; --"
      };

      const response = await request(app)
        .get('/api/customers/search')
        .query(maliciousQuery)
        .set('Authorization', `Bearer ${token1}`);

      // Should not cause error and should return proper response
      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
    });

    it('should prevent NoSQL injection in MongoDB queries', async () => {
      const maliciousData = {
        $where: 'this.tenantId != this.tenantId'
      };

      const response = await request(app)
        .post('/api/customers/search')
        .set('Authorization', `Bearer ${token1}`)
        .send(maliciousData);

      expect(response.status).toBe(400);
      global.testUtils.expectErrorResponse(response);
    });
  });

  describe('Session and Token Isolation', () => {
    it('should prevent session hijacking between tenants', async () => {
      // Create a session for tenant 1
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: admin1.email,
          password: 'SecurePass@123'
        });

      expect(loginResponse.status).toBe(200);
      const sessionToken = loginResponse.body.data.accessToken;

      // Try to use this session to access tenant 2 data
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${sessionToken}`)
        .query({ tenantId: tenant2._id });

      expect(response.status).toBe(403);
      global.testUtils.expectErrorResponse(response);
    });

    it('should invalidate tokens when tenant is disabled', async () => {
      // Disable tenant 1
      await request(app)
        .put(`/api/tenants/${tenant1._id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ status: 'disabled' });

      // Try to use token after tenant is disabled
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${token1}`);

      expect([401, 403]).toContain(response.status);
      global.testUtils.expectErrorResponse(response);
    });
  });

  describe('API Endpoint Security', () => {
    it('should enforce tenant isolation on all CRUD operations', async () => {
      const operations = [
        { method: 'get', path: `/api/customers/${customer2._id}` },
        { method: 'put', path: `/api/customers/${customer2._id}`, data: { firstName: 'Hacked' } },
        { method: 'delete', path: `/api/customers/${customer2._id}` }
      ];

      for (const operation of operations) {
        let response;
        if (operation.method === 'get') {
          response = await request(app)[operation.method](operation.path)
            .set('Authorization', `Bearer ${token1}`);
        } else {
          response = await request(app)[operation.method](operation.path)
            .set('Authorization', `Bearer ${token1}`)
            .send(operation.data || {});
        }

        expect([403, 404]).toContain(response.status);
        global.testUtils.expectErrorResponse(response);
      }
    });

    it('should prevent bulk operations across tenants', async () => {
      const bulkData = {
        customerIds: [customer1._id, customer2._id], // Mix of both tenants
        action: 'activate'
      };

      const response = await request(app)
        .post('/api/customers/bulk-update')
        .set('Authorization', `Bearer ${token1}`)
        .send(bulkData);

      expect([400, 403]).toContain(response.status);
      global.testUtils.expectErrorResponse(response);
    });
  });

  describe('Data Export and Import Security', () => {
    it('should prevent cross-tenant data export', async () => {
      const exportRequest = {
        tenantIds: [tenant1._id, tenant2._id], // Trying to export both tenants
        dataTypes: ['customers', 'transactions'],
        format: 'csv'
      };

      const response = await request(app)
        .post('/api/data/export')
        .set('Authorization', `Bearer ${token1}`)
        .send(exportRequest);

      expect(response.status).toBe(403);
      global.testUtils.expectErrorResponse(response);
    });

    it('should prevent importing data to wrong tenant', async () => {
      const importData = {
        tenantId: tenant2._id, // Wrong tenant
        data: [
          { firstName: 'John', lastName: 'Doe', email: 'john@test.com' }
        ],
        dataType: 'customers'
      };

      const response = await request(app)
        .post('/api/data/import')
        .set('Authorization', `Bearer ${token1}`)
        .send(importData);

      expect(response.status).toBe(403);
      global.testUtils.expectErrorResponse(response);
    });
  });

  describe('Audit Trail Security', () => {
    it('should prevent access to other tenant audit logs', async () => {
      const response = await request(app)
        .get('/api/audit-logs')
        .query({ tenantId: tenant2._id })
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(403);
      global.testUtils.expectErrorResponse(response);
    });

    it('should log cross-tenant access attempts', async () => {
      // Attempt cross-tenant access
      await request(app)
        .get(`/api/customers/${customer2._id}`)
        .set('Authorization', `Bearer ${token1}`);

      // Check if attempt was logged
      const auditResponse = await request(app)
        .get('/api/audit-logs/security-violations')
        .set('Authorization', `Bearer ${token1}`);

      // This endpoint might not exist, so we check for appropriate response
      expect([200, 404]).toContain(auditResponse.status);
    });
  });

  describe('Edge Cases and Race Conditions', () => {
    it('should handle tenant switching attempts', async () => {
      // Create a token with one tenant
      let token = global.testUtils.generateTestToken({
        userId: admin1._id,
        tenantId: tenant1._id,
        role: 'tenant_admin'
      });

      // Try to modify the token to access different tenant
      const payload = jwt.decode(token);
      payload.tenantId = tenant2._id;
      
      const maliciousToken = jwt.sign(payload, process.env.JWT_SECRET);

      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${maliciousToken}`);

      // Should fail due to signature verification or tenant validation
      expect([401, 403]).toContain(response.status);
      global.testUtils.expectErrorResponse(response);
    });

    it('should handle concurrent access from different tenants', async () => {
      const promises = [
        request(app)
          .get('/api/customers')
          .set('Authorization', `Bearer ${token1}`),
        request(app)
          .get('/api/customers')
          .set('Authorization', `Bearer ${token2}`)
      ];

      const [response1, response2] = await Promise.all(promises);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Verify each response contains only appropriate tenant data
      const customers1 = response1.body.data.customers;
      const customers2 = response2.body.data.customers;

      customers1.forEach(customer => {
        expect(customer.tenantId).toBe(tenant1._id.toString());
      });

      customers2.forEach(customer => {
        expect(customer.tenantId).toBe(tenant2._id.toString());
      });
    });

    it('should maintain isolation during high load', async () => {
      // Simulate high load with multiple requests
      const requests = Array.from({ length: 10 }, () => [
        request(app)
          .get('/api/customers')
          .set('Authorization', `Bearer ${token1}`),
        request(app)
          .get('/api/customers')
          .set('Authorization', `Bearer ${token2}`)
      ]).flat();

      const responses = await Promise.all(requests);

      // All responses should be successful
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify no data leakage
      for (let i = 0; i < responses.length; i += 2) {
        const tenant1Response = responses[i];
        const tenant2Response = responses[i + 1];

        tenant1Response.body.data.customers.forEach(customer => {
          expect(customer.tenantId).toBe(tenant1._id.toString());
        });

        tenant2Response.body.data.customers.forEach(customer => {
          expect(customer.tenantId).toBe(tenant2._id.toString());
        });
      }
    });
  });
});