// backend/src/services/financial/FinancialTransactionService.js
const financialDB = require('../../config/financial-database');
const doubleEntryService = require('./DoubleEntryBookkeepingService');
const logger = require('../../utils/logger');

/**
 * Financial Transaction Service with ACID compliance and race condition prevention
 */
class FinancialTransactionService {
    constructor() {
        this.FinancialTransaction = null;
        this.Account = null;
        this.FinancialAudit = null;
        this.LedgerEntry = null;
    }

    /**
     * Initialize the service
     */
    async initialize() {
        try {
            this.FinancialTransaction = financialDB.getModel('FinancialTransaction');
            this.Account = financialDB.getModel('Account');
            this.FinancialAudit = financialDB.getModel('FinancialAudit');
            this.LedgerEntry = financialDB.getModel('LedgerEntry');
            
            await doubleEntryService.initialize();
            logger.info('Financial Transaction Service initialized');
        } catch (error) {
            logger.error('Failed to initialize Financial Transaction Service:', error);
            throw error;
        }
    }

    /**
     * Create currency exchange transaction with ACID compliance
     */
    async createCurrencyExchange(exchangeData, requestMetadata = {}) {
        const startTime = Date.now();
        let transactionResult = null;

        try {
            // Input validation
            this.validateExchangeData(exchangeData);

            // Check for duplicate transactions
            await this.checkDuplicateTransaction(exchangeData);

            // Process with retry mechanism for race conditions
            transactionResult = await this.executeWithRetry(
                () => this.processCurrencyExchangeWithLocks(exchangeData, requestMetadata),
                3, // max retries
                1000 // initial delay
            );

            // Log success
            await this.FinancialAudit.logAction({
                tenantId: exchangeData.tenantId,
                userId: exchangeData.createdBy,
                action: 'TRANSACTION_CREATED',
                resourceType: 'FINANCIAL_TRANSACTION',
                resourceId: transactionResult.id,
                transactionId: transactionResult.id,
                description: `Currency exchange created: ${exchangeData.sourceAmount} ${exchangeData.fromCurrency} → ${exchangeData.destinationAmount} ${exchangeData.toCurrency}`,
                newValues: transactionResult.toJSON(),
                metadata: {
                    ...requestMetadata,
                    processingTime: Date.now() - startTime,
                    exchangeRate: exchangeData.exchangeRate
                },
                severity: exchangeData.sourceAmount > 10000 ? 'HIGH' : 'MEDIUM'
            });

            return transactionResult;

        } catch (error) {
            // Log failure
            await this.FinancialAudit.logAction({
                tenantId: exchangeData.tenantId || 'unknown',
                userId: exchangeData.createdBy || 'unknown',
                action: 'TRANSACTION_FAILED',
                resourceType: 'FINANCIAL_TRANSACTION',
                resourceId: transactionResult?.id || null,
                transactionId: transactionResult?.id || null,
                description: `Currency exchange failed: ${error.message}`,
                metadata: {
                    ...requestMetadata,
                    processingTime: Date.now() - startTime,
                    errorMessage: error.message,
                    errorStack: error.stack
                },
                severity: 'HIGH'
            });

            logger.error('Currency exchange failed:', error);
            throw error;
        }
    }

    /**
     * Process currency exchange with optimistic locking to prevent race conditions
     */
    async processCurrencyExchangeWithLocks(exchangeData, requestMetadata) {
        return await financialDB.transaction(async (dbTransaction) => {
            const { tenantId, customerId, fromCurrency, toCurrency } = exchangeData;

            // Lock customer accounts to prevent race conditions
            const [sourceAccount, destinationAccount] = await Promise.all([
                this.getAccountWithLock(tenantId, customerId, fromCurrency, dbTransaction),
                this.getAccountWithLock(tenantId, customerId, toCurrency, dbTransaction)
            ]);

            // Verify sufficient balance for sell transactions
            if (exchangeData.transactionType === 'CURRENCY_SELL') {
                const requiredAmount = exchangeData.sourceAmount + (exchangeData.feeAmount || 0);
                if (sourceAccount.availableBalance < requiredAmount) {
                    throw new Error(`موجودی کافی نیست. موجودی فعلی: ${sourceAccount.availableBalance}, مورد نیاز: ${requiredAmount}`);
                }
            }

            // Process the exchange using double-entry bookkeeping
            const result = await doubleEntryService.processCurrencyExchange({
                ...exchangeData,
                metadata: {
                    ...exchangeData.metadata,
                    ...requestMetadata,
                    sourceAccountId: sourceAccount.id,
                    destinationAccountId: destinationAccount.id
                }
            });

            // Validate transaction integrity
            await doubleEntryService.validateTransactionIntegrity(result.id);

            return result;
        });
    }

    /**
     * Create deposit transaction
     */
    async createDeposit(depositData, requestMetadata = {}) {
        const startTime = Date.now();
        
        try {
            this.validateDepositData(depositData);

            const result = await financialDB.transaction(async (dbTransaction) => {
                // Get customer account with lock
                const customerAccount = await this.getAccountWithLock(
                    depositData.tenantId,
                    depositData.customerId,
                    depositData.currency,
                    dbTransaction
                );

                // Process deposit
                return await doubleEntryService.processDeposit({
                    ...depositData,
                    metadata: {
                        ...depositData.metadata,
                        ...requestMetadata,
                        customerAccountId: customerAccount.id
                    }
                });
            });

            // Log success
            await this.FinancialAudit.logAction({
                tenantId: depositData.tenantId,
                userId: depositData.createdBy,
                action: 'TRANSACTION_CREATED',
                resourceType: 'FINANCIAL_TRANSACTION',
                resourceId: result.transaction.id,
                transactionId: result.transaction.id,
                description: `Deposit created: ${depositData.amount} ${depositData.currency}`,
                newValues: result.transaction.toJSON(),
                metadata: {
                    ...requestMetadata,
                    processingTime: Date.now() - startTime
                },
                severity: depositData.amount > 10000 ? 'HIGH' : 'MEDIUM'
            });

            return result;

        } catch (error) {
            logger.error('Deposit creation failed:', error);
            throw error;
        }
    }

    /**
     * Create withdrawal transaction
     */
    async createWithdrawal(withdrawalData, requestMetadata = {}) {
        const startTime = Date.now();
        
        try {
            this.validateWithdrawalData(withdrawalData);

            const result = await financialDB.transaction(async (dbTransaction) => {
                // Get customer account with lock and check balance
                const customerAccount = await this.getAccountWithLock(
                    withdrawalData.tenantId,
                    withdrawalData.customerId,
                    withdrawalData.currency,
                    dbTransaction
                );

                if (customerAccount.availableBalance < withdrawalData.amount) {
                    throw new Error(`موجودی کافی نیست. موجودی فعلی: ${customerAccount.availableBalance}`);
                }

                // Process withdrawal
                return await doubleEntryService.processWithdrawal({
                    ...withdrawalData,
                    metadata: {
                        ...withdrawalData.metadata,
                        ...requestMetadata,
                        customerAccountId: customerAccount.id
                    }
                });
            });

            // Log success
            await this.FinancialAudit.logAction({
                tenantId: withdrawalData.tenantId,
                userId: withdrawalData.createdBy,
                action: 'TRANSACTION_CREATED',
                resourceType: 'FINANCIAL_TRANSACTION',
                resourceId: result.transaction.id,
                transactionId: result.transaction.id,
                description: `Withdrawal created: ${withdrawalData.amount} ${withdrawalData.currency}`,
                newValues: result.transaction.toJSON(),
                metadata: {
                    ...requestMetadata,
                    processingTime: Date.now() - startTime
                },
                severity: withdrawalData.amount > 10000 ? 'HIGH' : 'MEDIUM'
            });

            return result;

        } catch (error) {
            logger.error('Withdrawal creation failed:', error);
            throw error;
        }
    }

    /**
     * Get account with row-level lock to prevent race conditions
     */
    async getAccountWithLock(tenantId, customerId, currency, dbTransaction) {
        const account = await this.Account.findOne({
            where: {
                tenantId,
                customerId,
                currency,
                accountType: 'ASSET',
                isActive: true
            },
            lock: dbTransaction.LOCK.UPDATE, // Row-level lock
            transaction: dbTransaction
        });

        if (!account) {
            // Create account if it doesn't exist
            return await this.Account.createCustomerAccount(
                tenantId, customerId, currency, customerId, dbTransaction
            );
        }

        return account;
    }

    /**
     * Execute operation with retry mechanism for handling race conditions
     */
    async executeWithRetry(operation, maxRetries = 3, initialDelay = 1000) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                // Check if error is retryable
                if (this.isRetryableError(error) && attempt < maxRetries) {
                    const delay = initialDelay * Math.pow(2, attempt - 1); // Exponential backoff
                    logger.warn(`Transaction failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`, error.message);
                    await this.delay(delay);
                    continue;
                }
                
                // If not retryable or max attempts reached, throw the error
                throw error;
            }
        }
        
        throw lastError;
    }

    /**
     * Check if error is retryable (race condition, deadlock, etc.)
     */
    isRetryableError(error) {
        const retryableMessages = [
            'تراکنش ناموفق: داده‌ها تغییر کرده‌اند',
            'could not serialize access due to concurrent update',
            'deadlock detected',
            'connection reset',
            'connection timeout'
        ];

        return retryableMessages.some(msg => 
            error.message.toLowerCase().includes(msg.toLowerCase())
        );
    }

    /**
     * Delay utility
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Check for duplicate transactions
     */
    async checkDuplicateTransaction(transactionData) {
        if (transactionData.reference) {
            const existing = await this.FinancialTransaction.findByReference(
                transactionData.reference,
                transactionData.tenantId
            );
            
            if (existing) {
                throw new Error(`تراکنش تکراری: رفرنس ${transactionData.reference} قبلاً ثبت شده است`);
            }
        }
        
        if (transactionData.externalReference) {
            const existing = await this.FinancialTransaction.findByExternalReference(
                transactionData.externalReference,
                transactionData.tenantId
            );
            
            if (existing) {
                throw new Error(`تراکنش تکراری: رفرنس خارجی ${transactionData.externalReference} قبلاً ثبت شده است`);
            }
        }
    }

    /**
     * Get transaction with full audit trail
     */
    async getTransactionWithAuditTrail(transactionId) {
        const transaction = await this.FinancialTransaction.findByPk(transactionId, {
            include: [
                {
                    model: this.LedgerEntry,
                    as: 'ledgerEntries',
                    include: [
                        {
                            model: this.Account,
                            as: 'account'
                        }
                    ]
                },
                {
                    model: this.FinancialAudit,
                    as: 'auditLogs'
                }
            ]
        });

        if (!transaction) {
            throw new Error('تراکنش یافت نشد');
        }

        return transaction;
    }

    /**
     * Cancel transaction with proper audit trail
     */
    async cancelTransaction(transactionId, reason, cancelledBy, requestMetadata = {}) {
        return await financialDB.transaction(async (dbTransaction) => {
            const transaction = await this.FinancialTransaction.findByPk(transactionId, {
                lock: dbTransaction.LOCK.UPDATE,
                transaction: dbTransaction
            });

            if (!transaction) {
                throw new Error('تراکنش یافت نشد');
            }

            if (transaction.status === 'COMPLETED') {
                throw new Error('تراکنش تکمیل شده قابل لغو نیست');
            }

            // Cancel the transaction
            await transaction.cancel(reason, dbTransaction);

            // Reverse any posted ledger entries
            const ledgerEntries = await this.LedgerEntry.findAll({
                where: {
                    transactionId: transaction.id,
                    isPosted: true,
                    isReversed: false
                },
                transaction: dbTransaction
            });

            for (const entry of ledgerEntries) {
                await entry.reverse(cancelledBy, reason, dbTransaction);
            }

            // Log cancellation
            await this.FinancialAudit.logAction({
                tenantId: transaction.tenantId,
                userId: cancelledBy,
                action: 'TRANSACTION_CANCELLED',
                resourceType: 'FINANCIAL_TRANSACTION',
                resourceId: transaction.id,
                transactionId: transaction.id,
                description: `Transaction cancelled: ${reason}`,
                oldValues: transaction.toJSON(),
                metadata: {
                    ...requestMetadata,
                    reason,
                    reversedEntries: ledgerEntries.length
                },
                severity: 'HIGH'
            });

            return transaction;
        });
    }

    /**
     * Validation methods
     */
    validateExchangeData(data) {
        const required = ['tenantId', 'customerId', 'fromCurrency', 'toCurrency', 'sourceAmount', 'destinationAmount', 'exchangeRate', 'createdBy'];
        
        for (const field of required) {
            if (!data[field]) {
                throw new Error(`فیلد ضروری ${field} موجود نیست`);
            }
        }

        if (data.sourceAmount <= 0 || data.destinationAmount <= 0) {
            throw new Error('مقدار تراکنش باید بیشتر از صفر باشد');
        }

        if (data.exchangeRate <= 0) {
            throw new Error('نرخ ارز باید بیشتر از صفر باشد');
        }

        if (data.fromCurrency === data.toCurrency) {
            throw new Error('ارز مبدأ و مقصد نمی‌توانند یکسان باشند');
        }
    }

    validateDepositData(data) {
        const required = ['tenantId', 'customerId', 'currency', 'amount', 'createdBy'];
        
        for (const field of required) {
            if (!data[field]) {
                throw new Error(`فیلد ضروری ${field} موجود نیست`);
            }
        }

        if (data.amount <= 0) {
            throw new Error('مقدار واریز باید بیشتر از صفر باشد');
        }
    }

    validateWithdrawalData(data) {
        const required = ['tenantId', 'customerId', 'currency', 'amount', 'createdBy'];
        
        for (const field of required) {
            if (!data[field]) {
                throw new Error(`فیلد ضروری ${field} موجود نیست`);
            }
        }

        if (data.amount <= 0) {
            throw new Error('مقدار برداشت باید بیشتر از صفر باشد');
        }
    }

    /**
     * Get financial statistics
     */
    async getFinancialStats(tenantId, startDate, endDate) {
        return await this.FinancialTransaction.getTransactionStats(tenantId, startDate, endDate);
    }

    /**
     * Generate financial report
     */
    async generateFinancialReport(tenantId, reportType, startDate, endDate) {
        switch (reportType) {
            case 'trial_balance':
                return await doubleEntryService.generateTrialBalance(tenantId, endDate);
            
            case 'transaction_summary':
                return await this.getFinancialStats(tenantId, startDate, endDate);
            
            case 'account_reconciliation':
                return await doubleEntryService.reconcileAccountBalances(tenantId);
            
            default:
                throw new Error('نوع گزارش نامعتبر است');
        }
    }
}

module.exports = new FinancialTransactionService();