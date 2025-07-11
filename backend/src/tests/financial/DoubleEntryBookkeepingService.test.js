// backend/src/tests/financial/DoubleEntryBookkeepingService.test.js
const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const financialDB = require('../../config/financial-database');
const DoubleEntryBookkeepingService = require('../../services/financial/DoubleEntryBookkeepingService');
const { v4: uuidv4 } = require('uuid');

describe('DoubleEntryBookkeepingService', () => {
    let testTenantId, testCustomerId, testCreatedBy;
    let Account, FinancialTransaction, LedgerEntry, FinancialAudit;

    beforeAll(async () => {
        // Set test environment
        process.env.NODE_ENV = 'test';
        process.env.FINANCIAL_DB_NAME = 'exchange_financial_test';
        
        // Initialize financial database
        await financialDB.initialize();
        
        // Initialize service
        await DoubleEntryBookkeepingService.initialize();
        
        // Get models
        Account = financialDB.getModel('Account');
        FinancialTransaction = financialDB.getModel('FinancialTransaction');
        LedgerEntry = financialDB.getModel('LedgerEntry');
        FinancialAudit = financialDB.getModel('FinancialAudit');

        // Generate test IDs
        testTenantId = uuidv4();
        testCustomerId = uuidv4();
        testCreatedBy = uuidv4();

        // Create test accounts
        await createTestAccounts();
    });

    afterAll(async () => {
        // Clean up test data
        await cleanupTestData();
        
        // Close database connection
        await financialDB.close();
    });

    beforeEach(async () => {
        // Reset test data before each test
        await resetTestAccounts();
    });

    describe('Currency Exchange Processing', () => {
        it('should process currency buy transaction with proper double-entry', async () => {
            const exchangeData = {
                tenantId: testTenantId,
                customerId: testCustomerId,
                fromCurrency: 'USD',
                toCurrency: 'EUR',
                sourceAmount: 1000,
                destinationAmount: 850,
                exchangeRate: 0.85,
                feeAmount: 10,
                feeCurrency: 'USD',
                description: 'Test currency buy',
                createdBy: testCreatedBy,
                metadata: { testTransaction: true }
            };

            const result = await DoubleEntryBookkeepingService.processCurrencyExchange(exchangeData);

            // Verify transaction was created
            expect(result).toBeDefined();
            expect(result.transactionType).toBe('CURRENCY_BUY');
            expect(result.status).toBe('COMPLETED');

            // Verify ledger entries were created
            const ledgerEntries = await LedgerEntry.findAll({
                where: { transactionId: result.id }
            });

            expect(ledgerEntries.length).toBeGreaterThan(0);

            // Verify double-entry balance
            const validation = await LedgerEntry.validateDoubleEntry(result.id);
            expect(validation.isBalanced).toBe(true);

            // Verify account balances were updated
            const usdAccount = await Account.findOne({
                where: {
                    tenantId: testTenantId,
                    customerId: testCustomerId,
                    currency: 'USD'
                }
            });

            const eurAccount = await Account.findOne({
                where: {
                    tenantId: testTenantId,
                    customerId: testCustomerId,
                    currency: 'EUR'
                }
            });

            expect(parseFloat(eurAccount.balance)).toBe(850);
            expect(parseFloat(usdAccount.balance)).toBe(-1010); // 1000 + 10 fee
        });

        it('should process currency sell transaction with proper double-entry', async () => {
            // First, add some EUR balance to the customer
            await addTestBalance(testCustomerId, 'EUR', 1000);

            const exchangeData = {
                tenantId: testTenantId,
                customerId: testCustomerId,
                fromCurrency: 'EUR',
                toCurrency: 'USD',
                sourceAmount: 500,
                destinationAmount: 590,
                exchangeRate: 1.18,
                feeAmount: 5,
                feeCurrency: 'EUR',
                description: 'Test currency sell',
                createdBy: testCreatedBy,
                metadata: { testTransaction: true }
            };

            const result = await DoubleEntryBookkeepingService.processCurrencyExchange(exchangeData);

            // Verify transaction was created
            expect(result).toBeDefined();
            expect(result.transactionType).toBe('CURRENCY_SELL');
            expect(result.status).toBe('COMPLETED');

            // Verify double-entry balance
            const validation = await LedgerEntry.validateDoubleEntry(result.id);
            expect(validation.isBalanced).toBe(true);

            // Verify account balances were updated
            const eurAccount = await Account.findOne({
                where: {
                    tenantId: testTenantId,
                    customerId: testCustomerId,
                    currency: 'EUR'
                }
            });

            const usdAccount = await Account.findOne({
                where: {
                    tenantId: testTenantId,
                    customerId: testCustomerId,
                    currency: 'USD'
                }
            });

            expect(parseFloat(eurAccount.balance)).toBe(495); // 1000 - 500 - 5 fee
            expect(parseFloat(usdAccount.balance)).toBe(590);
        });

        it('should handle concurrent currency exchange transactions', async () => {
            // Add initial balance
            await addTestBalance(testCustomerId, 'USD', 5000);

            const exchangePromises = [];
            const numberOfConcurrentTransactions = 5;

            // Create multiple concurrent transactions
            for (let i = 0; i < numberOfConcurrentTransactions; i++) {
                const exchangeData = {
                    tenantId: testTenantId,
                    customerId: testCustomerId,
                    fromCurrency: 'USD',
                    toCurrency: 'EUR',
                    sourceAmount: 100,
                    destinationAmount: 85,
                    exchangeRate: 0.85,
                    feeAmount: 1,
                    feeCurrency: 'USD',
                    description: `Concurrent test transaction ${i}`,
                    createdBy: testCreatedBy,
                    metadata: { testTransaction: true, index: i }
                };

                exchangePromises.push(
                    DoubleEntryBookkeepingService.processCurrencyExchange(exchangeData)
                );
            }

            // Wait for all transactions to complete
            const results = await Promise.all(exchangePromises);

            // Verify all transactions completed successfully
            expect(results.length).toBe(numberOfConcurrentTransactions);
            results.forEach(result => {
                expect(result.status).toBe('COMPLETED');
            });

            // Verify final balances are correct
            const usdAccount = await Account.findOne({
                where: {
                    tenantId: testTenantId,
                    customerId: testCustomerId,
                    currency: 'USD'
                }
            });

            const eurAccount = await Account.findOne({
                where: {
                    tenantId: testTenantId,
                    customerId: testCustomerId,
                    currency: 'EUR'
                }
            });

            // Expected: 5000 - (5 * (100 + 1)) = 4495
            expect(parseFloat(usdAccount.balance)).toBe(4495);
            // Expected: 5 * 85 = 425
            expect(parseFloat(eurAccount.balance)).toBe(425);

            // Verify all transactions are balanced
            for (const result of results) {
                const validation = await LedgerEntry.validateDoubleEntry(result.id);
                expect(validation.isBalanced).toBe(true);
            }
        });
    });

    describe('Deposit Processing', () => {
        it('should process deposit with proper double-entry', async () => {
            const depositData = {
                tenantId: testTenantId,
                customerId: testCustomerId,
                currency: 'USD',
                amount: 1000,
                description: 'Test deposit',
                createdBy: testCreatedBy,
                metadata: { testTransaction: true }
            };

            const result = await DoubleEntryBookkeepingService.processDeposit(depositData);

            // Verify transaction was created
            expect(result.transaction).toBeDefined();
            expect(result.transaction.transactionType).toBe('DEPOSIT');
            expect(result.transaction.status).toBe('COMPLETED');

            // Verify ledger entries were created
            expect(result.debitEntry).toBeDefined();
            expect(result.creditEntry).toBeDefined();

            // Verify double-entry balance
            const validation = await LedgerEntry.validateDoubleEntry(result.transaction.id);
            expect(validation.isBalanced).toBe(true);

            // Verify customer account balance increased
            const customerAccount = await Account.findOne({
                where: {
                    tenantId: testTenantId,
                    customerId: testCustomerId,
                    currency: 'USD'
                }
            });

            expect(parseFloat(customerAccount.balance)).toBe(1000);
        });
    });

    describe('Withdrawal Processing', () => {
        it('should process withdrawal with sufficient balance', async () => {
            // First, add balance
            await addTestBalance(testCustomerId, 'USD', 1000);

            const withdrawalData = {
                tenantId: testTenantId,
                customerId: testCustomerId,
                currency: 'USD',
                amount: 500,
                description: 'Test withdrawal',
                createdBy: testCreatedBy,
                metadata: { testTransaction: true }
            };

            const result = await DoubleEntryBookkeepingService.processWithdrawal(withdrawalData);

            // Verify transaction was created
            expect(result.transaction).toBeDefined();
            expect(result.transaction.transactionType).toBe('WITHDRAWAL');
            expect(result.transaction.status).toBe('COMPLETED');

            // Verify double-entry balance
            const validation = await LedgerEntry.validateDoubleEntry(result.transaction.id);
            expect(validation.isBalanced).toBe(true);

            // Verify customer account balance decreased
            const customerAccount = await Account.findOne({
                where: {
                    tenantId: testTenantId,
                    customerId: testCustomerId,
                    currency: 'USD'
                }
            });

            expect(parseFloat(customerAccount.balance)).toBe(500);
        });

        it('should reject withdrawal with insufficient balance', async () => {
            // Add small balance
            await addTestBalance(testCustomerId, 'USD', 100);

            const withdrawalData = {
                tenantId: testTenantId,
                customerId: testCustomerId,
                currency: 'USD',
                amount: 500,
                description: 'Test withdrawal - insufficient balance',
                createdBy: testCreatedBy,
                metadata: { testTransaction: true }
            };

            await expect(
                DoubleEntryBookkeepingService.processWithdrawal(withdrawalData)
            ).rejects.toThrow('موجودی کافی نیست');
        });
    });

    describe('Account Balance Validation', () => {
        it('should correctly calculate account balance from ledger entries', async () => {
            // Add some test transactions
            await addTestBalance(testCustomerId, 'USD', 1000);
            await addTestBalance(testCustomerId, 'USD', 500);

            const account = await Account.findOne({
                where: {
                    tenantId: testTenantId,
                    customerId: testCustomerId,
                    currency: 'USD'
                }
            });

            const ledgerBalance = await DoubleEntryBookkeepingService.getAccountBalance(account.id);

            expect(parseFloat(ledgerBalance.balance)).toBe(1500);
            expect(parseFloat(account.balance)).toBe(1500);
        });

        it('should generate accurate trial balance', async () => {
            // Add various transactions
            await addTestBalance(testCustomerId, 'USD', 1000);
            await addTestBalance(testCustomerId, 'EUR', 500);

            const trialBalance = await DoubleEntryBookkeepingService.generateTrialBalance(testTenantId);

            expect(trialBalance.isBalanced).toBe(true);
            expect(trialBalance.accounts.length).toBeGreaterThan(0);
            expect(Math.abs(trialBalance.totals.totalDebits - trialBalance.totals.totalCredits)).toBeLessThan(0.01);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle power failure simulation (transaction rollback)', async () => {
            const exchangeData = {
                tenantId: testTenantId,
                customerId: testCustomerId,
                fromCurrency: 'USD',
                toCurrency: 'EUR',
                sourceAmount: 1000,
                destinationAmount: 850,
                exchangeRate: 0.85,
                description: 'Test transaction for power failure',
                createdBy: testCreatedBy,
                metadata: { simulateFailure: true }
            };

            // Mock a failure during transaction processing
            const originalCreate = FinancialTransaction.create;
            FinancialTransaction.create = jest.fn().mockImplementationOnce(() => {
                throw new Error('Simulated power failure');
            });

            await expect(
                DoubleEntryBookkeepingService.processCurrencyExchange(exchangeData)
            ).rejects.toThrow('Simulated power failure');

            // Restore original method
            FinancialTransaction.create = originalCreate;

            // Verify no partial data was saved
            const transactions = await FinancialTransaction.findAll({
                where: { tenantId: testTenantId }
            });

            expect(transactions.length).toBe(0);
        });

        it('should handle invalid exchange rate', async () => {
            const exchangeData = {
                tenantId: testTenantId,
                customerId: testCustomerId,
                fromCurrency: 'USD',
                toCurrency: 'EUR',
                sourceAmount: 1000,
                destinationAmount: 850,
                exchangeRate: 0, // Invalid rate
                description: 'Test invalid rate',
                createdBy: testCreatedBy
            };

            await expect(
                DoubleEntryBookkeepingService.processCurrencyExchange(exchangeData)
            ).rejects.toThrow();
        });

        it('should handle missing system accounts gracefully', async () => {
            const nonExistentTenantId = uuidv4();
            
            const exchangeData = {
                tenantId: nonExistentTenantId,
                customerId: testCustomerId,
                fromCurrency: 'USD',
                toCurrency: 'EUR',
                sourceAmount: 1000,
                destinationAmount: 850,
                exchangeRate: 0.85,
                description: 'Test missing accounts',
                createdBy: testCreatedBy
            };

            await expect(
                DoubleEntryBookkeepingService.processCurrencyExchange(exchangeData)
            ).rejects.toThrow();
        });
    });

    // Helper functions
    async function createTestAccounts() {
        // Create system accounts for testing
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
                customerId: null, // System account
                createdBy: testCreatedBy
            });
        }
    }

    async function addTestBalance(customerId, currency, amount) {
        const depositData = {
            tenantId: testTenantId,
            customerId,
            currency,
            amount,
            description: 'Test balance addition',
            createdBy: testCreatedBy,
            metadata: { testBalance: true }
        };

        await DoubleEntryBookkeepingService.processDeposit(depositData);
    }

    async function resetTestAccounts() {
        // Reset customer account balances to zero
        await Account.update(
            { balance: 0, availableBalance: 0, blockedBalance: 0 },
            {
                where: {
                    tenantId: testTenantId,
                    customerId: testCustomerId
                }
            }
        );
    }

    async function cleanupTestData() {
        // Clean up in reverse dependency order
        await FinancialAudit.destroy({ where: { tenantId: testTenantId } });
        await LedgerEntry.destroy({ where: { tenantId: testTenantId } });
        await FinancialTransaction.destroy({ where: { tenantId: testTenantId } });
        await Account.destroy({ where: { tenantId: testTenantId } });
    }
});