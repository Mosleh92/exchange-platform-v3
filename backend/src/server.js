const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoose = require('mongoose');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { requestLogger, errorLogger } = require('./utils/logger');
const { authLimiter, apiLimiter, tenantLimiter } = require('./middleware/rate-limit');
const { validate } = require('./middleware/validation');
const { csrfProtection, csrfErrorHandler, generateToken } = require('./middleware/csrf');
const { sessionMiddleware, sessionErrorHandler, cleanupSession } = require('./middleware/session');
const xssClean = require('xss-clean'); // Added xss-clean
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');
require('dotenv').config();

// Import configurations and middleware
const databaseConfig = require('./config/database');
const authMiddleware = require('./middleware/auth'); // Changed import
const QueryEnforcementMiddleware = require('./middleware/queryEnforcement');

// Import controllers
const authController = require('./controllers/auth.controller');
const partnerController = require('./controllers/partner.controller');
const transactionController = require('./controllers/transaction.controller');
const rateController = require('./controllers/rate.controller');
const customerController = require('./controllers/customer.controller');
const dashboardController = require('./controllers/dashboard.controller');
const paymentController = require('./controllers/payment.controller');
const debtController = require('./controllers/debt.controller');
const exchangeAccountController = require('./controllers/exchangeAccount.controller');
const interBranchTransferController = require('./controllers/interBranchTransfer.controller');

// Import validation rules
const ValidationRules = require('./utils/validation');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/users');
const customerRoutes = require('./routes/customers');
const accountRoutes = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');
const remittanceRoutes = require('./routes/remittance');
const exchangeRateRoutes = require('./routes/exchangeRate');
const paymentRoutes = require('./routes/payment.routes');
const debtRoutes = require('./routes/debt.routes');
const currencyTransactionRoutes = require('./routes/currencyTransaction.routes');
const p2pRoutes = require('./routes/p2p.routes');
const customerBankingRoutes = require('./routes/customerBanking.routes');
const receiptRoutes = require('./routes/receipt.routes');
const tenantSettingsRoutes = require('./routes/tenantSettings.routes');
const superAdminRoutes = require('./routes/superAdmin');
const salesPlanRoutes = require('./routes/salesPlan.routes');
const holdingRoutes = require('./routes/holding.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const documentsRoutes = require('./routes/documents');
const reportViolationRoutes = require('./routes/reportViolation');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Exchange Platform API',
    version: '1.0.0',
    description: 'مستندات خودکار API پلتفرم صرافی'
  },
  servers: [
    { url: 'http://localhost:5000', description: 'Local server' }
  ]
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.js', './src/controllers/*.js'], // مسیر فایل‌های روت و کنترلر
};
const swaggerSpec = swaggerJSDoc(options);

class ExchangePlatformServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 5000;
        this.server = createServer(this.app);
        this.io = new Server(this.server, {
            cors: {
                origin: process.env.FRONTEND_URL || "http://localhost:3000",
                methods: ["GET", "POST"]
            }
        });
        
        this.setupDatabase();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupSocketIO();
        this.setupErrorHandling();
    }

    async setupDatabase() {
        try {
            await databaseConfig.connect();
            console.log('✅ Database connected successfully');
        } catch (error) {
            console.error('❌ Database connection failed:', error);
            process.exit(1);
        }
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
                    scriptSrc: ["'self'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", "ws:", "wss:"],
                    fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
                },
            },
        }));

        this.app.use(cors({
            origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
            credentials: true
        }));

        // Performance middleware
        this.app.use(compression());

        // Logging middleware
        this.app.use(requestLogger);

        // Session middleware
        this.app.use(sessionMiddleware);
        this.app.use(sessionErrorHandler);

        // CSRF protection
        this.app.use(csrfProtection);
        this.app.use(csrfErrorHandler);
        this.app.use(generateToken);

        // Rate limiting
        this.app.use('/api/auth', authLimiter);
        this.app.use('/api', apiLimiter);
        this.app.use('/api/tenants', tenantLimiter);

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // XSS Protection
        this.app.use(xssClean());

        // Static files
        this.app.use('/uploads', express.static('uploads'));

        // Request logging
        this.app.use((req, res, next) => {
            const timestamp = new Date().toISOString();
            console.log(`${timestamp} - ${req.method} ${req.path} - IP: ${req.ip}`);
            next();
        });

        // Language middleware
        this.app.use((req, res, next) => {
            const lang = req.headers['accept-language'] || 'fa';
            const i18n = require('./utils/i18n');
            i18n.setLanguage(lang.startsWith('en') ? 'en' : 'fa');
            req.i18n = i18n;
            next();
        });

        this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({
                success: true,
                message: 'Exchange Platform API is running',
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                uptime: process.uptime()
            });
        });

        // API Info
        this.app.get('/api', (req, res) => {
            res.json({
                success: true,
                message: 'پلتفرم صرافی - API سرویس',
                version: '1.0.0',
                endpoints: {
                    auth: '/api/auth',
                    tenants: '/api/tenants',
                    transactions: '/api/transactions',
                    rates: '/api/rates',
                    customers: '/api/customers',
                    dashboard: '/api/dashboard'
                }
            });
        });

        // Authentication routes
        this.setupAuthRoutes();
        
        // Tenant/Partner management routes
        this.setupTenantRoutes();
        
        // Exchange rates routes
        this.setupRatesRoutes();
        
        // Transaction routes
        this.setupTransactionRoutes();

        // Customer routes
        this.setupCustomerRoutes();

        // Dashboard routes
        this.setupDashboardRoutes();

        // Payment routes
        this.setupPaymentRoutes();

        // Debt routes
        this.setupDebtRoutes();

        // Exchange Account routes
        this.setupExchangeAccountRoutes();

        // Inter-Branch Transfer routes
        this.setupInterBranchTransferRoutes();

        // Holding routes
        this.app.use('/api/holding', holdingRoutes);

        // Query enforcement middleware for tenant isolation
        this.app.use('/api', QueryEnforcementMiddleware.enforceTenantIsolation());
        this.app.use('/api', QueryEnforcementMiddleware.validateTenantAccess());

        // Routes
        this.app.use('/api/auth', authRoutes);
        this.app.use('/api/users', userRoutes);
        this.app.use('/api/customers', customerRoutes);
        this.app.use('/api/accounts', accountRoutes);
        this.app.use('/api/transactions', transactionRoutes);
        this.app.use('/api/remittances', remittanceRoutes);
        this.app.use('/api/exchange-rates', exchangeRateRoutes);
        this.app.use('/api/payments', paymentRoutes);
        this.app.use('/api/debts', debtRoutes);
        this.app.use('/api/currency-transactions', currencyTransactionRoutes);
        this.app.use('/api/p2p', p2pRoutes);
        this.app.use('/api/customer-banking', customerBankingRoutes);
        this.app.use('/api/receipts', receiptRoutes);
        this.app.use('/api/tenant-settings', tenantSettingsRoutes);
        this.app.use('/api/super-admin', superAdminRoutes);
        this.app.use('/api/super-admin/sales-plans', salesPlanRoutes);
        this.app.use('/api/dashboard', dashboardRoutes);
        this.app.use('/api/documents', documentsRoutes);
        this.app.use('/api/report-violations', reportViolationRoutes);
        this.app.use('/api/reports', require('./routes/report'));
        this.app.use('/api/plans', require('./routes/plan.routes'));
        this.app.use('/api/subscriptions', require('./routes/subscription.routes'));
        this.app.use('/api/invoices', require('./routes/invoice.routes'));

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                message: 'API endpoint یافت نشد',
                path: req.originalUrl
            });
        });
    }

    setupAuthRoutes() {
        const authRouter = express.Router();

        // Login
        authRouter.post('/login', 
            ValidationRules.loginValidation(),
            authController.login
        );

        // Register
        authRouter.post('/register',
            ValidationRules.registerValidation(),
            authController.register
        );

        // Logout
        authRouter.post('/logout',
            authMiddleware.auth, // Corrected
            authController.logout
        );

        // Validate token
        authRouter.post('/validate',
            authMiddleware.auth, // Corrected
            authController.validateToken
        );

        // Refresh token
        authRouter.post('/refresh',
            authController.refreshToken
        );

        // Change password
        authRouter.put('/change-password',
            authMiddleware.auth, // Corrected
            ValidationRules.changePasswordValidation(),
            authController.changePassword
        );

        // Forgot password
        authRouter.post('/forgot-password',
            ValidationRules.forgotPasswordValidation(),
            authController.forgotPassword
        );

        // Reset password
        authRouter.post('/reset-password',
            ValidationRules.resetPasswordValidation(),
            authController.resetPassword
        );

        // Get profile
        authRouter.get('/profile',
            authMiddleware.auth, // Corrected
            authController.getProfile
        );

        // Update profile
        authRouter.put('/profile',
            authMiddleware.auth, // Corrected
            ValidationRules.updateProfileValidation(),
            authController.updateProfile
        );

        this.app.use('/api/auth', authRouter);
    }

    setupTenantRoutes() {
        const tenantRouter = express.Router();

        // Apply authentication to all tenant routes
        tenantRouter.use(authMiddleware.auth); // Corrected
        tenantRouter.use(authMiddleware.tenantAccess); // Corrected, assuming tenantIsolation was tenantAccess

        // Get all tenants (super admin only)
        tenantRouter.get('/',
            authMiddleware.authorize(['superAdmin']),
            partnerController.getAllPartners
        );

        // Create new tenant (super admin only)
        tenantRouter.post('/',
            authMiddleware.authorize(['superAdmin']),
            ValidationRules.tenantValidation(),
            partnerController.createPartner
        );

        // Get current tenant
        tenantRouter.get('/current',
            partnerController.getCurrentTenant
        );

        // Get tenant by ID
        tenantRouter.get('/:tenantId',
            authMiddleware.authorize(['superAdmin', 'tenantAdmin']),
            partnerController.getPartnerById
        );

        // Update tenant
        tenantRouter.put('/:tenantId',
            authMiddleware.authorize(['superAdmin']),
            ValidationRules.tenantUpdateValidation(),
            partnerController.updatePartner
        );

        // Delete tenant
        tenantRouter.delete('/:tenantId',
            authMiddleware.authorize(['superAdmin']),
            partnerController.deletePartner
        );

        // Get tenant branches
        tenantRouter.get('/:tenantId/branches',
            authMiddleware.authorize(['superAdmin', 'tenantAdmin', 'branchManager']),
            partnerController.getTenantBranches
        );

        // Create branch
        tenantRouter.post('/:tenantId/branches',
            authMiddleware.authorize(['superAdmin', 'tenantAdmin']),
            ValidationRules.branchValidation(),
            partnerController.createBranch
        );

        // Update branch
        tenantRouter.put('/:tenantId/branches/:branchId',
            authMiddleware.authorize(['superAdmin', 'tenantAdmin']),
            ValidationRules.branchUpdateValidation(),
            partnerController.updateBranch
        );

        // Delete branch
        tenantRouter.delete('/:tenantId/branches/:branchId',
            authMiddleware.authorize(['superAdmin', 'tenantAdmin']),
            partnerController.deleteBranch
        );

        this.app.use('/api/tenants', tenantRouter);
    }

    setupRatesRoutes() {
        const rateRouter = express.Router();

        // Apply authentication to all rate routes
        rateRouter.use(authMiddleware.auth); // Corrected
        rateRouter.use(authMiddleware.tenantAccess); // Corrected

        // Get all rates
        rateRouter.get('/',
            rateController.getAllRates
        );

        // Create new rate
        rateRouter.post('/',
            authMiddleware.authorize(['superAdmin', 'tenantAdmin']),
            ValidationRules.rateValidation(),
            rateController.createRate
        );

        // Get rate by ID
        rateRouter.get('/:rateId',
            rateController.getRateById
        );

        // Update rate
        rateRouter.put('/:rateId',
            authMiddleware.authorize(['superAdmin', 'tenantAdmin']),
            ValidationRules.rateUpdateValidation(),
            rateController.updateRate
        );

        // Delete rate
        rateRouter.delete('/:rateId',
            authMiddleware.authorize(['superAdmin', 'tenantAdmin']),
            rateController.deleteRate
        );

        // Get live rates
        rateRouter.get('/live/current',
            rateController.getLiveRates
        );

        // Update rates from market
        rateRouter.post('/update-from-market',
            authMiddleware.authorize(['superAdmin', 'tenantAdmin']),
            rateController.updateFromMarket
        );

        // Calculate exchange
        rateRouter.post('/calculate',
            ValidationRules.calculateValidation(),
            rateController.calculateExchange
        );

        this.app.use('/api/rates', rateRouter);
    }

    setupTransactionRoutes() {
        const transactionRouter = express.Router();

        // Apply authentication to all transaction routes
        transactionRouter.use(authMiddleware.auth); // Corrected
        transactionRouter.use(authMiddleware.tenantAccess); // Corrected

        // Get all transactions
        transactionRouter.get('/',
            transactionController.getAllTransactions
        );

        // Create new transaction
        transactionRouter.post('/',
            ValidationRules.transactionValidation(),
            transactionController.createTransaction
        );

        // Get transaction by ID
        transactionRouter.get('/:transactionId',
            transactionController.getTransactionById
        );

        // Update transaction
        transactionRouter.put('/:transactionId',
            authMiddleware.authorize(['superAdmin', 'tenantAdmin', 'branchManager']),
            ValidationRules.transactionUpdateValidation(),
            transactionController.updateTransaction
        );

        // Delete transaction
        transactionRouter.delete('/:transactionId',
            authMiddleware.authorize(['superAdmin', 'tenantAdmin']),
            transactionController.deleteTransaction
        );

        // Approve transaction
        transactionRouter.post('/:transactionId/approve',
            authMiddleware.authorize(['superAdmin', 'tenantAdmin', 'branchManager']),
            transactionController.approveTransaction
        );

        // Reject transaction
        transactionRouter.post('/:transactionId/reject',
            authMiddleware.authorize(['superAdmin', 'tenantAdmin', 'branchManager']),
            transactionController.rejectTransaction
        );

        // Calculate exchange
        transactionRouter.post('/calculate',
            ValidationRules.calculateValidation(),
            transactionController.calculateExchange
        );

        // Get transaction history
        transactionRouter.get('/history',
            transactionController.getTransactionHistory
        );

        this.app.use('/api/transactions', transactionRouter);
    }

    setupCustomerRoutes() {
        const customerRouter = express.Router();

        // Apply authentication to all customer routes
        customerRouter.use(authMiddleware.auth); // Corrected
        customerRouter.use(authMiddleware.tenantAccess); // Corrected

        // Get all customers
        customerRouter.get('/',
            customerController.getAllCustomers
        );

        // Create new customer
        customerRouter.post('/',
            ValidationRules.customerValidation(),
            customerController.createCustomer
        );

        // Get customer by ID
        customerRouter.get('/:customerId',
            customerController.getCustomerById
        );

        // Update customer
        customerRouter.put('/:customerId',
            ValidationRules.customerUpdateValidation(),
            customerController.updateCustomer
        );

        // Delete customer
        customerRouter.delete('/:customerId',
            authMiddleware.authorize(['superAdmin', 'tenantAdmin']),
            customerController.deleteCustomer
        );

        // Get customer accounts
        customerRouter.get('/:customerId/accounts',
            customerController.getCustomerAccounts
        );

        // Get customer transactions
        customerRouter.get('/:customerId/transactions',
            customerController.getCustomerTransactions
        );

        this.app.use('/api/customers', customerRouter);
    }

    setupDashboardRoutes() {
        const dashboardRouter = express.Router();

        // Apply authentication to all dashboard routes
        dashboardRouter.use(authMiddleware.auth); // Corrected
        dashboardRouter.use(authMiddleware.tenantAccess); // Corrected

        // Get dashboard stats
        dashboardRouter.get('/stats',
            dashboardController.getStats
        );

        // Get recent transactions
        dashboardRouter.get('/recent-transactions',
            dashboardController.getRecentTransactions
        );

        // Get chart data
        dashboardRouter.get('/chart-data',
            dashboardController.getChartData
        );

        // Get notifications
        dashboardRouter.get('/notifications',
            dashboardController.getNotifications
        );

        this.app.use('/api/dashboard', dashboardRouter);
    }

    setupPaymentRoutes() {
        const paymentRouter = express.Router();

        // Apply authentication to all payment routes
        paymentRouter.use(authMiddleware.auth); // Corrected
        paymentRouter.use(authMiddleware.tenantAccess); // Corrected

        // Get all payments
        paymentRouter.get('/',
            paymentController.getAllPayments
        );

        // Create new payment
        paymentRouter.post('/',
            ValidationRules.paymentValidation(),
            paymentController.createPayment
        );

        // Upload receipt
        paymentRouter.post('/:paymentId/receipt',
            paymentController.uploadReceipt
        );

        // Verify payment
        paymentRouter.post('/:paymentId/verify',
            authMiddleware.authorize(['superAdmin', 'tenantAdmin', 'branchManager']),
            paymentController.verifyPayment
        );

        // Reject payment
        paymentRouter.post('/:paymentId/reject',
            authMiddleware.authorize(['superAdmin', 'tenantAdmin', 'branchManager']),
            paymentController.rejectPayment
        );

        // Get payment by ID
        paymentRouter.get('/:paymentId',
            paymentController.getPaymentById
        );

        // Get payment statistics
        paymentRouter.get('/stats/summary',
            paymentController.getPaymentStats
        );

        // Get pending payments
        paymentRouter.get('/pending/list',
            paymentController.getPendingPayments
        );

        this.app.use('/api/payments', paymentRouter);
    }

    setupDebtRoutes() {
        const debtRouter = express.Router();

        // Apply authentication to all debt routes
        debtRouter.use(authMiddleware.auth); // Corrected
        debtRouter.use(authMiddleware.tenantAccess); // Corrected

        // Get all debts
        debtRouter.get('/',
            debtController.getAllDebts
        );

        // Create new debt
        debtRouter.post('/',
            ValidationRules.debtValidation(),
            debtController.createDebt
        );

        // Get debt by ID
        debtRouter.get('/:debtId',
            debtController.getDebtById
        );

        // Update debt
        debtRouter.put('/:debtId',
            authMiddleware.authorize(['superAdmin', 'tenantAdmin', 'branchManager']),
            debtController.updateDebt
        );

        // Add payment to debt
        debtRouter.post('/:debtId/payment',
            debtController.addPayment
        );

        // Send notification
        debtRouter.post('/:debtId/notification',
            authMiddleware.authorize(['superAdmin', 'tenantAdmin', 'branchManager']),
            debtController.sendNotification
        );

        // Settle debt
        debtRouter.post('/:debtId/settle',
            authMiddleware.authorize(['superAdmin', 'tenantAdmin', 'branchManager']),
            debtController.settleDebt
        );

        // Write off debt
        debtRouter.post('/:debtId/write-off',
            authMiddleware.authorize(['superAdmin', 'tenantAdmin']),
            debtController.writeOffDebt
        );

        // Get overdue debts
        debtRouter.get('/overdue/list',
            debtController.getOverdueDebts
        );

        // Get debt statistics
        debtRouter.get('/stats/summary',
            debtController.getDebtStats
        );

        this.app.use('/api/debts', debtRouter);
    }

    setupExchangeAccountRoutes() {
        const accountRouter = express.Router();

        // Apply authentication to all account routes
        accountRouter.use(authMiddleware.auth); // Corrected
        accountRouter.use(authMiddleware.tenantAccess); // Corrected

        // Get all accounts
        accountRouter.get('/',
            accountRouter.getAllAccounts
        );

        // Create new account
        accountRouter.post('/',
            ValidationRules.exchangeAccountValidation(),
            accountRouter.createAccount
        );

        // Get account by ID
        accountRouter.get('/:accountId',
            accountRouter.getAccountById
        );

        // Get account by number
        accountRouter.get('/number/:accountNumber',
            accountRouter.getAccountByNumber
        );

        // Update account
        accountRouter.put('/:accountId',
            authMiddleware.authorize(['superAdmin', 'tenantAdmin', 'branchManager']),
            accountRouter.updateAccount
        );

        // Deposit to account
        accountRouter.post('/:accountId/deposit',
            accountRouter.deposit
        );

        // Withdraw from account
        accountRouter.post('/:accountId/withdraw',
            accountRouter.withdraw
        );

        // Calculate interest
        accountRouter.post('/:accountId/calculate-interest',
            authMiddleware.authorize(['superAdmin', 'tenantAdmin', 'branchManager']),
            accountRouter.calculateInterest
        );

        // Close account
        accountRouter.post('/:accountId/close',
            authMiddleware.authorize(['superAdmin', 'tenantAdmin']),
            accountRouter.closeAccount
        );

        // Get customer accounts
        accountRouter.get('/customer/:customerId',
            accountRouter.getCustomerAccounts
        );

        // Get account statistics
        accountRouter.get('/stats/summary',
            accountRouter.getAccountStats
        );

        this.app.use('/api/accounts', accountRouter);
    }

    setupInterBranchTransferRoutes() {
        const transferRouter = express.Router();

        // Apply authentication to all transfer routes
        transferRouter.use(authMiddleware.auth); // Corrected
        transferRouter.use(authMiddleware.tenantAccess); // Corrected

        // Get all transfers
        transferRouter.get('/',
            transferRouter.getAllTransfers
        );

        // Create new transfer
        transferRouter.post('/',
            ValidationRules.interBranchTransferValidation(),
            transferRouter.createTransfer
        );

        // Get transfer by ID
        transferRouter.get('/:transferId',
            transferRouter.getTransferById
        );

        // Approve transfer
        transferRouter.post('/:transferId/approve',
            authMiddleware.authorize(['superAdmin', 'tenantAdmin', 'branchManager']),
            transferRouter.approveTransfer
        );

        // Reject transfer
        transferRouter.post('/:transferId/reject',
            authMiddleware.authorize(['superAdmin', 'tenantAdmin', 'branchManager']),
            transferRouter.rejectTransfer
        );

        // Verify transfer
        transferRouter.post('/:transferId/verify',
            transferRouter.verifyTransfer
        );

        // Complete transfer
        transferRouter.post('/:transferId/complete',
            transferRouter.completeTransfer
        );

        // Cancel transfer
        transferRouter.post('/:transferId/cancel',
            authMiddleware.authorize(['superAdmin', 'tenantAdmin', 'branchManager']),
            transferRouter.cancelTransfer
        );

        // Get pending transfers
        transferRouter.get('/pending/list',
            transferRouter.getPendingTransfers
        );

        // Get transfers by status
        transferRouter.get('/status/:status',
            transferRouter.getTransfersByStatus
        );

        // Get transfer statistics
        transferRouter.get('/stats/summary',
            transferRouter.getTransferStats
        );

        this.app.use('/api/transfers', transferRouter);
    }

    setupSocketIO() {
        this.io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);

            // Join tenant room
            socket.on('join-tenant', (tenantId) => {
                socket.join(`tenant-${tenantId}`);
                console.log(`Client ${socket.id} joined tenant ${tenantId}`);
            });

            // Handle rate updates
            socket.on('rate-update', (data) => {
                socket.broadcast.to(`tenant-${data.tenantId}`).emit('rate-updated', data);
            });

            // Handle transaction updates
            socket.on('transaction-update', (data) => {
                socket.broadcast.to(`tenant-${data.tenantId}`).emit('transaction-updated', data);
            });

            // Handle notifications
            socket.on('notification', (data) => {
                socket.broadcast.to(`tenant-${data.tenantId}`).emit('new-notification', data);
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
            });
        });
    }

    setupErrorHandling() {
        // Query enforcement cleanup
        this.app.use(QueryEnforcementMiddleware.cleanup);
        
        // Error handling middleware
        this.app.use((error, req, res, next) => {
            errorLogger(error, req, res, next);

            // Handle mongoose validation errors
            if (error.name === 'ValidationError') {
                const errors = Object.values(error.errors).map(err => err.message);
                return res.status(400).json({
                    success: false,
                    message: 'خطا در اعتبارسنجی داده‌ها',
                    errors: errors
                });
            }

            // Handle mongoose duplicate key errors
            if (error.code === 11000) {
                const field = Object.keys(error.keyValue)[0];
                return res.status(400).json({
                    success: false,
                    message: `${field} تکراری است`
                });
            }

            // Handle JWT errors
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'توکن نامعتبر است'
                });
            }

            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'توکن منقضی شده است'
                });
            }

            // Handle other errors
            const statusCode = error.statusCode || 500;
            const message = error.message || 'خطا در سرور';

            res.status(statusCode).json({
                success: false,
                message: message,
                ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
            });
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM received, shutting down gracefully');
            this.server.close(() => {
                console.log('Process terminated');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('SIGINT received, shutting down gracefully');
            this.server.close(() => {
                console.log('Process terminated');
                process.exit(0);
            });
        });
    }

    async start() {
        try {
            this.server.listen(this.port, '0.0.0.0', () => {
                console.log(`🚀 Exchange Platform Server running on port ${this.port}`);
                console.log(`📊 Health check: http://0.0.0.0:${this.port}/health`);
                console.log(`🔗 API Documentation: http://0.0.0.0:${this.port}/api`);
            });
        } catch (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
    }
}

// Start the server
const serverInstance = new ExchangePlatformServer();
serverInstance.start();

module.exports = serverInstance;
