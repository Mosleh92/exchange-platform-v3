// backend/src/services/financial/DoubleEntryBookkeepingService.js
const financialDB = require('../../config/financial-database');
const logger = require('../../utils/logger');

/**
 * Double-Entry Bookkeeping Service
 * Ensures financial integrity through proper accounting principles
 */
class DoubleEntryBookkeepingService {
    constructor() {
        this.Account = null;
        this.FinancialTransaction = null;
        this.LedgerEntry = null;
        this.FinancialAudit = null;
    }

    /**
     * Initialize the service with database models
     */
    async initialize() {
        try {
            this.Account = financialDB.getModel('Account');
            this.FinancialTransaction = financialDB.getModel('FinancialTransaction');
            this.LedgerEntry = financialDB.getModel('LedgerEntry');
            this.FinancialAudit = financialDB.getModel('FinancialAudit');
            
            logger.info('Double-Entry Bookkeeping Service initialized');
        } catch (error) {
            logger.error('Failed to initialize Double-Entry Bookkeeping Service:', error);
            throw error;
        }
    }

    /**
     * Process currency exchange transaction with double-entry bookkeeping
     */
    async processCurrencyExchange(transactionData) {
        const {
            tenantId,
            customerId,
            fromCurrency,
            toCurrency,
            sourceAmount,
            destinationAmount,
            exchangeRate,
            feeAmount = 0,
            feeCurrency,
            description,
            createdBy,
            metadata = {}
        } = transactionData;

        return await financialDB.transaction(async (dbTransaction) => {
            try {
                // Create financial transaction record
                const transaction = await this.FinancialTransaction.create({
                    transactionNumber: await this.FinancialTransaction.generateTransactionNumber(tenantId),
                    tenantId,
                    customerId,
                    transactionType: sourceAmount > 0 ? 'CURRENCY_BUY' : 'CURRENCY_SELL',
                    fromCurrency,
                    toCurrency,
                    sourceAmount: Math.abs(sourceAmount),
                    destinationAmount: Math.abs(destinationAmount),
                    exchangeRate,
                    feeAmount,
                    feeCurrency: feeCurrency || fromCurrency,
                    description,
                    metadata,
                    createdBy
                }, { transaction: dbTransaction });

                // Get or create customer accounts
                const sourceAccount = await this.getOrCreateCustomerAccount(
                    tenantId, customerId, fromCurrency, createdBy, dbTransaction
                );
                const destinationAccount = await this.getOrCreateCustomerAccount(
                    tenantId, customerId, toCurrency, createdBy, dbTransaction
                );

                // Get system pool accounts
                const systemSourcePool = await this.getSystemPoolAccount(tenantId, fromCurrency);
                const systemDestinationPool = await this.getSystemPoolAccount(tenantId, toCurrency);

                // Get fee revenue account
                const feeRevenueAccount = await this.getFeeRevenueAccount(tenantId, feeCurrency || fromCurrency);

                // Create double-entry ledger entries
                await this.createExchangeEntries({
                    transaction,
                    sourceAccount,
                    destinationAccount,
                    systemSourcePool,
                    systemDestinationPool,
                    feeRevenueAccount,
                    sourceAmount: Math.abs(sourceAmount),
                    destinationAmount: Math.abs(destinationAmount),
                    feeAmount,
                    fromCurrency,
                    toCurrency,
                    description,
                    createdBy,
                    tenantId,
                    dbTransaction
                });

                // Update account balances
                await this.updateAccountBalances({
                    sourceAccount,
                    destinationAccount,
                    systemSourcePool,
                    systemDestinationPool,
                    feeRevenueAccount,
                    sourceAmount: Math.abs(sourceAmount),
                    destinationAmount: Math.abs(destinationAmount),
                    feeAmount,
                    transactionType: transaction.transactionType,
                    dbTransaction
                });

                // Mark transaction as completed
                await transaction.markAsCompleted(dbTransaction);

                // Create audit log
                await this.FinancialAudit.logAction({
                    tenantId,
                    userId: createdBy,
                    action: 'TRANSACTION_PROCESSED',
                    resourceType: 'FINANCIAL_TRANSACTION',
                    resourceId: transaction.id,
                    transactionId: transaction.id,
                    description: `Currency exchange processed: ${sourceAmount} ${fromCurrency} → ${destinationAmount} ${toCurrency}`,
                    newValues: transaction.toJSON(),
                    metadata: {
                        ...metadata,
                        exchangeRate,
                        feeAmount,
                        sourceAccountId: sourceAccount.id,
                        destinationAccountId: destinationAccount.id
                    },
                    severity: sourceAmount > 10000 ? 'HIGH' : 'MEDIUM'
                });

                logger.info(`Currency exchange processed: ${transaction.transactionNumber}`);
                return transaction;

            } catch (error) {
                logger.error('Failed to process currency exchange:', error);
                throw error;
            }
        });
    }

    /**
     * Process deposit transaction
     */
    async processDeposit(depositData) {
        const {
            tenantId,
            customerId,
            currency,
            amount,
            description,
            createdBy,
            metadata = {}
        } = depositData;

        return await financialDB.transaction(async (dbTransaction) => {
            try {
                // Create financial transaction record
                const transaction = await this.FinancialTransaction.create({
                    transactionNumber: await this.FinancialTransaction.generateTransactionNumber(tenantId),
                    tenantId,
                    customerId,
                    transactionType: 'DEPOSIT',
                    fromCurrency: currency,
                    toCurrency: currency,
                    sourceAmount: amount,
                    destinationAmount: amount,
                    exchangeRate: 1,
                    description,
                    metadata,
                    createdBy
                }, { transaction: dbTransaction });

                // Get customer account
                const customerAccount = await this.getOrCreateCustomerAccount(
                    tenantId, customerId, currency, createdBy, dbTransaction
                );

                // Get customer deposit liability account
                const customerDepositLiability = await this.getCustomerDepositLiabilityAccount(tenantId, currency);

                // Create double-entry: Debit Customer Account, Credit Customer Deposit Liability
                const { debitEntry, creditEntry } = await this.LedgerEntry.createDoubleEntry(
                    transaction.id,
                    customerAccount.id,
                    customerDepositLiability.id,
                    amount,
                    currency,
                    description,
                    createdBy,
                    tenantId,
                    dbTransaction
                );

                // Update balances
                await customerAccount.updateBalance(amount, dbTransaction);

                // Mark transaction as completed
                await transaction.markAsCompleted(dbTransaction);

                // Create audit log
                await this.FinancialAudit.logAction({
                    tenantId,
                    userId: createdBy,
                    action: 'TRANSACTION_PROCESSED',
                    resourceType: 'FINANCIAL_TRANSACTION',
                    resourceId: transaction.id,
                    transactionId: transaction.id,
                    description: `Deposit processed: ${amount} ${currency}`,
                    newValues: transaction.toJSON(),
                    metadata: { ...metadata, customerAccountId: customerAccount.id },
                    severity: amount > 10000 ? 'HIGH' : 'MEDIUM'
                });

                logger.info(`Deposit processed: ${transaction.transactionNumber}`);
                return { transaction, debitEntry, creditEntry };

            } catch (error) {
                logger.error('Failed to process deposit:', error);
                throw error;
            }
        });
    }

    /**
     * Process withdrawal transaction
     */
    async processWithdrawal(withdrawalData) {
        const {
            tenantId,
            customerId,
            currency,
            amount,
            description,
            createdBy,
            metadata = {}
        } = withdrawalData;

        return await financialDB.transaction(async (dbTransaction) => {
            try {
                // Get customer account and check balance
                const customerAccount = await this.getOrCreateCustomerAccount(
                    tenantId, customerId, currency, createdBy, dbTransaction
                );

                if (customerAccount.availableBalance < amount) {
                    throw new Error('موجودی کافی نیست');
                }

                // Create financial transaction record
                const transaction = await this.FinancialTransaction.create({
                    transactionNumber: await this.FinancialTransaction.generateTransactionNumber(tenantId),
                    tenantId,
                    customerId,
                    transactionType: 'WITHDRAWAL',
                    fromCurrency: currency,
                    toCurrency: currency,
                    sourceAmount: amount,
                    destinationAmount: amount,
                    exchangeRate: 1,
                    description,
                    metadata,
                    createdBy
                }, { transaction: dbTransaction });

                // Get customer deposit liability account
                const customerDepositLiability = await this.getCustomerDepositLiabilityAccount(tenantId, currency);

                // Create double-entry: Credit Customer Account, Debit Customer Deposit Liability
                const { debitEntry, creditEntry } = await this.LedgerEntry.createDoubleEntry(
                    transaction.id,
                    customerDepositLiability.id,
                    customerAccount.id,
                    amount,
                    currency,
                    description,
                    createdBy,
                    tenantId,
                    dbTransaction
                );

                // Update balances
                await customerAccount.updateBalance(-amount, dbTransaction);

                // Mark transaction as completed
                await transaction.markAsCompleted(dbTransaction);

                // Create audit log
                await this.FinancialAudit.logAction({
                    tenantId,
                    userId: createdBy,
                    action: 'TRANSACTION_PROCESSED',
                    resourceType: 'FINANCIAL_TRANSACTION',
                    resourceId: transaction.id,
                    transactionId: transaction.id,
                    description: `Withdrawal processed: ${amount} ${currency}`,
                    newValues: transaction.toJSON(),
                    metadata: { ...metadata, customerAccountId: customerAccount.id },
                    severity: amount > 10000 ? 'HIGH' : 'MEDIUM'
                });

                logger.info(`Withdrawal processed: ${transaction.transactionNumber}`);
                return { transaction, debitEntry, creditEntry };

            } catch (error) {
                logger.error('Failed to process withdrawal:', error);
                throw error;
            }
        });
    }

    /**
     * Create exchange entries for currency exchange
     */
    async createExchangeEntries(params) {
        const {
            transaction,
            sourceAccount,
            destinationAccount,
            systemSourcePool,
            systemDestinationPool,
            feeRevenueAccount,
            sourceAmount,
            destinationAmount,
            feeAmount,
            fromCurrency,
            toCurrency,
            description,
            createdBy,
            tenantId,
            dbTransaction
        } = params;

        const entries = [];

        if (transaction.transactionType === 'CURRENCY_BUY') {
            // Customer buys foreign currency with local currency
            // Debit: Customer Foreign Currency Account
            // Credit: Customer Local Currency Account
            // Credit: System Foreign Currency Pool
            // Debit: System Local Currency Pool
            // Credit: Fee Revenue (if applicable)

            // Customer gives source currency, receives destination currency
            const customerSourceEntry = await this.LedgerEntry.createDoubleEntry(
                transaction.id,
                systemSourcePool.id,
                sourceAccount.id,
                sourceAmount,
                fromCurrency,
                `${description} - Customer source currency`,
                createdBy,
                tenantId,
                dbTransaction
            );

            const customerDestinationEntry = await this.LedgerEntry.createDoubleEntry(
                transaction.id,
                destinationAccount.id,
                systemDestinationPool.id,
                destinationAmount,
                toCurrency,
                `${description} - Customer destination currency`,
                createdBy,
                tenantId,
                dbTransaction
            );

            entries.push(customerSourceEntry, customerDestinationEntry);

        } else {
            // Currency sell - reverse of buy
            const customerSourceEntry = await this.LedgerEntry.createDoubleEntry(
                transaction.id,
                systemSourcePool.id,
                sourceAccount.id,
                sourceAmount,
                fromCurrency,
                `${description} - Customer source currency`,
                createdBy,
                tenantId,
                dbTransaction
            );

            const customerDestinationEntry = await this.LedgerEntry.createDoubleEntry(
                transaction.id,
                destinationAccount.id,
                systemDestinationPool.id,
                destinationAmount,
                toCurrency,
                `${description} - Customer destination currency`,
                createdBy,
                tenantId,
                dbTransaction
            );

            entries.push(customerSourceEntry, customerDestinationEntry);
        }

        // Handle fees if applicable
        if (feeAmount > 0) {
            const feeEntry = await this.LedgerEntry.createDoubleEntry(
                transaction.id,
                feeRevenueAccount.id,
                sourceAccount.id,
                feeAmount,
                fromCurrency,
                `${description} - Exchange fee`,
                createdBy,
                tenantId,
                dbTransaction
            );
            entries.push(feeEntry);
        }

        return entries;
    }

    /**
     * Update account balances after transaction
     */
    async updateAccountBalances(params) {
        const {
            sourceAccount,
            destinationAccount,
            sourceAmount,
            destinationAmount,
            feeAmount,
            transactionType,
            dbTransaction
        } = params;

        if (transactionType === 'CURRENCY_BUY') {
            await sourceAccount.updateBalance(-sourceAmount - feeAmount, dbTransaction);
            await destinationAccount.updateBalance(destinationAmount, dbTransaction);
        } else {
            await sourceAccount.updateBalance(-sourceAmount, dbTransaction);
            await destinationAccount.updateBalance(destinationAmount - feeAmount, dbTransaction);
        }
    }

    /**
     * Get or create customer account
     */
    async getOrCreateCustomerAccount(tenantId, customerId, currency, createdBy, dbTransaction) {
        let account = await this.Account.findCustomerAccount(tenantId, customerId, currency);
        
        if (!account) {
            account = await this.Account.createCustomerAccount(
                tenantId, customerId, currency, createdBy, dbTransaction
            );
        }
        
        return account;
    }

    /**
     * Get system pool account for currency
     */
    async getSystemPoolAccount(tenantId, currency) {
        const poolAccount = await this.Account.findOne({
            where: {
                tenantId,
                accountType: 'ASSET',
                currency,
                accountName: `Exchange ${currency} Pool`
            }
        });

        if (!poolAccount) {
            throw new Error(`System pool account not found for ${currency}`);
        }

        return poolAccount;
    }

    /**
     * Get customer deposit liability account
     */
    async getCustomerDepositLiabilityAccount(tenantId, currency) {
        const liabilityAccount = await this.Account.findOne({
            where: {
                tenantId,
                accountType: 'LIABILITY',
                currency,
                accountName: `Customer Deposits ${currency}`
            }
        });

        if (!liabilityAccount) {
            throw new Error(`Customer deposit liability account not found for ${currency}`);
        }

        return liabilityAccount;
    }

    /**
     * Get fee revenue account
     */
    async getFeeRevenueAccount(tenantId, currency) {
        const revenueAccount = await this.Account.findOne({
            where: {
                tenantId,
                accountType: 'REVENUE',
                currency,
                accountName: `Exchange Fees ${currency}`
            }
        });

        if (!revenueAccount) {
            throw new Error(`Fee revenue account not found for ${currency}`);
        }

        return revenueAccount;
    }

    /**
     * Validate transaction integrity
     */
    async validateTransactionIntegrity(transactionId) {
        try {
            const validation = await this.LedgerEntry.validateDoubleEntry(transactionId);
            
            if (!validation.isBalanced) {
                logger.error(`Transaction ${transactionId} is not balanced:`, validation);
                throw new Error('تراکنش نامتعادل است');
            }

            return validation;
        } catch (error) {
            logger.error('Failed to validate transaction integrity:', error);
            throw error;
        }
    }

    /**
     * Get account balance with audit trail
     */
    async getAccountBalance(accountId, asOfDate = null) {
        try {
            const balance = await this.LedgerEntry.getAccountBalance(accountId, asOfDate);
            
            // Verify balance matches account record
            const account = await this.Account.findByPk(accountId);
            if (account && !asOfDate) {
                const difference = Math.abs(parseFloat(account.balance) - parseFloat(balance.balance));
                if (difference > 0.01) {
                    logger.warn(`Balance mismatch for account ${accountId}: Account=${account.balance}, Ledger=${balance.balance}`);
                }
            }

            return balance;
        } catch (error) {
            logger.error('Failed to get account balance:', error);
            throw error;
        }
    }

    /**
     * Generate trial balance report
     */
    async generateTrialBalance(tenantId, asOfDate = null) {
        try {
            const trialBalance = await this.LedgerEntry.getTrialBalance(tenantId, asOfDate);
            
            // Calculate totals
            const totals = trialBalance.reduce((acc, account) => {
                acc.totalDebits += parseFloat(account.total_debits) || 0;
                acc.totalCredits += parseFloat(account.total_credits) || 0;
                return acc;
            }, { totalDebits: 0, totalCredits: 0 });

            // Verify balance
            const isBalanced = Math.abs(totals.totalDebits - totals.totalCredits) < 0.01;

            if (!isBalanced) {
                logger.error('Trial balance is not balanced:', totals);
            }

            return {
                accounts: trialBalance,
                totals,
                isBalanced,
                asOfDate: asOfDate || new Date()
            };
        } catch (error) {
            logger.error('Failed to generate trial balance:', error);
            throw error;
        }
    }

    /**
     * Reconcile account balances
     */
    async reconcileAccountBalances(tenantId) {
        try {
            const accounts = await this.Account.findAll({
                where: { tenantId, isActive: true }
            });

            const reconciliationResults = [];

            for (const account of accounts) {
                const ledgerBalance = await this.getAccountBalance(account.id);
                const accountBalance = parseFloat(account.balance);
                const ledgerBalanceValue = parseFloat(ledgerBalance.balance);
                
                const difference = Math.abs(accountBalance - ledgerBalanceValue);
                const isReconciled = difference < 0.01;

                reconciliationResults.push({
                    accountId: account.id,
                    accountNumber: account.accountNumber,
                    accountName: account.accountName,
                    accountBalance,
                    ledgerBalance: ledgerBalanceValue,
                    difference,
                    isReconciled
                });

                if (!isReconciled) {
                    logger.warn(`Account ${account.accountNumber} balance mismatch: ${difference}`);
                }
            }

            return reconciliationResults;
        } catch (error) {
            logger.error('Failed to reconcile account balances:', error);
            throw error;
        }
    }
}

module.exports = new DoubleEntryBookkeepingService();