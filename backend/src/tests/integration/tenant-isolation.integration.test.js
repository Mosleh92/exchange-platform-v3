const request = require('supertest');
const app = require('../../server');
// const User = require('../../models/User'); // Unused
// const Tenant = require('../../models/Tenant'); // Unused
// const Transaction = require('../../models/Transaction'); // Unused
const Customer = require('../../models/Customer');
const Account = require('../../models/Account');
const Branch = require('../../models/Branch');

describe('Tenant Isolation Integration Tests', () => {
  let tenant1, tenant2;
  let admin1, admin2, customer1, customer2;
  let branch1, branch2;
  let token1, token2, customerToken1 /*, customerToken2*/; // customerToken2 unused
  let superAdminToken;

  beforeEach(async () => {
    // Create test tenants
    tenant1 = await global.testUtils.createTestTenant({
      name: 'Exchange Tenant 1',
      code: 'TEN1',
      status: 'active'
    });

    tenant2 = await global.testUtils.createTestTenant({
      name: 'Exchange Tenant 2',
      code: 'TEN2',
      status: 'active'
    });

    // Create branches
    branch1 = await Branch.create({
      tenantId: tenant1._id,
      name: 'Main Branch 1',
      code: 'BR1',
      address: 'Address 1',
      status: 'active'
    });

    branch2 = await Branch.create({
      tenantId: tenant2._id,
      name: 'Main Branch 2',
      code: 'BR2',
      address: 'Address 2',
      status: 'active'
    });

    // Create tenant admins
    admin1 = await global.testUtils.createTestUser({
      tenantId: tenant1._id,
      branchId: branch1._id,
      role: 'tenant_admin',
      status: 'active'
    });

    admin2 = await global.testUtils.createTestUser({
      tenantId: tenant2._id,
      branchId: branch2._id,
      role: 'tenant_admin',
      status: 'active'
    });

    // Create customers
    customer1 = await global.testUtils.createTestUser({
      tenantId: tenant1._id,
      role: 'customer',
      status: 'active'
    });

    customer2 = await global.testUtils.createTestUser({
      tenantId: tenant2._id,
      role: 'customer',
      status: 'active'
    });

    // Create super admin
    const superAdmin = await global.testUtils.createTestUser({
      role: 'super_admin',
      status: 'active'
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

    customerToken1 = global.testUtils.generateTestToken({
      userId: customer1._id,
      tenantId: tenant1._id,
      role: 'customer'
    });

    // customerToken2 = global.testUtils.generateTestToken({ // Unused
    //   userId: customer2._id,
    //   tenantId: tenant2._id,
    //   role: 'customer'
    // });

    superAdminToken = global.testUtils.generateTestToken({
      userId: superAdmin._id,
      role: 'super_admin'
    });
  });

  describe('User Management Isolation', () => {
    it('should only show users from same tenant', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Should only contain users from tenant1
      const userTenantIds = response.body.data.users.map(user => user.tenantId);
      userTenantIds.forEach(tenantId => {
        expect(tenantId).toBe(tenant1._id.toString());
      });
    });

    it('should not allow tenant admin to access users from different tenant', async () => {
      const response = await request(app)
        .get(`/api/users/${customer2._id}`)
        .set('Authorization', `Bearer ${token1}`); // Tenant 1 admin accessing Tenant 2 customer

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should allow super admin to access all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Should contain users from both tenants
      const users = response.body.data.users;
      const tenant1Users = users.filter(user => user.tenantId === tenant1._id.toString());
      const tenant2Users = users.filter(user => user.tenantId === tenant2._id.toString());
      
      expect(tenant1Users.length).toBeGreaterThan(0);
      expect(tenant2Users.length).toBeGreaterThan(0);
    });

    it('should prevent cross-tenant user creation', async () => {
      const userData = {
        username: 'crosstenantuser',
        email: 'crosstenantuser@example.com',
        password: 'SecurePass@123',
        fullName: 'Cross Tenant User',
        phone: '09123456789',
        nationalId: '9876543210',
        role: 'customer',
        tenantId: tenant2._id // Trying to create user for different tenant
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token1}`) // Tenant 1 admin
        .send(userData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('دسترسی');
    });
  });

  describe('Transaction Isolation', () => {
    let transaction1, transaction2;

    beforeEach(async () => {
      transaction1 = await global.testUtils.createTestTransaction({
        tenantId: tenant1._id,
        customerId: customer1._id,
        branchId: branch1._id,
        amount: 1000,
        currency: 'USD'
      });

      transaction2 = await global.testUtils.createTestTransaction({
        tenantId: tenant2._id,
        customerId: customer2._id,
        branchId: branch2._id,
        amount: 2000,
        currency: 'EUR'
      });
    });

    it('should only return transactions from same tenant', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toHaveLength(1);
      expect(response.body.data.transactions[0].tenantId).toBe(tenant1._id.toString());
      expect(response.body.data.transactions[0].id).toBe(transaction1._id.toString());
    });

    it('should not allow access to transactions from different tenant', async () => {
      const response = await request(app)
        .get(`/api/transactions/${transaction2._id}`)
        .set('Authorization', `Bearer ${token1}`); // Tenant 1 accessing Tenant 2 transaction

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should prevent transaction creation with wrong tenant ID', async () => {
      const transactionData = {
        tenantId: tenant2._id, // Wrong tenant
        customerId: customer1._id,
        branchId: branch1._id,
        type: 'exchange',
        amount: 500,
        sourceCurrency: 'USD',
        targetCurrency: 'EUR'
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${token1}`)
        .send(transactionData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('دسترسی');
    });

    it('should allow customers to only see their own transactions', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${customerToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Should only contain transactions for this customer
      response.body.data.transactions.forEach(transaction => {
        expect(transaction.customerId).toBe(customer1._id.toString());
        expect(transaction.tenantId).toBe(tenant1._id.toString());
      });
    });
  });

  describe('Account Isolation', () => {
    let account1, account2;

    beforeEach(async () => {
      account1 = await Account.create({
        tenantId: tenant1._id,
        userId: customer1._id,
        accountNumber: 'ACC001T1',
        accountType: 'current',
        currency: 'USD',
        balance: 5000,
        status: 'active'
      });

      account2 = await Account.create({
        tenantId: tenant2._id,
        userId: customer2._id,
        accountNumber: 'ACC001T2',
        accountType: 'current',
        currency: 'USD',
        balance: 3000,
        status: 'active'
      });
    });

    it('should only show accounts from same tenant', async () => {
      const response = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accounts).toHaveLength(1);
      expect(response.body.data.accounts[0].tenantId).toBe(tenant1._id.toString());
    });

    it('should not allow access to accounts from different tenant', async () => {
      const response = await request(app)
        .get(`/api/accounts/${account2._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should prevent account transfer between different tenants', async () => {
      const transferData = {
        fromAccountId: account1._id,
        toAccountId: account2._id, // Different tenant account
        amount: 1000,
        description: 'Cross-tenant transfer attempt'
      };

      const response = await request(app)
        .post('/api/accounts/transfer')
        .set('Authorization', `Bearer ${token1}`)
        .send(transferData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('دسترسی');
    });
  });

  describe('Branch Isolation', () => {
    it('should only show branches from same tenant', async () => {
      const response = await request(app)
        .get('/api/branches')
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.branches).toHaveLength(1);
      expect(response.body.data.branches[0].tenantId).toBe(tenant1._id.toString());
    });

    it('should not allow access to branches from different tenant', async () => {
      const response = await request(app)
        .get(`/api/branches/${branch2._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should prevent branch creation with wrong tenant ID', async () => {
      const branchData = {
        tenantId: tenant2._id, // Wrong tenant
        name: 'Unauthorized Branch',
        code: 'UNAUTH',
        address: 'Unauthorized Address'
      };

      const response = await request(app)
        .post('/api/branches')
        .set('Authorization', `Bearer ${token1}`)
        .send(branchData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Tenant Settings Isolation', () => {
    it('should only allow tenant admin to access their tenant settings', async () => {
      const response = await request(app)
        .get(`/api/tenants/${tenant1._id}/settings`)
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.settings).toBeDefined();
    });

    it('should not allow tenant admin to access other tenant settings', async () => {
      const response = await request(app)
        .get(`/api/tenants/${tenant2._id}/settings`)
        .set('Authorization', `Bearer ${token1}`); // Tenant 1 accessing Tenant 2 settings

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should not allow customers to access tenant settings', async () => {
      const response = await request(app)
        .get(`/api/tenants/${tenant1._id}/settings`)
        .set('Authorization', `Bearer ${customerToken1}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should allow super admin to access any tenant settings', async () => {
      const response = await request(app)
        .get(`/api/tenants/${tenant1._id}/settings`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Report Isolation', () => {
    beforeEach(async () => {
      // Create sample data for reports
      await global.testUtils.createTestTransaction({
        tenantId: tenant1._id,
        amount: 1000,
        status: 'completed'
      });

      await global.testUtils.createTestTransaction({
        tenantId: tenant2._id,
        amount: 2000,
        status: 'completed'
      });
    });

    it('should only include tenant-specific data in financial reports', async () => {
      const response = await request(app)
        .get('/api/reports/financial')
        .set('Authorization', `Bearer ${token1}`)
        .query({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      const report = response.body.data.report;
      expect(report.tenantId).toBe(tenant1._id.toString());
      expect(report.totalAmount).toBe(1000); // Only tenant 1 transactions
    });

    it('should not include cross-tenant data in reports', async () => {
      const response1 = await request(app)
        .get('/api/reports/financial')
        .set('Authorization', `Bearer ${token1}`)
        .query({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        });

      const response2 = await request(app)
        .get('/api/reports/financial')
        .set('Authorization', `Bearer ${token2}`)
        .query({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        });

      expect(response1.body.data.report.totalAmount).toBe(1000);
      expect(response2.body.data.report.totalAmount).toBe(2000);
      
      // Verify they are different
      expect(response1.body.data.report.totalAmount)
        .not.toBe(response2.body.data.report.totalAmount);
    });
  });

  describe('URL Parameter Manipulation', () => {
    it('should prevent tenant ID manipulation in URL', async () => {
      // Try to access tenant 2 data through tenant 1 token with URL manipulation
      const response = await request(app)
        .get(`/api/tenants/${tenant2._id}/users`)
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should prevent tenant ID manipulation in headers', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${token1}`)
        .set('X-Tenant-ID', tenant2._id.toString()); // Try to manipulate via header

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should prevent tenant ID manipulation in query parameters', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .query({ tenantId: tenant2._id.toString() }) // Try to manipulate via query
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Database Query Isolation', () => {
    beforeEach(async () => {
      // Create test data for both tenants
      await Promise.all([
        Customer.create({
          tenantId: tenant1._id,
          firstName: 'Customer',
          lastName: 'One',
          email: 'customer1@tenant1.com'
        }),
        Customer.create({
          tenantId: tenant2._id,
          firstName: 'Customer',
          lastName: 'Two',
          email: 'customer2@tenant2.com'
        })
      ]);
    });

    it('should automatically filter database queries by tenant', async () => {
      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.customers).toHaveLength(1);
      expect(response.body.data.customers[0].email).toBe('customer1@tenant1.com');
    });

    it('should prevent direct database access bypass attempts', async () => {
      // This test ensures that even if someone tries to bypass middleware,
      // the database queries are still filtered
      const response = await request(app)
        .get('/api/customers/search')
        .query({ email: 'customer2@tenant2.com' }) // Try to search for other tenant's customer
        .set('Authorization', `Bearer ${token1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.customers).toHaveLength(0); // Should not find customer from other tenant
    });
  });
});
