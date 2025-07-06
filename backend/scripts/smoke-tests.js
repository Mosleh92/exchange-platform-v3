#!/usr/bin/env node

/**
 * Smoke Tests for Production Deployment
 * 
 * These tests verify that the core functionality works after deployment
 */

const axios = require('axios');
const { program } = require('commander');

// Configuration
const environments = {
  staging: {
    baseURL: process.env.STAGING_URL || 'https://staging.exchange-platform.com',
    testUser: {
      email: 'smoke-test@staging.com',
      password: 'SmokeTest@123'
    }
  },
  production: {
    baseURL: process.env.PRODUCTION_URL || 'https://exchange-platform.com',
    testUser: {
      email: 'smoke-test@production.com',
      password: 'SmokeTest@123'
    }
  }
};

class SmokeTests {
  constructor(environment) {
    this.config = environments[environment];
    if (!this.config) {
      throw new Error(`Invalid environment: ${environment}`);
    }
    
    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: 30000,
      validateStatus: () => true // Don't throw on HTTP errors
    });
    
    this.authToken = null;
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      tests: []
    };
  }

  async run() {
    console.log(`🔍 Running smoke tests for ${this.config.baseURL}\n`);
    
    try {
      await this.testHealthEndpoint();
      await this.testAuthentication();
      await this.testTenantIsolation();
      await this.testBasicCRUD();
      await this.testPaymentFlow();
      await this.testReporting();
      
      this.printResults();
      
      if (this.results.failed > 0) {
        process.exit(1);
      }
      
    } catch (error) {
      console.error('💥 Smoke tests failed with error:', error.message);
      process.exit(1);
    }
  }

  async testHealthEndpoint() {
    await this.test('Health Endpoint', async () => {
      const response = await this.client.get('/health');
      
      this.assert(response.status === 200, 'Health endpoint should return 200');
      this.assert(response.data.status === 'healthy', 'Health status should be healthy');
      this.assert(response.data.components, 'Health response should include components');
      this.assert(response.data.components.database.status === 'healthy', 'Database should be healthy');
      this.assert(response.data.components.redis.status === 'healthy', 'Redis should be healthy');
    });
  }

  async testAuthentication() {
    await this.test('Authentication Flow', async () => {
      // Test login
      const loginResponse = await this.client.post('/api/auth/login', {
        email: this.config.testUser.email,
        password: this.config.testUser.password
      });
      
      this.assert(loginResponse.status === 200, 'Login should succeed');
      this.assert(loginResponse.data.success === true, 'Login response should be successful');
      this.assert(loginResponse.data.data.accessToken, 'Login should return access token');
      this.assert(loginResponse.data.data.refreshToken, 'Login should return refresh token');
      
      this.authToken = loginResponse.data.data.accessToken;
      
      // Test protected endpoint
      const profileResponse = await this.client.get('/api/users/profile', {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      this.assert(profileResponse.status === 200, 'Protected endpoint should work with valid token');
      this.assert(profileResponse.data.data.user, 'Profile response should include user data');
      
      // Test refresh token
      const refreshResponse = await this.client.post('/api/auth/refresh', {
        refreshToken: loginResponse.data.data.refreshToken
      });
      
      this.assert(refreshResponse.status === 200, 'Token refresh should succeed');
      this.assert(refreshResponse.data.data.accessToken, 'Refresh should return new access token');
    });
  }

  async testTenantIsolation() {
    await this.test('Tenant Isolation', async () => {
      if (!this.authToken) {
        throw new Error('Authentication required for tenant isolation test');
      }
      
      // Get current user's data
      const profileResponse = await this.client.get('/api/users/profile', {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      const currentUser = profileResponse.data.data.user;
      
      // Try to access data from different tenant (should fail)
      const wrongTenantId = '507f1f77bcf86cd799439011'; // Random ObjectId
      
      const attemptResponse = await this.client.get(`/api/tenants/${wrongTenantId}/users`, {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      this.assert(
        attemptResponse.status === 403 || attemptResponse.status === 404,
        'Should not allow access to different tenant data'
      );
      
      // Verify can access own tenant data
      if (currentUser.tenantId) {
        const ownTenantResponse = await this.client.get(`/api/tenants/${currentUser.tenantId}/users`, {
          headers: { Authorization: `Bearer ${this.authToken}` }
        });
        
        this.assert(ownTenantResponse.status === 200, 'Should allow access to own tenant data');
      }
    });
  }

  async testBasicCRUD() {
    await this.test('Basic CRUD Operations', async () => {
      if (!this.authToken) {
        throw new Error('Authentication required for CRUD test');
      }
      
      // Test reading data
      const transactionsResponse = await this.client.get('/api/transactions', {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      this.assert(transactionsResponse.status === 200, 'Should be able to read transactions');
      this.assert(Array.isArray(transactionsResponse.data.data.transactions), 'Transactions should be an array');
      
      // Test user management
      const usersResponse = await this.client.get('/api/users', {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      // Should succeed for admin users, might fail for customers (which is expected)
      if (usersResponse.status === 200) {
        this.assert(Array.isArray(usersResponse.data.data.users), 'Users should be an array');
      } else {
        this.assert(usersResponse.status === 403, 'Non-admin users should get 403 for user list');
      }
    });
  }

  async testPaymentFlow() {
    await this.test('Payment System', async () => {
      if (!this.authToken) {
        throw new Error('Authentication required for payment test');
      }
      
      // Test payment methods endpoint
      const methodsResponse = await this.client.get('/api/payments/methods', {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      this.assert(methodsResponse.status === 200, 'Should be able to get payment methods');
      
      // Test payment history
      const historyResponse = await this.client.get('/api/payments', {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      this.assert(historyResponse.status === 200, 'Should be able to get payment history');
      this.assert(Array.isArray(historyResponse.data.data.payments), 'Payments should be an array');
    });
  }

  async testReporting() {
    await this.test('Reporting System', async () => {
      if (!this.authToken) {
        throw new Error('Authentication required for reporting test');
      }
      
      // Test dashboard stats
      const statsResponse = await this.client.get('/api/dashboard/stats', {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      this.assert(statsResponse.status === 200, 'Should be able to get dashboard stats');
      this.assert(statsResponse.data.data.statistics, 'Stats response should include statistics');
      
      // Test recent transactions
      const recentResponse = await this.client.get('/api/dashboard/recent-transactions', {
        headers: { Authorization: `Bearer ${this.authToken}` }
      });
      
      this.assert(recentResponse.status === 200, 'Should be able to get recent transactions');
      this.assert(Array.isArray(recentResponse.data.data.transactions), 'Recent transactions should be an array');
    });
  }

  async test(name, testFunction) {
    this.results.total++;
    
    try {
      console.log(`Running: ${name}`);
      await testFunction();
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASSED', error: null });
      console.log(`✅ ${name} - PASSED\n`);
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', error: error.message });
      console.log(`❌ ${name} - FAILED: ${error.message}\n`);
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('SMOKE TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
    
    if (this.results.failed > 0) {
      console.log('\nFAILED TESTS:');
      this.results.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`❌ ${test.name}: ${test.error}`);
        });
    }
    
    console.log('\n' + '='.repeat(50));
    
    if (this.results.failed === 0) {
      console.log('🎉 All smoke tests passed!');
    } else {
      console.log('💥 Some smoke tests failed!');
    }
  }
}

// CLI Setup
program
  .name('smoke-tests')
  .description('Run smoke tests for Exchange Platform')
  .option('-e, --env <environment>', 'Environment to test (staging|production)', 'staging')
  .action(async (options) => {
    const smokeTests = new SmokeTests(options.env);
    await smokeTests.run();
  });

program.parse();
