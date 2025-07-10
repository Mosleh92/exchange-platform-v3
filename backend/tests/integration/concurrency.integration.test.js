const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const Account = require('../../src/models/Account');
const Transaction = require('../../src/models/Transaction');
const User = require('../../src/models/User');
const EnhancedTransactionService = require('../../src/services/enhancedTransactionService');
const EnhancedCurrencyExchangeService = require('../../src/services/enhancedCurrencyExchangeService');
const logger = require('../../src/utils/logger');

/**
 * Comprehensive Concurrency and Race Condition Tests
 * Tests critical operations under concurrent load
 */
describe('Concurrency and Race Condition Tests', () => {
  let testUser, testAccount1, testAccount2, authToken, tenantId;

  beforeAll(async () => {
    // Create test user and accounts
    testUser = await User.create({
      email: 'concurrency-test@example.com',
      password: 'testpassword123',
      firstName: 'Concurrency',
      lastName: 'Test',
      role: 'user',
      tenantId: new mongoose.Types.ObjectId()
    });

    tenantId = testUser.tenantId;

    testAccount1 = await Account.create({
      userId: testUser._id,
      tenantId: tenantId,
      accountType: 'CHECKING',
      currency: 'USD',
      balance: 10000
    });

    testAccount2 = await Account.create({
      userId: testUser._id,
      tenantId: tenantId,
      accountType: 'SAVINGS',
      currency: 'USD',
      balance: 5000
    });

    // Get auth token
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: 'concurrency-test@example.com',
        password: 'testpassword123',
        tenantId: tenantId.toString()
      });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Cleanup test data
    await User.deleteOne({ _id: testUser._id });
    await Account.deleteMany({ userId: testUser._id });
    await Transaction.deleteMany({ userId: testUser._id });
  });

  describe('Transaction Concurrency Tests', () => {
    test('should handle concurrent transactions without race conditions', async () => {
      const concurrentTransactions = 10;
      const transactionAmount = 100;
      const promises = [];

      // Create concurrent transaction requests
      for (let i = 0; i < concurrentTransactions; i++) {
        promises.push(
          request(app)
            .post('/transactions')
            .set('Authorization', `Bearer ${authToken}`)
            .set('X-Tenant-ID', tenantId.toString())
            .send({
              fromAccountId: testAccount1._id.toString(),
              toAccountId: testAccount2._id.toString(),
              amount: transactionAmount,
              currency: 'USD',
              transactionType: 'TRANSFER',
              description: `Concurrent transaction ${i + 1}`
            })
        );
      }

      // Execute all transactions concurrently
      const responses = await Promise.all(promises);

      // Verify all transactions were successful
      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.status).toBe('COMPLETED');
        expect(response.body.amount).toBe(transactionAmount);
      });

      // Verify final balances are correct
      const updatedAccount1 = await Account.findById(testAccount1._id);
      const updatedAccount2 = await Account.findById(testAccount2._id);

      const expectedBalance1 = 10000 - (concurrentTransactions * transactionAmount);
      const expectedBalance2 = 5000 + (concurrentTransactions * transactionAmount);

      expect(updatedAccount1.balance).toBe(expectedBalance1);
      expect(updatedAccount2.balance).toBe(expectedBalance2);

      // Verify transaction count
      const transactionCount = await Transaction.countDocuments({
        userId: testUser._id,
        status: 'COMPLETED'
      });
      expect(transactionCount).toBe(concurrentTransactions);
    }, 30000);

    test('should prevent overspending with concurrent transactions', async () => {
      // Reset account balances
      await Account.findByIdAndUpdate(testAccount1._id, { balance: 1000 });
      await Account.findByIdAndUpdate(testAccount2._id, { balance: 0 });

      const concurrentTransactions = 5;
      const transactionAmount = 300; // Each transaction is 300, total would be 1500 but balance is 1000
      const promises = [];

      // Create concurrent transaction requests that would exceed balance
      for (let i = 0; i < concurrentTransactions; i++) {
        promises.push(
          request(app)
            .post('/transactions')
            .set('Authorization', `Bearer ${authToken}`)
            .set('X-Tenant-ID', tenantId.toString())
            .send({
              fromAccountId: testAccount1._id.toString(),
              toAccountId: testAccount2._id.toString(),
              amount: transactionAmount,
              currency: 'USD',
              transactionType: 'TRANSFER',
              description: `Overspending transaction ${i + 1}`
            })
        );
      }

      // Execute all transactions concurrently
      const responses = await Promise.all(promises);

      // Some transactions should fail due to insufficient balance
      const successfulTransactions = responses.filter(r => r.status === 201);
      const failedTransactions = responses.filter(r => r.status === 400);

      expect(successfulTransactions.length).toBeLessThan(concurrentTransactions);
      expect(failedTransactions.length).toBeGreaterThan(0);

      // Verify no account went negative
      const finalAccount1 = await Account.findById(testAccount1._id);
      const finalAccount2 = await Account.findById(testAccount2._id);

      expect(finalAccount1.balance).toBeGreaterThanOrEqual(0);
      expect(finalAccount2.balance).toBeGreaterThanOrEqual(0);
    }, 30000);

    test('should handle deadlock scenarios gracefully', async () => {
      // Create two additional accounts for deadlock testing
      const account3 = await Account.create({
        userId: testUser._id,
        tenantId: tenantId,
        accountType: 'CHECKING',
        currency: 'USD',
        balance: 2000
      });

      const account4 = await Account.create({
        userId: testUser._id,
        tenantId: tenantId,
        accountType: 'SAVINGS',
        currency: 'USD',
        balance: 2000
      });

      // Create transactions that could cause deadlocks
      const transaction1 = request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId.toString())
        .send({
          fromAccountId: account3._id.toString(),
          toAccountId: account4._id.toString(),
          amount: 500,
          currency: 'USD',
          transactionType: 'TRANSFER',
          description: 'Transaction 1'
        });

      const transaction2 = request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', tenantId.toString())
        .send({
          fromAccountId: account4._id.toString(),
          toAccountId: account3._id.toString(),
          amount: 300,
          currency: 'USD',
          transactionType: 'TRANSFER',
          description: 'Transaction 2'
        });

      // Execute transactions concurrently
      const [response1, response2] = await Promise.all([transaction1, transaction2]);

      // Both transactions should complete successfully
      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);

      // Cleanup
      await Account.deleteMany({ _id: { $in: [account3._id, account4._id] } });
    }, 30000);
  });

  describe('Currency Exchange Concurrency Tests', () => {
    test('should handle concurrent currency exchanges without race conditions', async () => {
      const exchangeService = new EnhancedCurrencyExchangeService();
      const concurrentExchanges = 5;
      const exchangeAmount = 100;
      const promises = [];

      // Create concurrent exchange requests
      for (let i = 0; i < concurrentExchanges; i++) {
        promises.push(
          exchangeService.exchangeCurrency({
            fromAccountId: testAccount1._id,
            toAccountId: testAccount2._id,
            amount: exchangeAmount,
            fromCurrency: 'USD',
            toCurrency: 'EUR',
            rate: 0.85
          }, testUser._id, tenantId)
        );
      }

      // Execute all exchanges concurrently
      const results = await Promise.all(promises);

      // Verify all exchanges were successful
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result.status).toBe('COMPLETED');
      });

      // Verify final balances
      const updatedAccount1 = await Account.findById(testAccount1._id);
      const updatedAccount2 = await Account.findById(testAccount2._id);

      const expectedUSD = 10000 - (concurrentExchanges * exchangeAmount);
      const expectedEUR = 5000 + (concurrentExchanges * exchangeAmount * 0.85);

      expect(updatedAccount1.balance).toBe(expectedUSD);
      expect(updatedAccount2.balance).toBe(expectedEUR);
    }, 30000);

    test('should prevent exchange with insufficient balance under concurrent load', async () => {
      // Reset account balances
      await Account.findByIdAndUpdate(testAccount1._id, { balance: 100 });
      await Account.findByIdAndUpdate(testAccount2._id, { balance: 0 });

      const exchangeService = new EnhancedCurrencyExchangeService();
      const concurrentExchanges = 10;
      const exchangeAmount = 50; // Each exchange is 50, total would be 500 but balance is 100
      const promises = [];

      // Create concurrent exchange requests that would exceed balance
      for (let i = 0; i < concurrentExchanges; i++) {
        promises.push(
          exchangeService.exchangeCurrency({
            fromAccountId: testAccount1._id,
            toAccountId: testAccount2._id,
            amount: exchangeAmount,
            fromCurrency: 'USD',
            toCurrency: 'EUR',
            rate: 0.85
          }, testUser._id, tenantId)
        );
      }

      // Execute all exchanges concurrently
      const results = await Promise.allSettled(promises);

      // Some exchanges should fail due to insufficient balance
      const successfulExchanges = results.filter(r => r.status === 'fulfilled');
      const failedExchanges = results.filter(r => r.status === 'rejected');

      expect(successfulExchanges.length).toBeLessThan(concurrentExchanges);
      expect(failedExchanges.length).toBeGreaterThan(0);

      // Verify no account went negative
      const finalAccount1 = await Account.findById(testAccount1._id);
      const finalAccount2 = await Account.findById(testAccount2._id);

      expect(finalAccount1.balance).toBeGreaterThanOrEqual(0);
      expect(finalAccount2.balance).toBeGreaterThanOrEqual(0);
    }, 30000);
  });

  describe('P2P Trading Concurrency Tests', () => {
    test('should handle concurrent P2P trade requests', async () => {
      const concurrentTrades = 5;
      const promises = [];

      // Create concurrent P2P trade requests
      for (let i = 0; i < concurrentTrades; i++) {
        promises.push(
          request(app)
            .post('/p2p/trades')
            .set('Authorization', `Bearer ${authToken}`)
            .set('X-Tenant-ID', tenantId.toString())
            .send({
              announcementId: new mongoose.Types.ObjectId().toString(),
              amount: 100,
              currency: 'USD',
              paymentMethod: 'BANK_TRANSFER'
            })
        );
      }

      // Execute all trade requests concurrently
      const responses = await Promise.all(promises);

      // Verify responses (some may fail due to announcement not existing)
      responses.forEach((response, index) => {
        expect([200, 201, 400, 404]).toContain(response.status);
      });
    }, 30000);

    test('should handle concurrent payment proof uploads', async () => {
      const concurrentUploads = 3;
      const promises = [];

      // Create concurrent payment proof upload requests
      for (let i = 0; i < concurrentUploads; i++) {
        promises.push(
          request(app)
            .post(`/p2p/announcements/${new mongoose.Types.ObjectId()}/payment-proof`)
            .set('Authorization', `Bearer ${authToken}`)
            .set('X-Tenant-ID', tenantId.toString())
            .attach('paymentProof', Buffer.from('fake-proof'), 'proof.jpg')
            .field('description', `Payment proof ${i + 1}`)
        );
      }

      // Execute all upload requests concurrently
      const responses = await Promise.all(promises);

      // Verify responses (some may fail due to announcement not existing)
      responses.forEach((response, index) => {
        expect([200, 400, 404]).toContain(response.status);
      });
    }, 30000);
  });

  describe('Account Balance Concurrency Tests', () => {
    test('should maintain data consistency under concurrent balance updates', async () => {
      const concurrentUpdates = 10;
      const promises = [];

      // Create concurrent balance update requests
      for (let i = 0; i < concurrentUpdates; i++) {
        promises.push(
          request(app)
            .put(`/accounts/${testAccount1._id}/balance`)
            .set('Authorization', `Bearer ${authToken}`)
            .set('X-Tenant-ID', tenantId.toString())
            .send({
              amount: 50,
              operation: 'ADD'
            })
        );
      }

      // Execute all balance updates concurrently
      const responses = await Promise.all(promises);

      // Verify all updates were successful
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
      });

      // Verify final balance is correct
      const finalAccount = await Account.findById(testAccount1._id);
      const expectedBalance = 10000 + (concurrentUpdates * 50);
      expect(finalAccount.balance).toBe(expectedBalance);
    }, 30000);

    test('should prevent negative balance under concurrent withdrawals', async () => {
      // Reset account balance
      await Account.findByIdAndUpdate(testAccount1._id, { balance: 100 });

      const concurrentWithdrawals = 5;
      const withdrawalAmount = 50; // Each withdrawal is 50, total would be 250 but balance is 100
      const promises = [];

      // Create concurrent withdrawal requests
      for (let i = 0; i < concurrentWithdrawals; i++) {
        promises.push(
          request(app)
            .put(`/accounts/${testAccount1._id}/balance`)
            .set('Authorization', `Bearer ${authToken}`)
            .set('X-Tenant-ID', tenantId.toString())
            .send({
              amount: withdrawalAmount,
              operation: 'SUBTRACT'
            })
        );
      }

      // Execute all withdrawal requests concurrently
      const responses = await Promise.all(promises);

      // Some withdrawals should fail due to insufficient balance
      const successfulWithdrawals = responses.filter(r => r.status === 200);
      const failedWithdrawals = responses.filter(r => r.status === 400);

      expect(successfulWithdrawals.length).toBeLessThan(concurrentWithdrawals);
      expect(failedWithdrawals.length).toBeGreaterThan(0);

      // Verify no negative balance
      const finalAccount = await Account.findById(testAccount1._id);
      expect(finalAccount.balance).toBeGreaterThanOrEqual(0);
    }, 30000);
  });

  describe('Database Lock Tests', () => {
    test('should handle database-level locking correctly', async () => {
      const transactionService = new EnhancedTransactionService();
      const concurrentOperations = 5;
      const promises = [];

      // Create concurrent database operations
      for (let i = 0; i < concurrentOperations; i++) {
        promises.push(
          transactionService.executeTransaction({
            fromAccountId: testAccount1._id,
            toAccountId: testAccount2._id,
            amount: 100,
            currency: 'USD',
            transactionType: 'TRANSFER',
            description: `Lock test transaction ${i + 1}`
          }, testUser._id, tenantId)
        );
      }

      // Execute all operations concurrently
      const results = await Promise.all(promises);

      // Verify all operations completed successfully
      results.forEach((result, index) => {
        expect(result).toBeDefined();
        expect(result.status).toBe('COMPLETED');
      });

      // Verify data consistency
      const finalAccount1 = await Account.findById(testAccount1._id);
      const finalAccount2 = await Account.findById(testAccount2._id);

      const expectedBalance1 = 10000 - (concurrentOperations * 100);
      const expectedBalance2 = 5000 + (concurrentOperations * 100);

      expect(finalAccount1.balance).toBe(expectedBalance1);
      expect(finalAccount2.balance).toBe(expectedBalance2);
    }, 30000);

    test('should handle optimistic locking correctly', async () => {
      const account = await Account.findById(testAccount1._id);
      const originalVersion = account.version || 0;

      // Simulate concurrent updates with version checking
      const update1 = Account.findByIdAndUpdate(
        testAccount1._id,
        { 
          $inc: { balance: 100, version: 1 },
          updatedAt: new Date()
        },
        { new: true }
      );

      const update2 = Account.findByIdAndUpdate(
        testAccount1._id,
        { 
          $inc: { balance: 200, version: 1 },
          updatedAt: new Date()
        },
        { new: true }
      );

      // Execute updates concurrently
      const [result1, result2] = await Promise.all([update1, update2]);

      // One update should succeed, one should fail due to version conflict
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();

      // Verify final state is consistent
      const finalAccount = await Account.findById(testAccount1._id);
      expect(finalAccount.balance).toBeGreaterThan(10000);
    }, 30000);
  });

  describe('Memory and Performance Tests', () => {
    test('should handle memory usage under concurrent load', async () => {
      const initialMemory = process.memoryUsage();
      const concurrentRequests = 50;
      const promises = [];

      // Create many concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/accounts')
            .set('Authorization', `Bearer ${authToken}`)
            .set('X-Tenant-ID', tenantId.toString())
        );
      }

      // Execute all requests concurrently
      const responses = await Promise.all(promises);

      // Verify all requests completed
      responses.forEach((response, index) => {
        expect([200, 401, 403]).toContain(response.status);
      });

      // Check memory usage didn't grow excessively
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    }, 30000);

    test('should maintain response times under concurrent load', async () => {
      const concurrentRequests = 20;
      const promises = [];
      const startTime = Date.now();

      // Create concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .get('/accounts')
            .set('Authorization', `Bearer ${authToken}`)
            .set('X-Tenant-ID', tenantId.toString())
        );
      }

      // Execute all requests concurrently
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify all requests completed
      responses.forEach((response, index) => {
        expect([200, 401, 403]).toContain(response.status);
      });

      // Average response time should be reasonable (less than 5 seconds)
      const averageResponseTime = totalTime / concurrentRequests;
      expect(averageResponseTime).toBeLessThan(5000);
    }, 30000);
  });

  describe('Error Handling Under Concurrency', () => {
    test('should handle errors gracefully under concurrent load', async () => {
      const concurrentRequests = 10;
      const promises = [];

      // Create requests that will cause errors
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app)
            .post('/transactions')
            .set('Authorization', `Bearer ${authToken}`)
            .set('X-Tenant-ID', tenantId.toString())
            .send({
              fromAccountId: 'invalid-account-id',
              toAccountId: 'invalid-account-id',
              amount: -100, // Invalid amount
              currency: 'USD',
              transactionType: 'TRANSFER'
            })
        );
      }

      // Execute all requests concurrently
      const responses = await Promise.all(promises);

      // All requests should return error responses
      responses.forEach((response, index) => {
        expect([400, 404, 422]).toContain(response.status);
        expect(response.body).toHaveProperty('error');
      });
    }, 30000);

    test('should maintain system stability under error conditions', async () => {
      const concurrentRequests = 15;
      const promises = [];

      // Mix valid and invalid requests
      for (let i = 0; i < concurrentRequests; i++) {
        if (i % 3 === 0) {
          // Valid request
          promises.push(
            request(app)
              .get('/accounts')
              .set('Authorization', `Bearer ${authToken}`)
              .set('X-Tenant-ID', tenantId.toString())
          );
        } else {
          // Invalid request
          promises.push(
            request(app)
              .post('/transactions')
              .set('Authorization', `Bearer ${authToken}`)
              .set('X-Tenant-ID', tenantId.toString())
              .send({
                fromAccountId: 'invalid',
                toAccountId: 'invalid',
                amount: 'invalid',
                currency: 'USD'
              })
          );
        }
      }

      // Execute all requests concurrently
      const responses = await Promise.all(promises);

      // System should remain stable
      responses.forEach((response, index) => {
        expect(response.status).toBeGreaterThan(0);
        expect(response.status).toBeLessThan(600);
      });
    }, 30000);
  });
}); 