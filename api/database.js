const mongoose = require('mongoose');

// User Schema with multi-tenant support
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 8 },
  name: { type: String, required: true, maxlength: 100 },
  role: { 
    type: String, 
    enum: ['super_admin', 'tenant_admin', 'manager', 'staff', 'customer'], 
    default: 'customer' 
  },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: String,
  lastLogin: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,
  preferences: {
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    language: { type: String, default: 'en' },
    notifications: { type: Boolean, default: true },
    currency: { type: String, default: 'USD' }
  },
  kyc: {
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    documents: [{ type: String }],
    verifiedAt: Date
  }
}, {
  timestamps: true,
  indexes: [
    { email: 1 },
    { tenant: 1, role: 1 },
    { isActive: 1, tenant: 1 }
  ]
});

// Tenant Schema
const tenantSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 100 },
  domain: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true },
  settings: {
    tradingEnabled: { type: Boolean, default: true },
    p2pEnabled: { type: Boolean, default: true },
    kycRequired: { type: Boolean, default: true },
    maxTransactionAmount: { type: Number, default: 100000 },
    supportedCurrencies: [{ type: String }],
    theme: { type: String, default: 'default' }
  },
  subscription: {
    plan: { type: String, enum: ['basic', 'premium', 'enterprise'], default: 'basic' },
    expiresAt: Date,
    maxUsers: { type: Number, default: 100 }
  }
}, {
  timestamps: true,
  indexes: [{ domain: 1 }, { isActive: 1 }]
});

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  type: { type: String, enum: ['exchange', 'deposit', 'withdrawal', 'transfer', 'trade'], required: true },
  fromCurrency: { type: String, required: true },
  toCurrency: String,
  amount: { type: Number, required: true, min: 0 },
  rate: Number,
  fee: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'cancelled', 'failed'], default: 'pending' },
  reference: String,
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true,
  indexes: [
    { userId: 1, tenant: 1 },
    { status: 1, tenant: 1 },
    { type: 1, tenant: 1 },
    { createdAt: -1 }
  ]
});

// Order Schema for Trading
const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  pair: { type: String, required: true },
  type: { type: String, enum: ['buy', 'sell'], required: true },
  orderType: { type: String, enum: ['market', 'limit', 'stop'], default: 'market' },
  amount: { type: Number, required: true, min: 0 },
  price: Number,
  filled: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'partial', 'filled', 'cancelled'], default: 'pending' },
  expiresAt: Date
}, {
  timestamps: true,
  indexes: [
    { userId: 1, tenant: 1 },
    { pair: 1, status: 1 },
    { status: 1, tenant: 1 },
    { createdAt: -1 }
  ]
});

// P2P Order Schema
const p2pOrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  currency: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  rate: { type: Number, required: true, min: 0 },
  minAmount: { type: Number, default: 0 },
  maxAmount: Number,
  paymentMethods: [{ type: String }],
  terms: String,
  status: { type: String, enum: ['active', 'matched', 'completed', 'cancelled', 'disputed'], default: 'active' },
  escrowAmount: Number,
  expiresAt: Date
}, {
  timestamps: true,
  indexes: [
    { sellerId: 1, tenant: 1 },
    { currency: 1, status: 1 },
    { status: 1, tenant: 1 },
    { createdAt: -1 }
  ]
});

// Wallet Schema
const walletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  currency: { type: String, required: true },
  balance: { type: Number, default: 0, min: 0 },
  lockedBalance: { type: Number, default: 0, min: 0 },
  address: String // For crypto wallets
}, {
  timestamps: true,
  indexes: [
    { userId: 1, currency: 1 },
    { tenant: 1, currency: 1 },
    { userId: 1, tenant: 1 }
  ]
});

// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  action: { type: String, required: true },
  resource: { type: String, required: true },
  resourceId: String,
  ip: String,
  userAgent: String,
  metadata: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true,
  indexes: [
    { userId: 1, tenant: 1 },
    { action: 1, tenant: 1 },
    { timestamp: -1 },
    { resource: 1, resourceId: 1 }
  ]
});

// Exchange Rate Schema
const exchangeRateSchema = new mongoose.Schema({
  fromCurrency: { type: String, required: true },
  toCurrency: { type: String, required: true },
  rate: { type: Number, required: true },
  source: { type: String, default: 'internal' },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true,
  indexes: [
    { fromCurrency: 1, toCurrency: 1 },
    { timestamp: -1 }
  ]
});

// Create models
const User = mongoose.model('User', userSchema);
const Tenant = mongoose.model('Tenant', tenantSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const Order = mongoose.model('Order', orderSchema);
const P2POrder = mongoose.model('P2POrder', p2pOrderSchema);
const Wallet = mongoose.model('Wallet', walletSchema);
const AuditLog = mongoose.model('AuditLog', auditLogSchema);
const ExchangeRate = mongoose.model('ExchangeRate', exchangeRateSchema);

// Database connection with retry logic
const connectDB = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferMaxEntries: 0,
        bufferCommands: false,
      };

      await mongoose.connect(process.env.MONGODB_URI, options);
      console.log(`✅ MongoDB connected successfully (attempt ${i + 1})`);
      return;
    } catch (error) {
      console.error(`❌ MongoDB connection failed (attempt ${i + 1}):`, error.message);
      if (i === retries - 1) {
        console.error('💥 Max retries reached. Exiting...');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retry
    }
  }
};

// Database initialization with default data
const initializeDB = async () => {
  try {
    // Create default tenant if none exists
    const tenantCount = await Tenant.countDocuments();
    if (tenantCount === 0) {
      const defaultTenant = new Tenant({
        name: 'Default Exchange',
        domain: 'default.exchange.com',
        settings: {
          supportedCurrencies: ['USD', 'EUR', 'BTC', 'ETH'],
        }
      });
      await defaultTenant.save();
      console.log('✅ Default tenant created');
    }

    // Create default exchange rates
    const rateCount = await ExchangeRate.countDocuments();
    if (rateCount === 0) {
      const defaultRates = [
        { fromCurrency: 'USD', toCurrency: 'EUR', rate: 0.85 },
        { fromCurrency: 'EUR', toCurrency: 'USD', rate: 1.18 },
        { fromCurrency: 'BTC', toCurrency: 'USD', rate: 43250 },
        { fromCurrency: 'ETH', toCurrency: 'USD', rate: 2640 }
      ];
      await ExchangeRate.insertMany(defaultRates);
      console.log('✅ Default exchange rates created');
    }

    console.log('🚀 Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
  }
};

module.exports = {
  connectDB,
  initializeDB,
  models: {
    User,
    Tenant,
    Transaction,
    Order,
    P2POrder,
    Wallet,
    AuditLog,
    ExchangeRate
  }
};