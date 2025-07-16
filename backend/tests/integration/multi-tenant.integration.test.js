const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Tenant = require('../../src/models/tenants/Tenant');
const User = require('../../src/models/User');
const Transaction = require('../../src/models/Transaction');
const Account = require('../../src/models/Account');
const TenantHierarchyService = require('../../src/core/multi-tenancy/TenantHierarchyService');

describe('Multi-Tenant Integration Tests', () => {
  let superAdminToken;
  let exchange1Token;
  let exchange2Token;
  let branch1Token;
  let branch2Token;
  let user1Token;
  let user2Token;

  let superAdmin;
  let exchange1;
  let exchange2;
  let branch1;
  let branch2;
  let user1;
  let user2;

  beforeAll(async () => {
    // Create test tenants hierarchy
    superAdmin = await User.create({
      email: 'superadmin@test.com',
      password: 'SuperAdmin123!',
      role: 'super_admin',
      isActive: true
    });

    exchange1 = await Tenant.create({
      name: 'Exchange 1',
      level: 1,
      owner: superAdmin._id,
      isActive: true
    });

    exchange2 = await Tenant.create({
      name: 'Exchange 2',
      level: 1,
      owner: superAdmin._id,
      isActive: true
    });

    branch1 = await Tenant.create({
      name: 'Branch 1',
      level: 2,
      parent: exchange1._id,
      owner: superAdmin._id,
      isActive: true
    });

    branch2 = await Tenant.create({
      name: 'Branch 2',
      level: 2,
      parent: exchange2._id,
      owner: superAdmin._id,
      isActive: true
    });

    // Create users for each tenant
    const exchange1User = await User.create({
      email: 'exchange1@test.com',
      password: 'Exchange123!',
      role: 'exchange_admin',
      tenantId: exchange1._id,
      isActive: true
    });

    const exchange2User = await User.create({
      email: 'exchange2@test.com',
      password: 'Exchange123!',
      role: 'exchange_admin',
      tenantId: exchange2._id,
      isActive: true
    });

    const branch1User = await User.create({
      email: 'branch1@test.com',
      password: 'Branch123!',
      role: 'branch_manager',
      tenantId: branch1._id,
      branchId: branch1._id,
      isActive: true
    });

    const branch2User = await User.create({
      email: 'branch2@test.com',
      password: 'Branch123!',
      role: 'branch_manager',
      tenantId: branch2._id,
      branchId: branch2._id,
      isActive: true
    });

    user1 = await User.create({
      email: 'user1@test.com',
      password: 'User123!',
      role: 'customer',
      tenantId: branch1._id,
      branchId: branch1._id,
      isActive: true
    });

    user2 = await User.create({
      email: 'user2@test.com',
      password: 'User123!',
      role: 'customer',
      tenantId: branch2._id,
      branchId: branch2._id,
      isActive: true
    });

    // Get authentication tokens
    superAdminToken = await getAuthToken(superAdmin.email, 'SuperAdmin123!');
    exchange1Token = await getAuthToken(exchange1User.email, 'Exchange123!');
    exchange2Token = await getAuthToken(exchange2User.email, 'Exchange123!');
    branch1Token = await getAuthToken(branch1User.email, 'Branch123!');
    branch2Token = await getAuthToken(branch2User.email, 'Branch123!');
    user1Token = await getAuthToken(user1.email, 'User123!');
    user2Token = await getAuthToken(user2.email, 'User123!');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  describe('Tenant Hierarchy Access Control', () => {
    test('Super admin can access all tenants', async () => {
      const response = await request(app)
        .get('/api/v1/tenants')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('Exchange admin can only access their own tenant and child tenants', async () => {
      const response = await request(app)
        .get('/api/v1/tenants')
        .set('Authorization', `Bearer ${exchange1Token}`);

      expect(response.status).toBe(200);
      const accessibleTenants = response.body;
      
      // Should only see their own tenant and child tenants
      const tenantIds = accessibleTenants.map(t => t._id);
      expect(tenantIds).toContain(exchange1._id.toString());
      expect(tenantIds).toContain(branch1._id.toString());
      expect(tenantIds).not.toContain(exchange2._id.toString());
      expect(tenantIds).not.toContain(branch2._id.toString());
    });

    test('Branch manager can only access their own branch', async () => {
      const response = await request(app)
        .get('/api/v1/tenants')
        .set('Authorization', `Bearer ${branch1Token}`);

      expect(response.status).toBe(200);
      const accessibleTenants = response.body;
      
      // Should only see their own branch
      const tenantIds = accessibleTenants.map(t => t._id);
      expect(tenantIds).toContain(branch1._id.toString());
      expect(tenantIds).not.toContain(exchange1._id.toString());
      expect(tenantIds).not.toContain(branch2._id.toString());
    });
  });

  describe('Data Isolation Tests', () => {
    beforeEach(async () => {
      // Create test data for each tenant
      await Transaction.create([
        {
          userId: user1._id,
          tenantId: branch1._id,
          amount: 1000,
          currency: 'USD',
          transactionType: 'EXCHANGE',
          status: 'COMPLETED'
        },
        {
          userId: user2._id,
          tenantId: branch2._id,
          amount: 2000,
          currency: 'EUR',
          transactionType: 'EXCHANGE',
          status: 'COMPLETED'
        }
      ]);

      await Account.create([
        {
          userId: user1._id,
          tenantId: branch1._id,
          currency: 'USD',
          balance: 1000
        },
        {
          userId: user2._id,
          tenantId: branch2._id,
          currency: 'EUR',
          balance: 2000
        }
      ]);
    });

    afterEach(async () => {
      await Transaction.deleteMany({});
      await Account.deleteMany({});
    });

    test('Users cannot access transactions from other tenants', async () => {
      // User1 tries to access User2's transactions
      const response = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(200);
      const transactions = response.body;
      
      // Should only see their own transactions
      transactions.forEach(transaction => {
        expect(transaction.tenantId).toBe(branch1._id.toString());
        expect(transaction.userId).toBe(user1._id.toString());
      });
    });

    test('Branch managers cannot access data from other branches', async () => {
      // Branch1 manager tries to access Branch2 data
      const response = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${branch1Token}`);

      expect(response.status).toBe(200);
      const transactions = response.body;
      
      // Should only see transactions from their branch
      transactions.forEach(transaction => {
        expect(transaction.tenantId).toBe(branch1._id.toString());
      });
    });

    test('Exchange admins can access data from their child branches', async () => {
      // Exchange1 admin accesses transactions
      const response = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${exchange1Token}`);

      expect(response.status).toBe(200);
      const transactions = response.body;
      
      // Should see transactions from their child branch
      const hasBranch1Transaction = transactions.some(t => 
        t.tenantId === branch1._id.toString()
      );
      expect(hasBranch1Transaction).toBe(true);
    });
  });

  describe('Cross-Tenant Security Tests', () => {
    test('Prevent IDOR vulnerability in transaction access', async () => {
      // Create a transaction for user1
      const user1Transaction = await Transaction.create({
        userId: user1._id,
        tenantId: branch1._id,
        amount: 1000,
        currency: 'USD',
        transactionType: 'EXCHANGE',
        status: 'COMPLETED'
      });

      // User2 tries to access User1's transaction
      const response = await request(app)
        .get(`/api/v1/transactions/${user1Transaction._id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(response.status).toBe(403);
    });

    test('Prevent cross-tenant account access', async () => {
      // Create account for user1
      const user1Account = await Account.create({
        userId: user1._id,
        tenantId: branch1._id,
        currency: 'USD',
        balance: 1000
      });

      // User2 tries to access User1's account
      const response = await request(app)
        .get(`/api/v1/accounts/${user1Account._id}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(response.status).toBe(403);
    });

    test('Prevent cross-tenant data modification', async () => {
      // Create transaction for user1
      const user1Transaction = await Transaction.create({
        userId: user1._id,
        tenantId: branch1._id,
        amount: 1000,
        currency: 'USD',
        transactionType: 'EXCHANGE',
        status: 'PENDING'
      });

      // User2 tries to modify User1's transaction
      const response = await request(app)
        .put(`/api/v1/transactions/${user1Transaction._id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          status: 'COMPLETED'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Tenant Hierarchy Service Tests', () => {
    test('Validate parent-child relationships', async () => {
      const isParent = await TenantHierarchyService.isParentTenant(
        exchange1._id,
        branch1._id
      );
      expect(isParent).toBe(true);

      const isNotParent = await TenantHierarchyService.isParentTenant(
        exchange1._id,
        branch2._id
      );
      expect(isNotParent).toBe(false);
    });

    test('Get accessible tenants for different user roles', async () => {
      // Super admin should have access to all tenants
      const superAdminTenants = await TenantHierarchyService.getAccessibleTenants(superAdmin._id);
      expect(superAdminTenants.length).toBeGreaterThan(0);

      // Exchange admin should have access to their tenant and child tenants
      const exchange1User = await User.findOne({ email: 'exchange1@test.com' });
      const exchange1Tenants = await TenantHierarchyService.getAccessibleTenants(exchange1User._id);
      expect(exchange1Tenants.some(t => t._id.toString() === exchange1._id.toString())).toBe(true);
      expect(exchange1Tenants.some(t => t._id.toString() === branch1._id.toString())).toBe(true);
    });

    test('Validate user tenant access', async () => {
      const branch1User = await User.findOne({ email: 'branch1@test.com' });
      
      // Should have access to their own tenant
      const ownAccess = await TenantHierarchyService.validateUserTenantAccess(
        branch1User._id,
        branch1._id
      );
      expect(ownAccess.hasAccess).toBe(true);

      // Should not have access to other tenants
      const otherAccess = await TenantHierarchyService.validateUserTenantAccess(
        branch1User._id,
        branch2._id
      );
      expect(otherAccess.hasAccess).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    test('Handle large number of tenants efficiently', async () => {
      const startTime = Date.now();
      
      // Create 100 child tenants
      const childTenants = [];
      for (let i = 0; i < 100; i++) {
        childTenants.push({
          name: `Child Tenant ${i}`,
          level: 2,
          parent: exchange1._id,
          owner: superAdmin._id,
          isActive: true
        });
      }
      
      await Tenant.insertMany(childTenants);
      
      // Test hierarchy access performance
      const exchange1User = await User.findOne({ email: 'exchange1@test.com' });
      const accessibleTenants = await TenantHierarchyService.getAccessibleTenants(exchange1User._id);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(accessibleTenants.length).toBeGreaterThan(100);
    });

    test('Handle large number of transactions with tenant filtering', async () => {
      // Create 1000 transactions for different tenants
      const transactions = [];
      for (let i = 0; i < 1000; i++) {
        const tenantId = i % 2 === 0 ? branch1._id : branch2._id;
        const userId = i % 2 === 0 ? user1._id : user2._id;
        
        transactions.push({
          userId,
          tenantId,
          amount: Math.random() * 10000,
          currency: 'USD',
          transactionType: 'EXCHANGE',
          status: 'COMPLETED'
        });
      }
      
      await Transaction.insertMany(transactions);
      
      const startTime = Date.now();
      
      // Test transaction retrieval with tenant filtering
      const response = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${user1Token}`);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      
      // Should only return transactions for user1's tenant
      const userTransactions = response.body;
      userTransactions.forEach(transaction => {
        expect(transaction.tenantId).toBe(branch1._id.toString());
      });
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