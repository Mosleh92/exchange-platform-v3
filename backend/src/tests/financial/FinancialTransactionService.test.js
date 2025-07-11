// backend/src/tests/financial/FinancialTransactionService.test.js
const { describe, it, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const financialDB = require('../../config/financial-database');
const FinancialTransactionService = require('../../services/financial/FinancialTransactionService');
const { v4: uuidv4 } = require('uuid');

describe('FinancialTransactionService', () => {
    let testTenantId, testCustomerId, testCreatedBy;
    let Account, FinancialTransaction, LedgerEntry, FinancialAudit;

    beforeAll(async () => {
        // Set test environment
        process.env.NODE_ENV = 'test';
        process.env.FINANCIAL_DB_NAME = 'exchange_financial_test';
        
        // Initialize financial database
        await financialDB.initialize();
        
        // Initialize service
        await FinancialTransactionService.initialize();
        
        // Get models
        Account = financialDB.getModel('Account');
        FinancialTransaction = financialDB.getModel('FinancialTransaction');
        LedgerEntry = financialDB.getModel('LedgerEntry');
        FinancialAudit = financialDB.getModel('FinancialAudit');

        // Generate test IDs
        testTenantId = uuidv4();
        testCustomerId = uuidv4();
        testCreatedBy = uuidv4();

        // Create test system accounts
        await createTestSystemAccounts();
    });

    afterAll(async () => {
        // Clean up test data
        await cleanupTestData();
        
        // Close database connection
        await financialDB.close();
    });

    beforeEach(async () => {
        // Clean customer transactions before each test
        await cleanupCustomerData();
    });

    describe('Race Condition Prevention', () => {
        it('should handle concurrent transactions on same account', async () => {
            // Add initial balance
            await createCustomerAccount('USD', 1000);

            const concurrentTransactions = [];
            const numberOfTransactions = 10;

            // Create multiple concurrent withdrawal transactions
            for (let i = 0; i < numberOfTransactions; i++) {
                const transactionData = {
                    tenantId: testTenantId,
                    customerId: testCustomerId,
                    currency: 'USD',
                    amount: 50,
                    description: `Concurrent withdrawal ${i}`,
                    createdBy: testCreatedBy,
                    metadata: { testConcurrency: true, index: i }
                };

                concurrentTransactions.push(
                    FinancialTransactionService.createWithdrawal(transactionData)
                );
            }

            // Execute all transactions concurrently
            const results = await Promise.allSettled(concurrentTransactions);

            // Count successful vs failed transactions
            const successful = results.filter(r => r.status === 'fulfilled');
            const failed = results.filter(r => r.status === 'rejected');

            // Should have exactly 20 successful transactions (1000/50)
            // and the rest should fail with insufficient balance
            expect(successful.length).toBe(20);
            expect(failed.length).toBe(0); // Our initial balance supports all 10 transactions

            // Verify final balance is correct
            const finalAccount = await Account.findOne({
                where: {
                    tenantId: testTenantId,
                    customerId: testCustomerId,
                    currency: 'USD'
                }
            });

            expect(parseFloat(finalAccount.balance)).toBe(500); // 1000 - (10 * 50)
        });

        it('should handle race conditions with optimistic locking', async () => {
            // Create account with balance
            await createCustomerAccount('USD', 100);

            // Try to withdraw more than available concurrently
            const transactionPromises = [];
            for (let i = 0; i < 3; i++) {
                const transactionData = {
                    tenantId: testTenantId,
                    customerId: testCustomerId,
                    currency: 'USD',
                    amount: 80, // Each transaction wants 80, but only 100 available
                    description: `Race condition test ${i}`,
                    createdBy: testCreatedBy,
                    metadata: { testRaceCondition: true }
                };

                transactionPromises.push(
                    FinancialTransactionService.createWithdrawal(transactionData)
                );
            }

            const results = await Promise.allSettled(transactionPromises);
            
            // Only one should succeed, others should fail
            const successful = results.filter(r => r.status === 'fulfilled');
            const failed = results.filter(r => r.status === 'rejected');

            expect(successful.length).toBe(1);
            expect(failed.length).toBe(2);

            // Verify final balance
            const finalAccount = await Account.findOne({
                where: {
                    tenantId: testTenantId,
                    customerId: testCustomerId,
                    currency: 'USD'
                }
            });

            expect(parseFloat(finalAccount.balance)).toBe(20); // 100 - 80
        });

        it('should retry failed transactions due to temporary conflicts', async () => {
            await createCustomerAccount('USD', 1000);

            // Mock temporary failure
            const originalUpdate = Account.prototype.updateBalance;
            let callCount = 0;
            
            Account.prototype.updateBalance = jest.fn().mockImplementation(function(amount, transaction) {
                callCount++;
                if (callCount === 1) {
                    // Simulate optimistic locking failure on first attempt
                    throw new Error('تراکنش ناموفق: داده‌ها تغییر کرده‌اند');
                }
                // Succeed on retry
                return originalUpdate.call(this, amount, transaction);
            });

            const transactionData = {
                tenantId: testTenantId,
                customerId: testCustomerId,
                currency: 'USD',
                amount: 100,
                description: 'Retry test transaction',
                createdBy: testCreatedBy,
                metadata: { testRetry: true }
            };

            // Should succeed after retry
            const result = await FinancialTransactionService.createWithdrawal(transactionData);
            expect(result).toBeDefined();
            expect(callCount).toBeGreaterThan(1); // Verify retry happened

            // Restore original method
            Account.prototype.updateBalance = originalUpdate;
        });
    });

    describe('Transaction Integrity', () => {
        it('should ensure ACID properties during exchange transactions', async () => {
            await createCustomerAccount('USD', 1000);

            const exchangeData = {
                tenantId: testTenantId,
                customerId: testCustomerId,
                fromCurrency: 'USD',
                toCurrency: 'EUR',
                sourceAmount: 500,
                destinationAmount: 425,
                exchangeRate: 0.85,
                feeAmount: 5,
                transactionType: 'CURRENCY_BUY',
                description: 'ACID test exchange',
                createdBy: testCreatedBy,
                metadata: { testACID: true }
            };

            const result = await FinancialTransactionService.createCurrencyExchange(exchangeData);

            // Verify atomicity - all or nothing
            expect(result).toBeDefined();
            expect(result.status).toBe('COMPLETED');

            // Verify consistency - double-entry bookkeeping
            const validation = await LedgerEntry.validateDoubleEntry(result.id);
            expect(validation.isBalanced).toBe(true);

            // Verify isolation - read account balances
            const usdAccount = await Account.findOne({
                where: { tenantId: testTenantId, customerId: testCustomerId, currency: 'USD' }
            });
            const eurAccount = await Account.findOne({
                where: { tenantId: testTenantId, customerId: testCustomerId, currency: 'EUR' }
            });

            expect(parseFloat(usdAccount.balance)).toBe(495); // 1000 - 500 - 5 fee
            expect(parseFloat(eurAccount.balance)).toBe(425);

            // Verify durability - transaction should be recorded in audit log
            const auditLogs = await FinancialAudit.findAll({
                where: { transactionId: result.id }
            });
            expect(auditLogs.length).toBeGreaterThan(0);
        });

        it('should rollback transaction on failure', async () => {
            await createCustomerAccount('USD', 100);

            const exchangeData = {
                tenantId: testTenantId,
                customerId: testCustomerId,
                fromCurrency: 'USD',
                toCurrency: 'EUR',
                sourceAmount: 200, // More than available
                destinationAmount: 170,
                exchangeRate: 0.85,
                transactionType: 'CURRENCY_SELL',
                description: 'Rollback test exchange',
                createdBy: testCreatedBy,
                metadata: { testRollback: true }
            };

            await expect(
                FinancialTransactionService.createCurrencyExchange(exchangeData)
            ).rejects.toThrow('موجودی کافی نیست');

            // Verify no partial data was saved
            const transactions = await FinancialTransaction.findAll({
                where: { tenantId: testTenantId, customerId: testCustomerId }
            });

            const ledgerEntries = await LedgerEntry.findAll({
                where: { tenantId: testTenantId }
            });

            // Should only have the account creation entries, no exchange entries
            expect(transactions.length).toBe(1); // Only the deposit for account creation
            expect(ledgerEntries.filter(e => e.description.includes('Rollback test')).length).toBe(0);

            // Verify account balance unchanged
            const account = await Account.findOne({
                where: { tenantId: testTenantId, customerId: testCustomerId, currency: 'USD' }
            });
            expect(parseFloat(account.balance)).toBe(100);
        });
    });

    describe('Duplicate Transaction Prevention', () => {
        it('should prevent duplicate transactions by reference', async () => {
            await createCustomerAccount('USD', 1000);

            const transactionData = {
                tenantId: testTenantId,
                customerId: testCustomerId,
                currency: 'USD',
                amount: 100,
                description: 'Duplicate test transaction',
                createdBy: testCreatedBy,
                reference: 'UNIQUE_REF_123',
                metadata: { testDuplicate: true }
            };

            // First transaction should succeed
            const first = await FinancialTransactionService.createWithdrawal(transactionData);
            expect(first).toBeDefined();

            // Second transaction with same reference should fail
            await expect(
                FinancialTransactionService.createWithdrawal(transactionData)
            ).rejects.toThrow('تراکنش تکراری');
        });

        it('should prevent duplicate transactions by external reference', async () => {
            await createCustomerAccount('USD', 1000);

            const transactionData = {
                tenantId: testTenantId,
                customerId: testCustomerId,
                currency: 'USD',
                amount: 100,
                description: 'External ref duplicate test',
                createdBy: testCreatedBy,
                externalReference: 'EXT_REF_456',
                metadata: { testExternalDuplicate: true }
            };

            // First transaction should succeed
            const first = await FinancialTransactionService.createWithdrawal(transactionData);
            expect(first).toBeDefined();

            // Second transaction with same external reference should fail
            await expect(
                FinancialTransactionService.createWithdrawal(transactionData)
            ).rejects.toThrow('تراکنش تکراری');
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle very large transaction amounts', async () => {
            const largeAmount = 999999999.99;
            await createCustomerAccount('USD', largeAmount);

            const transactionData = {
                tenantId: testTenantId,
                customerId: testCustomerId,
                currency: 'USD',
                amount: largeAmount / 2,
                description: 'Large amount test',
                createdBy: testCreatedBy,
                metadata: { testLargeAmount: true }
            };

            const result = await FinancialTransactionService.createWithdrawal(transactionData);
            expect(result).toBeDefined();

            // Verify precision is maintained
            const account = await Account.findOne({
                where: { tenantId: testTenantId, customerId: testCustomerId, currency: 'USD' }
            });
            
            const expectedBalance = largeAmount / 2;
            expect(Math.abs(parseFloat(account.balance) - expectedBalance)).toBeLessThan(0.01);
        });

        it('should handle very small transaction amounts', async () => {
            const smallAmount = 0.01;
            await createCustomerAccount('USD', 1);

            const transactionData = {
                tenantId: testTenantId,
                customerId: testCustomerId,
                currency: 'USD',
                amount: smallAmount,
                description: 'Small amount test',
                createdBy: testCreatedBy,
                metadata: { testSmallAmount: true }
            };

            const result = await FinancialTransactionService.createWithdrawal(transactionData);
            expect(result).toBeDefined();

            // Verify precision is maintained
            const account = await Account.findOne({
                where: { tenantId: testTenantId, customerId: testCustomerId, currency: 'USD' }
            });
            
            expect(parseFloat(account.balance)).toBe(0.99);
        });

        it('should handle network interruption simulation', async () => {
            await createCustomerAccount('USD', 1000);

            // Mock network interruption during audit logging
            const originalLogAction = FinancialAudit.logAction;
            FinancialAudit.logAction = jest.fn().mockRejectedValueOnce(new Error('Network timeout'));

            const transactionData = {
                tenantId: testTenantId,
                customerId: testCustomerId,
                currency: 'USD',
                amount: 100,
                description: 'Network interruption test',
                createdBy: testCreatedBy,
                metadata: { testNetworkFailure: true }
            };

            // Transaction should still complete even if audit fails
            // (audit failure shouldn't rollback financial transaction)
            await expect(
                FinancialTransactionService.createWithdrawal(transactionData)
            ).rejects.toThrow('Network timeout');

            // Restore original method
            FinancialAudit.logAction = originalLogAction;
        });

        it('should validate transaction data integrity', async () => {
            const invalidData = {
                tenantId: null, // Invalid
                customerId: testCustomerId,
                currency: 'USD',
                amount: -100, // Invalid
                description: 'Invalid data test',
                createdBy: testCreatedBy
            };

            await expect(
                FinancialTransactionService.createWithdrawal(invalidData)
            ).rejects.toThrow();
        });
    });

    describe('Audit Trail and Compliance', () => {
        it('should create comprehensive audit trail', async () => {
            await createCustomerAccount('USD', 1000);

            const transactionData = {
                tenantId: testTenantId,
                customerId: testCustomerId,
                currency: 'USD',
                amount: 500,
                description: 'Audit trail test',
                createdBy: testCreatedBy,
                metadata: { testAuditTrail: true }
            };

            const requestMetadata = {
                ipAddress: '192.168.1.1',
                userAgent: 'Test Browser',
                sessionId: 'test-session-123'
            };

            const result = await FinancialTransactionService.createWithdrawal(
                transactionData, 
                requestMetadata
            );

            // Verify audit logs were created
            const auditLogs = await FinancialAudit.findAll({
                where: { transactionId: result.transaction.id }
            });

            expect(auditLogs.length).toBeGreaterThan(0);
            
            const auditLog = auditLogs[0];
            expect(auditLog.action).toBe('TRANSACTION_CREATED');
            expect(auditLog.resourceType).toBe('FINANCIAL_TRANSACTION');
            expect(auditLog.description).toContain('Withdrawal created');
            expect(auditLog.metadata).toHaveProperty('ipAddress', '192.168.1.1');
        });

        it('should retrieve complete transaction audit trail', async () => {
            await createCustomerAccount('USD', 1000);

            const transactionData = {
                tenantId: testTenantId,
                customerId: testCustomerId,
                currency: 'USD',
                amount: 200,
                description: 'Complete audit test',
                createdBy: testCreatedBy,
                metadata: { testCompleteAudit: true }
            };

            const result = await FinancialTransactionService.createWithdrawal(transactionData);
            
            // Get transaction with full audit trail
            const transactionWithAudit = await FinancialTransactionService.getTransactionWithAuditTrail(
                result.transaction.id
            );

            expect(transactionWithAudit).toBeDefined();
            expect(transactionWithAudit.ledgerEntries).toBeDefined();
            expect(transactionWithAudit.auditLogs).toBeDefined();
            expect(transactionWithAudit.ledgerEntries.length).toBeGreaterThan(0);
        });
    });

    // Helper functions
    async function createTestSystemAccounts() {
        const systemAccounts = [
            { type: 'ASSET', name: 'Exchange USD Pool', currency: 'USD' },
            { type: 'ASSET', name: 'Exchange EUR Pool', currency: 'EUR' },
            { type: 'LIABILITY', name: 'Customer Deposits USD', currency: 'USD' },
            { type: 'LIABILITY', name: 'Customer Deposits EUR', currency: 'EUR' },
            { type: 'REVENUE', name: 'Exchange Fees USD', currency: 'USD' },
            { type: 'REVENUE', name: 'Exchange Fees EUR', currency: 'EUR' }
        ];

        for (const accountData of systemAccounts) {
            await Account.create({
                accountNumber: await Account.generateAccountNumber(testTenantId, accountData.type),
                accountType: accountData.type,
                accountName: accountData.name,
                currency: accountData.currency,
                tenantId: testTenantId,
                customerId: null,
                createdBy: testCreatedBy
            });
        }
    }

    async function createCustomerAccount(currency, initialBalance = 0) {
        const depositData = {
            tenantId: testTenantId,
            customerId: testCustomerId,
            currency,
            amount: initialBalance,
            description: 'Initial account setup',
            createdBy: testCreatedBy,
            metadata: { testSetup: true }
        };

        if (initialBalance > 0) {
            await FinancialTransactionService.createDeposit(depositData);
        }
    }

    async function cleanupCustomerData() {
        // Clean up customer-specific data
        await FinancialAudit.destroy({
            where: { tenantId: testTenantId, userId: testCustomerId }
        });
        
        await LedgerEntry.destroy({
            where: { tenantId: testTenantId }
        });
        
        await FinancialTransaction.destroy({
            where: { tenantId: testTenantId, customerId: testCustomerId }
        });
        
        await Account.destroy({
            where: { tenantId: testTenantId, customerId: testCustomerId }
        });
    }

    async function cleanupTestData() {
        await FinancialAudit.destroy({ where: { tenantId: testTenantId } });
        await LedgerEntry.destroy({ where: { tenantId: testTenantId } });
        await FinancialTransaction.destroy({ where: { tenantId: testTenantId } });
        await Account.destroy({ where: { tenantId: testTenantId } });
    }
});