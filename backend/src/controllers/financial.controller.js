// backend/src/controllers/financial.controller.js
const FinancialTransactionService = require('../services/financial/FinancialTransactionService');
const DoubleEntryBookkeepingService = require('../services/financial/DoubleEntryBookkeepingService');
const financialDB = require('../config/financial-database');
const logger = require('../utils/logger');
const { validationResult } = require('express-validator');

/**
 * Financial Controller with ACID compliance and proper audit trail
 */
class FinancialController {
    /**
     * Initialize financial services
     */
    static async initialize() {
        try {
            await financialDB.initialize();
            await FinancialTransactionService.initialize();
            await DoubleEntryBookkeepingService.initialize();
            logger.info('Financial Controller initialized');
        } catch (error) {
            logger.error('Failed to initialize Financial Controller:', error);
            throw error;
        }
    }

    /**
     * Create currency exchange transaction
     */
    static async createCurrencyExchange(req, res) {
        try {
            // Validate request
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'داده‌های ورودی نامعتبر',
                    errors: errors.array()
                });
            }

            const {
                fromCurrency,
                toCurrency,
                sourceAmount,
                destinationAmount,
                exchangeRate,
                feeAmount = 0,
                feeCurrency,
                description,
                reference,
                externalReference
            } = req.body;

            const tenantId = req.user.tenantId;
            const customerId = req.user.userId;
            const createdBy = req.user.userId;

            // Prepare transaction data
            const exchangeData = {
                tenantId,
                customerId,
                fromCurrency,
                toCurrency,
                sourceAmount: parseFloat(sourceAmount),
                destinationAmount: parseFloat(destinationAmount),
                exchangeRate: parseFloat(exchangeRate),
                feeAmount: parseFloat(feeAmount),
                feeCurrency: feeCurrency || fromCurrency,
                transactionType: sourceAmount > 0 ? 'CURRENCY_BUY' : 'CURRENCY_SELL',
                description,
                reference,
                externalReference,
                createdBy,
                metadata: {
                    userAgent: req.headers['user-agent'],
                    clientIp: req.ip,
                    sessionId: req.sessionID
                }
            };

            // Prepare request metadata for audit
            const requestMetadata = {
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                requestMethod: req.method,
                requestUrl: req.originalUrl,
                sessionId: req.sessionID
            };

            // Process the exchange
            const result = await FinancialTransactionService.createCurrencyExchange(
                exchangeData,
                requestMetadata
            );

            res.status(201).json({
                success: true,
                message: 'تراکنش ارز با موفقیت ایجاد شد',
                data: {
                    transactionId: result.id,
                    transactionNumber: result.transactionNumber,
                    status: result.status,
                    sourceAmount: result.sourceAmount,
                    destinationAmount: result.destinationAmount,
                    exchangeRate: result.exchangeRate,
                    feeAmount: result.feeAmount,
                    processedAt: result.processedAt
                }
            });

        } catch (error) {
            logger.error('Currency exchange creation failed:', error);
            
            res.status(500).json({
                success: false,
                message: error.message || 'خطا در ایجاد تراکنش ارز',
                errorCode: 'EXCHANGE_CREATION_FAILED'
            });
        }
    }

    /**
     * Create deposit transaction
     */
    static async createDeposit(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'داده‌های ورودی نامعتبر',
                    errors: errors.array()
                });
            }

            const {
                currency,
                amount,
                description,
                reference,
                externalReference
            } = req.body;

            const tenantId = req.user.tenantId;
            const customerId = req.user.userId;
            const createdBy = req.user.userId;

            const depositData = {
                tenantId,
                customerId,
                currency,
                amount: parseFloat(amount),
                description,
                reference,
                externalReference,
                createdBy,
                metadata: {
                    userAgent: req.headers['user-agent'],
                    clientIp: req.ip,
                    sessionId: req.sessionID
                }
            };

            const requestMetadata = {
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                requestMethod: req.method,
                requestUrl: req.originalUrl,
                sessionId: req.sessionID
            };

            const result = await FinancialTransactionService.createDeposit(
                depositData,
                requestMetadata
            );

            res.status(201).json({
                success: true,
                message: 'واریز با موفقیت انجام شد',
                data: {
                    transactionId: result.transaction.id,
                    transactionNumber: result.transaction.transactionNumber,
                    status: result.transaction.status,
                    amount: result.transaction.sourceAmount,
                    currency: result.transaction.fromCurrency,
                    processedAt: result.transaction.processedAt
                }
            });

        } catch (error) {
            logger.error('Deposit creation failed:', error);
            
            res.status(500).json({
                success: false,
                message: error.message || 'خطا در انجام واریز',
                errorCode: 'DEPOSIT_CREATION_FAILED'
            });
        }
    }

    /**
     * Create withdrawal transaction
     */
    static async createWithdrawal(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: 'داده‌های ورودی نامعتبر',
                    errors: errors.array()
                });
            }

            const {
                currency,
                amount,
                description,
                reference,
                externalReference
            } = req.body;

            const tenantId = req.user.tenantId;
            const customerId = req.user.userId;
            const createdBy = req.user.userId;

            const withdrawalData = {
                tenantId,
                customerId,
                currency,
                amount: parseFloat(amount),
                description,
                reference,
                externalReference,
                createdBy,
                metadata: {
                    userAgent: req.headers['user-agent'],
                    clientIp: req.ip,
                    sessionId: req.sessionID
                }
            };

            const requestMetadata = {
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                requestMethod: req.method,
                requestUrl: req.originalUrl,
                sessionId: req.sessionID
            };

            const result = await FinancialTransactionService.createWithdrawal(
                withdrawalData,
                requestMetadata
            );

            res.status(201).json({
                success: true,
                message: 'برداشت با موفقیت انجام شد',
                data: {
                    transactionId: result.transaction.id,
                    transactionNumber: result.transaction.transactionNumber,
                    status: result.transaction.status,
                    amount: result.transaction.sourceAmount,
                    currency: result.transaction.fromCurrency,
                    processedAt: result.transaction.processedAt
                }
            });

        } catch (error) {
            logger.error('Withdrawal creation failed:', error);
            
            res.status(500).json({
                success: false,
                message: error.message || 'خطا در انجام برداشت',
                errorCode: 'WITHDRAWAL_CREATION_FAILED'
            });
        }
    }

    /**
     * Get transaction details with audit trail
     */
    static async getTransaction(req, res) {
        try {
            const { transactionId } = req.params;
            const tenantId = req.user.tenantId;

            const transaction = await FinancialTransactionService.getTransactionWithAuditTrail(transactionId);

            // Verify tenant access
            if (transaction.tenantId !== tenantId) {
                return res.status(403).json({
                    success: false,
                    message: 'دسترسی غیرمجاز'
                });
            }

            // Check customer access (non-admin users can only see their own transactions)
            if (req.user.role !== 'admin' && transaction.customerId !== req.user.userId) {
                return res.status(403).json({
                    success: false,
                    message: 'دسترسی غیرمجاز'
                });
            }

            res.json({
                success: true,
                data: {
                    transaction: {
                        id: transaction.id,
                        transactionNumber: transaction.transactionNumber,
                        transactionType: transaction.transactionType,
                        fromCurrency: transaction.fromCurrency,
                        toCurrency: transaction.toCurrency,
                        sourceAmount: transaction.sourceAmount,
                        destinationAmount: transaction.destinationAmount,
                        exchangeRate: transaction.exchangeRate,
                        feeAmount: transaction.feeAmount,
                        status: transaction.status,
                        description: transaction.description,
                        processedAt: transaction.processedAt,
                        createdAt: transaction.createdAt
                    },
                    ledgerEntries: transaction.ledgerEntries?.map(entry => ({
                        id: entry.id,
                        entryNumber: entry.entryNumber,
                        accountId: entry.accountId,
                        accountName: entry.account?.accountName,
                        entryType: entry.entryType,
                        amount: entry.amount,
                        currency: entry.currency,
                        description: entry.description,
                        postingDate: entry.postingDate,
                        isPosted: entry.isPosted
                    })),
                    auditTrail: transaction.auditLogs?.map(audit => ({
                        id: audit.id,
                        action: audit.action,
                        description: audit.description,
                        severity: audit.severity,
                        createdAt: audit.createdAt
                    }))
                }
            });

        } catch (error) {
            logger.error('Failed to get transaction:', error);
            
            res.status(500).json({
                success: false,
                message: 'خطا در دریافت اطلاعات تراکنش',
                errorCode: 'TRANSACTION_FETCH_FAILED'
            });
        }
    }

    /**
     * Cancel transaction
     */
    static async cancelTransaction(req, res) {
        try {
            const { transactionId } = req.params;
            const { reason } = req.body;
            const tenantId = req.user.tenantId;
            const cancelledBy = req.user.userId;

            if (!reason) {
                return res.status(400).json({
                    success: false,
                    message: 'دلیل لغو ضروری است'
                });
            }

            const requestMetadata = {
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'],
                requestMethod: req.method,
                requestUrl: req.originalUrl,
                sessionId: req.sessionID
            };

            const result = await FinancialTransactionService.cancelTransaction(
                transactionId,
                reason,
                cancelledBy,
                requestMetadata
            );

            // Verify tenant access
            if (result.tenantId !== tenantId) {
                return res.status(403).json({
                    success: false,
                    message: 'دسترسی غیرمجاز'
                });
            }

            res.json({
                success: true,
                message: 'تراکنش با موفقیت لغو شد',
                data: {
                    transactionId: result.id,
                    status: result.status,
                    cancelledAt: result.failedAt
                }
            });

        } catch (error) {
            logger.error('Transaction cancellation failed:', error);
            
            res.status(500).json({
                success: false,
                message: error.message || 'خطا در لغو تراکنش',
                errorCode: 'TRANSACTION_CANCELLATION_FAILED'
            });
        }
    }

    /**
     * Get account balance
     */
    static async getAccountBalance(req, res) {
        try {
            const { currency } = req.params;
            const tenantId = req.user.tenantId;
            const customerId = req.user.userId;

            const Account = financialDB.getModel('Account');
            
            const account = await Account.findCustomerAccount(tenantId, customerId, currency);
            
            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'حساب یافت نشد'
                });
            }

            // Get balance from ledger for verification
            const ledgerBalance = await DoubleEntryBookkeepingService.getAccountBalance(account.id);

            res.json({
                success: true,
                data: {
                    currency,
                    balance: account.balance,
                    availableBalance: account.availableBalance,
                    blockedBalance: account.blockedBalance,
                    ledgerBalance: ledgerBalance.balance,
                    lastUpdated: account.updatedAt
                }
            });

        } catch (error) {
            logger.error('Failed to get account balance:', error);
            
            res.status(500).json({
                success: false,
                message: 'خطا در دریافت موجودی حساب',
                errorCode: 'BALANCE_FETCH_FAILED'
            });
        }
    }

    /**
     * Get financial statistics
     */
    static async getFinancialStats(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const tenantId = req.user.tenantId;

            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'تاریخ شروع و پایان ضروری است'
                });
            }

            const stats = await FinancialTransactionService.getFinancialStats(
                tenantId,
                new Date(startDate),
                new Date(endDate)
            );

            res.json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error('Failed to get financial statistics:', error);
            
            res.status(500).json({
                success: false,
                message: 'خطا در دریافت آمار مالی',
                errorCode: 'STATS_FETCH_FAILED'
            });
        }
    }

    /**
     * Generate financial report
     */
    static async generateFinancialReport(req, res) {
        try {
            const { reportType } = req.params;
            const { startDate, endDate } = req.query;
            const tenantId = req.user.tenantId;

            // Verify admin access for certain reports
            if (['trial_balance', 'account_reconciliation'].includes(reportType) && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'دسترسی غیرمجاز - فقط ادمین‌ها می‌توانند این گزارش را مشاهده کنند'
                });
            }

            const report = await FinancialTransactionService.generateFinancialReport(
                tenantId,
                reportType,
                startDate ? new Date(startDate) : null,
                endDate ? new Date(endDate) : null
            );

            res.json({
                success: true,
                data: {
                    reportType,
                    generatedAt: new Date(),
                    data: report
                }
            });

        } catch (error) {
            logger.error('Failed to generate financial report:', error);
            
            res.status(500).json({
                success: false,
                message: error.message || 'خطا در تولید گزارش مالی',
                errorCode: 'REPORT_GENERATION_FAILED'
            });
        }
    }

    /**
     * Get system health check
     */
    static async healthCheck(req, res) {
        try {
            const health = await financialDB.healthCheck();
            
            res.json({
                success: true,
                data: {
                    database: health,
                    services: {
                        financialTransactionService: 'healthy',
                        doubleEntryBookkeepingService: 'healthy'
                    },
                    timestamp: new Date()
                }
            });

        } catch (error) {
            logger.error('Health check failed:', error);
            
            res.status(500).json({
                success: false,
                message: 'خطا در بررسی سلامت سیستم',
                error: error.message
            });
        }
    }
}

module.exports = FinancialController;