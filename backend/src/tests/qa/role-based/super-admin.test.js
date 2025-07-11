const request = require('supertest');
const app = require('../../../app');

describe('Role-Based Testing: Super Admin', () => {
  let scenario, tokens;

  beforeEach(async () => {
    scenario = await global.testUtils.createTestScenario();
    tokens = global.testUtils.generateTokensForScenario(scenario);
  });

  describe('تست سوپر ادمین - Tenant Management', () => {
    it('should create new tenant (صرافی جدید)', async () => {
      const tenantData = {
        name: 'صرافی نمونه',
        code: 'SAMPLE',
        type: 'exchange',
        status: 'active',
        settings: {
          allowedCurrencies: ['USD', 'EUR', 'IRR'],
          maxDailyTransactionAmount: 50000
        }
      };

      const response = await request(app)
        .post('/api/tenants')
        .set('Authorization', `Bearer ${tokens.superAdminToken}`)
        .send(tenantData);

      expect(response.status).toBe(201);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.tenant.name).toBe('صرافی نمونه');
      expect(response.body.data.tenant.code).toBe('SAMPLE');
    });

    it('should manage tenant subscriptions and plans', async () => {
      // Create a plan first
      const planData = {
        name: 'Premium Plan',
        type: 'premium',
        features: ['p2p', 'crypto', 'remittance'],
        price: 1000000,
        currency: 'IRR',
        duration: 30
      };

      const planResponse = await request(app)
        .post('/api/plans')
        .set('Authorization', `Bearer ${tokens.superAdminToken}`)
        .send(planData);

      expect(planResponse.status).toBe(201);

      // Assign plan to tenant
      const subscriptionData = {
        tenantId: scenario.tenant._id,
        planId: planResponse.body.data.plan.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      const subscriptionResponse = await request(app)
        .post('/api/subscriptions')
        .set('Authorization', `Bearer ${tokens.superAdminToken}`)
        .send(subscriptionData);

      expect(subscriptionResponse.status).toBe(201);
      global.testUtils.expectSuccessResponse(subscriptionResponse);
    });

    it('should view all transactions across all tenants', async () => {
      // Create transactions for different tenants
      await global.testUtils.createTestTransaction({
        tenantId: scenario.tenant._id,
        amount: 1000,
        status: 'completed'
      });

      const otherTenant = await global.testUtils.createTestTenant({
        name: 'Other Exchange'
      });

      await global.testUtils.createTestTransaction({
        tenantId: otherTenant._id,
        amount: 2000,
        status: 'completed'
      });

      const response = await request(app)
        .get('/api/transactions?role=super_admin')
        .set('Authorization', `Bearer ${tokens.superAdminToken}`);

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.transactions.length).toBeGreaterThanOrEqual(2);
    });

    it('should generate system-wide reports', async () => {
      const response = await request(app)
        .get('/api/reports/system-overview')
        .set('Authorization', `Bearer ${tokens.superAdminToken}`)
        .query({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        });

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.report).toHaveProperty('totalTenants');
      expect(response.body.data.report).toHaveProperty('totalTransactions');
      expect(response.body.data.report).toHaveProperty('totalRevenue');
    });

    it('should manage system security settings', async () => {
      const securitySettings = {
        passwordPolicy: {
          minLength: 8,
          requireSpecialChars: true,
          requireNumbers: true
        },
        sessionTimeout: 3600,
        maxLoginAttempts: 5,
        lockoutDuration: 900
      };

      const response = await request(app)
        .put('/api/system/security-settings')
        .set('Authorization', `Bearer ${tokens.superAdminToken}`)
        .send(securitySettings);

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
    });

    it('should monitor system health and performance', async () => {
      const response = await request(app)
        .get('/api/system/health')
        .set('Authorization', `Bearer ${tokens.superAdminToken}`);

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.health).toHaveProperty('database');
      expect(response.body.data.health).toHaveProperty('redis');
      expect(response.body.data.health).toHaveProperty('services');
    });
  });

  describe('Security and Access Control', () => {
    it('should have access to all tenant data', async () => {
      const response = await request(app)
        .get(`/api/tenants/${scenario.tenant._id}`)
        .set('Authorization', `Bearer ${tokens.superAdminToken}`);

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
    });

    it('should be able to modify any tenant settings', async () => {
      const updates = {
        status: 'suspended',
        settings: {
          maxDailyTransactionAmount: 10000
        }
      };

      const response = await request(app)
        .put(`/api/tenants/${scenario.tenant._id}`)
        .set('Authorization', `Bearer ${tokens.superAdminToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
    });

    it('should have audit trail access', async () => {
      const response = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${tokens.superAdminToken}`)
        .query({
          tenantId: scenario.tenant._id,
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        });

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid tenant creation data', async () => {
      const invalidTenantData = {
        name: '', // Empty name
        code: 'INVALID@CODE', // Invalid characters
        type: 'unknown'
      };

      const response = await request(app)
        .post('/api/tenants')
        .set('Authorization', `Bearer ${tokens.superAdminToken}`)
        .send(invalidTenantData);

      expect(response.status).toBe(400);
      global.testUtils.expectErrorResponse(response);
    });

    it('should prevent duplicate tenant codes', async () => {
      const tenantData = {
        name: 'Another Exchange',
        code: scenario.tenant.code, // Duplicate code
        type: 'exchange'
      };

      const response = await request(app)
        .post('/api/tenants')
        .set('Authorization', `Bearer ${tokens.superAdminToken}`)
        .send(tenantData);

      expect(response.status).toBe(409);
      global.testUtils.expectErrorResponse(response, 'کد صرافی تکراری');
    });
  });
});