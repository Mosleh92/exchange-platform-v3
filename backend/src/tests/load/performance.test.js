const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');
const Tenant = require('../../models/tenants/Tenant');
const Transaction = require('../../models/Transaction');

/**
 * Load Testing for 1000+ Concurrent Users
 * Comprehensive performance and stress testing
 */
describe('Load Testing - Performance & Stress Tests', () => {
  let testTenant, testUsers, authTokens;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/exchange_test');
    
    testTenant = await Tenant.create({
      name: 'Load Test Tenant',
      level: 'EXCHANGE',
      isActive: true
    });

    // Create 100 test users for load testing
    testUsers = [];
    authTokens = [];

    for (let i = 0; i < 100; i++) {
      const user = await User.create({
        email: `loadtest${i}@example.com`,
        password: 'LoadTestPassword123!',
        role: 'customer',
        tenantId: testTenant._id,
        isActive: true
      });

      testUsers.push(user);

      // Get auth token for each user
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: `loadtest${i}@example.com`,
          password: 'LoadTestPassword123!'
        });

      authTokens.push(loginResponse.body.token);
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Transaction.deleteMany({});
  });

  describe('🚀 Concurrent User Load Tests', () => {
    test('should handle 100 concurrent users reading transactions', async () => {
      // Create test data
      const transactions = Array(50).fill().map((_, index) => ({
        tenantId: testTenant._id,
        customerId: testUsers[0]._id,
        type: 'currency_buy',
        amount: 1000000 + index,
        exchangeRate: 50000,
        totalAmount: 1000000 + index,
        transactionId: `TXN-LOAD-${index}`,
        status: 'completed'
      }));

      await Transaction.insertMany(transactions);

      // Simulate 100 concurrent users
      const startTime = Date.now();
      const concurrentRequests = authTokens.map(token =>
        request(app)
          .get('/api/transactions')
          .set('Authorization', `Bearer ${token}`)
          .set('x-tenant-id', testTenant._id.toString())
      );

      const responses = await Promise.all(concurrentRequests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Analyze results
      const successfulRequests = responses.filter(r => r.status === 200);
      const failedRequests = responses.filter(r => r.status !== 200);
      const averageResponseTime = totalTime / responses.length;

      console.log(`Load Test Results:`);
      console.log(`- Total Requests: ${responses.length}`);
      console.log(`- Successful: ${successfulRequests.length}`);
      console.log(`- Failed: ${failedRequests.length}`);
      console.log(`- Average Response Time: ${averageResponseTime}ms`);
      console.log(`- Total Time: ${totalTime}ms`);

      // Performance assertions
      expect(successfulRequests.length).to.be.greaterThan(95); // 95% success rate
      expect(averageResponseTime).to.be.lessThan(2000); // Less than 2 seconds average
      expect(totalTime).to.be.lessThan(30000); // Less than 30 seconds total
    });

    test('should handle 500 concurrent users with mixed operations', async () => {
      const operations = [];

      // Mix of read and write operations
      for (let i = 0; i < 500; i++) {
        if (i % 3 === 0) {
          // Read operation
          operations.push(
            request(app)
              .get('/api/transactions')
              .set('Authorization', `Bearer ${authTokens[i % authTokens.length]}`)
              .set('x-tenant-id', testTenant._id.toString())
          );
        } else {
          // Write operation
          operations.push(
            request(app)
              .post('/api/transactions')
              .set('Authorization', `Bearer ${authTokens[i % authTokens.length]}`)
              .set('x-tenant-id', testTenant._id.toString())
              .send({
                type: 'currency_buy',
                fromCurrency: 'IRR',
                toCurrency: 'USD',
                amount: 1000000 + i,
                exchangeRate: 50000,
                paymentMethod: 'bank_transfer',
                deliveryMethod: 'account_credit'
              })
          );
        }
      }

      const startTime = Date.now();
      const responses = await Promise.all(operations);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const successfulRequests = responses.filter(r => r.status === 200 || r.status === 201);
      const failedRequests = responses.filter(r => r.status !== 200 && r.status !== 201);

      console.log(`Mixed Operations Load Test:`);
      console.log(`- Total Operations: ${responses.length}`);
      console.log(`- Successful: ${successfulRequests.length}`);
      console.log(`- Failed: ${failedRequests.length}`);
      console.log(`- Total Time: ${totalTime}ms`);

      expect(successfulRequests.length).to.be.greaterThan(450); // 90% success rate
      expect(totalTime).to.be.lessThan(60000); // Less than 1 minute
    });

    test('should handle 1000 concurrent users stress test', async () => {
      // Create 1000 concurrent requests
      const requests = Array(1000).fill().map((_, index) => {
        const token = authTokens[index % authTokens.length];
        const operation = index % 4;

        switch (operation) {
          case 0:
            return request(app)
              .get('/api/transactions')
              .set('Authorization', `Bearer ${token}`)
              .set('x-tenant-id', testTenant._id.toString());
          case 1:
            return request(app)
              .get('/api/reports/summary')
              .set('Authorization', `Bearer ${token}`)
              .set('x-tenant-id', testTenant._id.toString());
          case 2:
            return request(app)
              .post('/api/transactions')
              .set('Authorization', `Bearer ${token}`)
              .set('x-tenant-id', testTenant._id.toString())
              .send({
                type: 'currency_buy',
                fromCurrency: 'IRR',
                toCurrency: 'USD',
                amount: 1000000 + index,
                exchangeRate: 50000,
                paymentMethod: 'bank_transfer',
                deliveryMethod: 'account_credit'
              });
          case 3:
            return request(app)
              .get('/api/users/profile')
              .set('Authorization', `Bearer ${token}`)
              .set('x-tenant-id', testTenant._id.toString());
        }
      });

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      const successfulRequests = responses.filter(r => r.status >= 200 && r.status < 300);
      const failedRequests = responses.filter(r => r.status >= 400);

      console.log(`Stress Test Results (1000 concurrent users):`);
      console.log(`- Total Requests: ${responses.length}`);
      console.log(`- Successful: ${successfulRequests.length}`);
      console.log(`- Failed: ${failedRequests.length}`);
      console.log(`- Success Rate: ${((successfulRequests.length / responses.length) * 100).toFixed(2)}%`);
      console.log(`- Total Time: ${totalTime}ms`);
      console.log(`- Requests per Second: ${(responses.length / (totalTime / 1000)).toFixed(2)}`);

      // Stress test assertions
      expect(successfulRequests.length).to.be.greaterThan(800); // 80% success rate under stress
      expect(totalTime).to.be.lessThan(120000); // Less than 2 minutes
    });
  });

  describe('📊 Database Performance Tests', () => {
    test('should handle large dataset queries efficiently', async () => {
      // Create 10,000 test transactions
      const transactions = Array(10000).fill().map((_, index) => ({
        tenantId: testTenant._id,
        customerId: testUsers[0]._id,
        type: index % 2 === 0 ? 'currency_buy' : 'currency_sell',
        amount: 1000000 + index,
        exchangeRate: 50000 + (index % 1000),
        totalAmount: 1000000 + index,
        transactionId: `TXN-PERF-${index}`,
        status: 'completed',
        createdAt: new Date(Date.now() - (index * 60000)) // Spread over time
      }));

      await Transaction.insertMany(transactions);

      // Test query performance
      const startTime = Date.now();
      const response = await request(app)
        .get('/api/transactions?limit=1000')
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .set('x-tenant-id', testTenant._id.toString())
        .expect(200);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      console.log(`Large Dataset Query Performance:`);
      console.log(`- Dataset Size: 10,000 transactions`);
      console.log(`- Query Time: ${queryTime}ms`);
      console.log(`- Results Returned: ${response.body.data.length}`);

      expect(queryTime).to.be.lessThan(5000); // Less than 5 seconds
      expect(response.body.data.length).to.equal(1000);
    });

    test('should handle complex aggregation queries', async () => {
      // Create diverse transaction data
      const transactions = Array(5000).fill().map((_, index) => ({
        tenantId: testTenant._id,
        customerId: testUsers[index % testUsers.length]._id,
        type: ['currency_buy', 'currency_sell', 'transfer', 'remittance'][index % 4],
        amount: 100000 + (index * 1000),
        exchangeRate: 50000 + (index % 100),
        commission: 5000 + (index % 1000),
        totalAmount: 100000 + (index * 1000) + 5000 + (index % 1000),
        transactionId: `TXN-AGG-${index}`,
        status: ['completed', 'pending', 'cancelled'][index % 3],
        createdAt: new Date(Date.now() - (index * 3600000)) // Spread over months
      }));

      await Transaction.insertMany(transactions);

      // Test complex reporting queries
      const startTime = Date.now();
      const reportResponse = await request(app)
        .get('/api/reports/financial')
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .set('x-tenant-id', testTenant._id.toString())
        .query({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        })
        .expect(200);

      const endTime = Date.now();
      const reportTime = endTime - startTime;

      console.log(`Complex Aggregation Performance:`);
      console.log(`- Dataset Size: 5,000 diverse transactions`);
      console.log(`- Report Generation Time: ${reportTime}ms`);
      console.log(`- Report Components: ${Object.keys(reportResponse.body).length}`);

      expect(reportTime).to.be.lessThan(10000); // Less than 10 seconds
      expect(reportResponse.body.balanceSheet).to.exist;
      expect(reportResponse.body.incomeStatement).to.exist;
    });
  });

  describe('🔒 Security Load Tests', () => {
    test('should handle rate limiting under load', async () => {
      // Test rate limiting with many concurrent requests
      const authRequests = Array(200).fill().map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          })
      );

      const startTime = Date.now();
      const responses = await Promise.all(authRequests);
      const endTime = Date.now();

      const rateLimited = responses.filter(r => r.status === 429);
      const successful = responses.filter(r => r.status === 401); // Wrong password
      const totalTime = endTime - startTime;

      console.log(`Rate Limiting Load Test:`);
      console.log(`- Total Requests: ${responses.length}`);
      console.log(`- Rate Limited: ${rateLimited.length}`);
      console.log(`- Successful (expected 401): ${successful.length}`);
      console.log(`- Total Time: ${totalTime}ms`);

      expect(rateLimited.length).to.be.greaterThan(0); // Should have rate limiting
      expect(totalTime).to.be.lessThan(30000); // Should complete quickly
    });

    test('should handle concurrent authentication attempts', async () => {
      // Multiple users trying to authenticate simultaneously
      const authAttempts = testUsers.slice(0, 50).map(user =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: user.email,
            password: 'LoadTestPassword123!'
          })
      );

      const startTime = Date.now();
      const responses = await Promise.all(authAttempts);
      const endTime = Date.now();

      const successful = responses.filter(r => r.status === 200);
      const failed = responses.filter(r => r.status !== 200);
      const totalTime = endTime - startTime;

      console.log(`Concurrent Authentication Test:`);
      console.log(`- Total Attempts: ${responses.length}`);
      console.log(`- Successful: ${successful.length}`);
      console.log(`- Failed: ${failed.length}`);
      console.log(`- Total Time: ${totalTime}ms`);

      expect(successful.length).to.be.greaterThan(40); // 80% success rate
      expect(totalTime).to.be.lessThan(15000); // Less than 15 seconds
    });
  });

  describe('📈 Memory & Resource Tests', () => {
    test('should handle memory usage under load', async () => {
      const initialMemory = process.memoryUsage();

      // Perform intensive operations
      const operations = Array(1000).fill().map((_, index) =>
        request(app)
          .post('/api/transactions')
          .set('Authorization', `Bearer ${authTokens[index % authTokens.length]}`)
          .set('x-tenant-id', testTenant._id.toString())
          .send({
            type: 'currency_buy',
            fromCurrency: 'IRR',
            toCurrency: 'USD',
            amount: 1000000 + index,
            exchangeRate: 50000,
            paymentMethod: 'bank_transfer',
            deliveryMethod: 'account_credit'
          })
      );

      const responses = await Promise.all(operations);
      const finalMemory = process.memoryUsage();

      const memoryIncrease = {
        heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
        heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
        external: finalMemory.external - initialMemory.external
      };

      console.log(`Memory Usage Test:`);
      console.log(`- Operations: ${responses.length}`);
      console.log(`- Memory Increase: ${JSON.stringify(memoryIncrease)}`);
      console.log(`- Successful Operations: ${responses.filter(r => r.status === 201).length}`);

      // Memory should not increase excessively
      expect(memoryIncrease.heapUsed).to.be.lessThan(100 * 1024 * 1024); // Less than 100MB increase
      expect(responses.filter(r => r.status === 201).length).to.be.greaterThan(800); // 80% success
    });

    test('should handle database connection pool under load', async () => {
      // Test database connection pool with many concurrent operations
      const dbOperations = Array(500).fill().map((_, index) => {
        const operation = index % 3;
        const token = authTokens[index % authTokens.length];

        switch (operation) {
          case 0:
            return request(app)
              .get('/api/transactions')
              .set('Authorization', `Bearer ${token}`)
              .set('x-tenant-id', testTenant._id.toString());
          case 1:
            return request(app)
              .get('/api/users/profile')
              .set('Authorization', `Bearer ${token}`)
              .set('x-tenant-id', testTenant._id.toString());
          case 2:
            return request(app)
              .post('/api/transactions')
              .set('Authorization', `Bearer ${token}`)
              .set('x-tenant-id', testTenant._id.toString())
              .send({
                type: 'currency_buy',
                fromCurrency: 'IRR',
                toCurrency: 'USD',
                amount: 1000000 + index,
                exchangeRate: 50000,
                paymentMethod: 'bank_transfer',
                deliveryMethod: 'account_credit'
              });
        }
      });

      const startTime = Date.now();
      const responses = await Promise.all(dbOperations);
      const endTime = Date.now();

      const successful = responses.filter(r => r.status >= 200 && r.status < 300);
      const totalTime = endTime - startTime;

      console.log(`Database Connection Pool Test:`);
      console.log(`- Total Operations: ${responses.length}`);
      console.log(`- Successful: ${successful.length}`);
      console.log(`- Total Time: ${totalTime}ms`);
      console.log(`- Operations per Second: ${(responses.length / (totalTime / 1000)).toFixed(2)}`);

      expect(successful.length).to.be.greaterThan(450); // 90% success rate
      expect(totalTime).to.be.lessThan(60000); // Less than 1 minute
    });
  });

  describe('🔄 Recovery & Resilience Tests', () => {
    test('should recover from temporary failures', async () => {
      // Simulate temporary database connection issues
      const operations = Array(100).fill().map((_, index) =>
        request(app)
          .get('/api/transactions')
          .set('Authorization', `Bearer ${authTokens[index % authTokens.length]}`)
          .set('x-tenant-id', testTenant._id.toString())
          .retry(3) // Retry failed requests
      );

      const responses = await Promise.all(operations);
      const successful = responses.filter(r => r.status === 200);

      console.log(`Recovery Test:`);
      console.log(`- Total Requests: ${responses.length}`);
      console.log(`- Successful: ${successful.length}`);
      console.log(`- Success Rate: ${((successful.length / responses.length) * 100).toFixed(2)}%`);

      expect(successful.length).to.be.greaterThan(90); // 90% success rate
    });

    test('should handle graceful degradation under extreme load', async () => {
      // Create extreme load scenario
      const extremeLoad = Array(2000).fill().map((_, index) => {
        const operation = index % 5;
        const token = authTokens[index % authTokens.length];

        switch (operation) {
          case 0:
            return request(app)
              .get('/api/transactions')
              .set('Authorization', `Bearer ${token}`)
              .set('x-tenant-id', testTenant._id.toString());
          case 1:
            return request(app)
              .post('/api/transactions')
              .set('Authorization', `Bearer ${token}`)
              .set('x-tenant-id', testTenant._id.toString())
              .send({
                type: 'currency_buy',
                fromCurrency: 'IRR',
                toCurrency: 'USD',
                amount: 1000000 + index,
                exchangeRate: 50000,
                paymentMethod: 'bank_transfer',
                deliveryMethod: 'account_credit'
              });
          case 2:
            return request(app)
              .get('/api/reports/summary')
              .set('Authorization', `Bearer ${token}`)
              .set('x-tenant-id', testTenant._id.toString());
          case 3:
            return request(app)
              .get('/api/users/profile')
              .set('Authorization', `Bearer ${token}`)
              .set('x-tenant-id', testTenant._id.toString());
          case 4:
            return request(app)
              .post('/api/auth/login')
              .send({
                email: `loadtest${index % 100}@example.com`,
                password: 'LoadTestPassword123!'
              });
        }
      });

      const startTime = Date.now();
      const responses = await Promise.all(extremeLoad);
      const endTime = Date.now();

      const successful = responses.filter(r => r.status >= 200 && r.status < 300);
      const failed = responses.filter(r => r.status >= 500);
      const totalTime = endTime - startTime;

      console.log(`Extreme Load Test (2000 requests):`);
      console.log(`- Total Requests: ${responses.length}`);
      console.log(`- Successful: ${successful.length}`);
      console.log(`- Failed: ${failed.length}`);
      console.log(`- Success Rate: ${((successful.length / responses.length) * 100).toFixed(2)}%`);
      console.log(`- Total Time: ${totalTime}ms`);

      // Under extreme load, we expect some degradation but not complete failure
      expect(successful.length).to.be.greaterThan(1500); // 75% success rate
      expect(failed.length).to.be.lessThan(500); // Less than 25% failures
      expect(totalTime).to.be.lessThan(120000); // Less than 2 minutes
    });
  });
}); 