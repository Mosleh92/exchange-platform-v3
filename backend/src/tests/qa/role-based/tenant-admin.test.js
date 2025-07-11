const request = require('supertest');
const app = require('../../../app');

describe('Role-Based Testing: Tenant Admin', () => {
  let scenario, tokens;

  beforeEach(async () => {
    scenario = await global.testUtils.createTestScenario();
    tokens = global.testUtils.generateTokensForScenario(scenario);
  });

  describe('تست صرافی (Tenant Admin) - Branch Management', () => {
    it('should manage branches under supervision', async () => {
      const branchData = {
        name: 'شعبه جدید',
        code: 'NEW_BRANCH',
        address: 'آدرس شعبه جدید',
        phone: '02112345678',
        city: 'تهران',
        status: 'active'
      };

      const response = await request(app)
        .post('/api/branches')
        .set('Authorization', `Bearer ${tokens.tenantAdminToken}`)
        .send(branchData);

      expect(response.status).toBe(201);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.branch.name).toBe('شعبه جدید');
      expect(response.body.data.branch.tenantId).toBe(scenario.tenant._id.toString());
    });

    it('should view all branches in tenant', async () => {
      // Create additional branch
      await global.testUtils.createTestBranch({
        tenantId: scenario.tenant._id,
        name: 'Branch 2',
        code: 'BR2'
      });

      const response = await request(app)
        .get('/api/branches')
        .set('Authorization', `Bearer ${tokens.tenantAdminToken}`);

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.branches.length).toBeGreaterThanOrEqual(2);
      
      // All branches should belong to this tenant
      response.body.data.branches.forEach(branch => {
        expect(branch.tenantId).toBe(scenario.tenant._id.toString());
      });
    });

    it('should update branch settings', async () => {
      const updates = {
        status: 'maintenance',
        operatingHours: {
          start: '08:00',
          end: '18:00'
        }
      };

      const response = await request(app)
        .put(`/api/branches/${scenario.branch._id}`)
        .set('Authorization', `Bearer ${tokens.tenantAdminToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.branch.status).toBe('maintenance');
    });
  });

  describe('Exchange Rate and Commission Management', () => {
    it('should set exchange rates for tenant', async () => {
      const rateData = {
        fromCurrency: 'AED',
        toCurrency: 'IRR',
        buyRate: 11500,
        sellRate: 11800,
        commission: 2.5,
        isActive: true,
        validFrom: new Date(),
        validTo: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };

      const response = await request(app)
        .post('/api/exchange-rates')
        .set('Authorization', `Bearer ${tokens.tenantAdminToken}`)
        .send(rateData);

      expect(response.status).toBe(201);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.rate.fromCurrency).toBe('AED');
      expect(response.body.data.rate.buyRate).toBe(11500);
    });

    it('should update commission structure', async () => {
      const commissionData = {
        type: 'percentage',
        value: 1.5,
        minAmount: 0,
        maxAmount: 100000,
        currency: 'USD',
        isActive: true
      };

      const response = await request(app)
        .post('/api/commissions')
        .set('Authorization', `Bearer ${tokens.tenantAdminToken}`)
        .send(commissionData);

      expect(response.status).toBe(201);
      global.testUtils.expectSuccessResponse(response);
    });

    it('should view current exchange rates', async () => {
      const response = await request(app)
        .get('/api/exchange-rates/current')
        .set('Authorization', `Bearer ${tokens.tenantAdminToken}`);

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.rates).toBeInstanceOf(Array);
    });
  });

  describe('Financial Reports and Analytics', () => {
    beforeEach(async () => {
      // Create sample transaction data
      await global.testUtils.createTestTransaction({
        tenantId: scenario.tenant._id,
        branchId: scenario.branch._id,
        amount: 5000,
        sourceCurrency: 'USD',
        targetCurrency: 'IRR',
        status: 'completed',
        createdAt: new Date()
      });

      await global.testUtils.createTestTransaction({
        tenantId: scenario.tenant._id,
        branchId: scenario.branch._id,
        amount: 3000,
        sourceCurrency: 'EUR',
        targetCurrency: 'IRR',
        status: 'completed',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      });
    });

    it('should view tenant financial reports', async () => {
      const response = await request(app)
        .get('/api/reports/financial')
        .set('Authorization', `Bearer ${tokens.tenantAdminToken}`)
        .query({
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          reportType: 'summary'
        });

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.report).toHaveProperty('totalTransactions');
      expect(response.body.data.report).toHaveProperty('totalVolume');
      expect(response.body.data.report).toHaveProperty('totalCommission');
    });

    it('should generate branch performance reports', async () => {
      const response = await request(app)
        .get('/api/reports/branch-performance')
        .set('Authorization', `Bearer ${tokens.tenantAdminToken}`)
        .query({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        });

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.report).toHaveProperty('branchPerformance');
    });

    it('should view daily transaction summary', async () => {
      const response = await request(app)
        .get('/api/reports/daily-summary')
        .set('Authorization', `Bearer ${tokens.tenantAdminToken}`)
        .query({
          date: new Date().toISOString().split('T')[0]
        });

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
    });
  });

  describe('User and Staff Management', () => {
    it('should create branch staff users', async () => {
      const staffData = {
        username: 'newstaff',
        email: 'newstaff@example.com',
        password: 'SecurePass@123',
        fullName: 'کارمند جدید',
        phone: '09123456789',
        nationalId: '9876543210',
        role: 'branch_staff',
        branchId: scenario.branch._id
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tokens.tenantAdminToken}`)
        .send(staffData);

      expect(response.status).toBe(201);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.user.role).toBe('branch_staff');
      expect(response.body.data.user.tenantId).toBe(scenario.tenant._id.toString());
    });

    it('should view all users in tenant', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${tokens.tenantAdminToken}`);

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      
      // All users should belong to this tenant
      response.body.data.users.forEach(user => {
        if (user.tenantId) {
          expect(user.tenantId).toBe(scenario.tenant._id.toString());
        }
      });
    });

    it('should update user roles and permissions', async () => {
      const newStaff = await global.testUtils.createTestUser({
        tenantId: scenario.tenant._id,
        branchId: scenario.branch._id,
        role: 'branch_staff'
      });

      const updates = {
        role: 'branch_admin',
        permissions: ['view_reports', 'manage_customers', 'approve_transactions']
      };

      const response = await request(app)
        .put(`/api/users/${newStaff._id}`)
        .set('Authorization', `Bearer ${tokens.tenantAdminToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.user.role).toBe('branch_admin');
    });
  });

  describe('Security Settings and Tenant Configuration', () => {
    it('should update tenant security settings', async () => {
      const securitySettings = {
        requireTwoFactorAuth: true,
        maxDailyTransactionAmount: 100000,
        allowedIpRanges: ['192.168.1.0/24'],
        sessionTimeout: 1800
      };

      const response = await request(app)
        .put(`/api/tenants/${scenario.tenant._id}/security`)
        .set('Authorization', `Bearer ${tokens.tenantAdminToken}`)
        .send(securitySettings);

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
    });

    it('should configure tenant features', async () => {
      const featureSettings = {
        features: {
          p2p: true,
          crypto: false,
          remittance: true,
          mobileApp: true
        },
        limits: {
          dailyTransactionLimit: 50000,
          monthlyTransactionLimit: 1000000
        }
      };

      const response = await request(app)
        .put(`/api/tenants/${scenario.tenant._id}/features`)
        .set('Authorization', `Bearer ${tokens.tenantAdminToken}`)
        .send(featureSettings);

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
    });
  });

  describe('Access Control and Tenant Isolation', () => {
    it('should not access other tenant data', async () => {
      const otherTenant = await global.testUtils.createTestTenant({
        name: 'Other Exchange'
      });

      const response = await request(app)
        .get(`/api/tenants/${otherTenant._id}`)
        .set('Authorization', `Bearer ${tokens.tenantAdminToken}`);

      expect(response.status).toBe(403);
      global.testUtils.expectErrorResponse(response, 'دسترسی');
    });

    it('should not create users for other tenants', async () => {
      const otherTenant = await global.testUtils.createTestTenant({
        name: 'Other Exchange'
      });

      const userData = {
        username: 'hackeruser',
        email: 'hacker@example.com',
        password: 'SecurePass@123',
        tenantId: otherTenant._id, // Trying to create user for other tenant
        role: 'branch_admin'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tokens.tenantAdminToken}`)
        .send(userData);

      expect(response.status).toBe(403);
      global.testUtils.expectErrorResponse(response, 'دسترسی');
    });

    it('should only see tenant-specific transactions', async () => {
      // Create transaction for other tenant
      const otherTenant = await global.testUtils.createTestTenant();
      await global.testUtils.createTestTransaction({
        tenantId: otherTenant._id,
        amount: 1000
      });

      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${tokens.tenantAdminToken}`);

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      
      // Should only see transactions from own tenant
      response.body.data.transactions.forEach(transaction => {
        expect(transaction.tenantId).toBe(scenario.tenant._id.toString());
      });
    });
  });

  describe('Error Handling and Validation', () => {
    it('should validate branch creation data', async () => {
      const invalidBranchData = {
        name: '', // Empty name
        code: '', // Empty code
        address: ''
      };

      const response = await request(app)
        .post('/api/branches')
        .set('Authorization', `Bearer ${tokens.tenantAdminToken}`)
        .send(invalidBranchData);

      expect(response.status).toBe(400);
      global.testUtils.expectErrorResponse(response);
    });

    it('should validate exchange rate data', async () => {
      const invalidRateData = {
        fromCurrency: 'INVALID',
        toCurrency: 'INVALID',
        buyRate: -100, // Negative rate
        sellRate: 0
      };

      const response = await request(app)
        .post('/api/exchange-rates')
        .set('Authorization', `Bearer ${tokens.tenantAdminToken}`)
        .send(invalidRateData);

      expect(response.status).toBe(400);
      global.testUtils.expectErrorResponse(response);
    });
  });
});