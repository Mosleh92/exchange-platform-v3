const mongoose = require('mongoose');
const redis = require('redis');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-purposes-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-testing-purposes-only';
process.env.SESSION_SECRET = 'test-session-secret-for-testing-purposes-only';
process.env.BCRYPT_ROUNDS = '4'; // Faster hashing for tests

let mongoServer;
let mockRedisClient;

// Mock Redis client globally
jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient)
}));

// Global test setup
beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to test database
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  
  // Create mock Redis client
  mockRedisClient = {
    connect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue(undefined)
  };
  
  console.log('Test environment setup completed');
});

// Global test teardown
afterAll(async () => {
  // Close database connections
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  
  // Stop MongoDB server
  if (mongoServer) {
    await mongoServer.stop();
  }
  
  console.log('Test environment cleanup completed');
});

// Clean up after each test
afterEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany();
  }
  
  // Clear all mocks
  jest.clearAllMocks();
});

// Global test utilities
global.testUtils = {
  // Create test user with specific role and tenant
  createTestUser: async (userData = {}) => {
    const User = require('../models/User');
    const bcrypt = require('bcryptjs');
    
    const defaultPassword = 'SecurePass@123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 4);
    
    const defaultData = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: hashedPassword,
      fullName: 'Test User',
      phone: '09123456789',
      nationalId: String(Math.floor(Math.random() * 9000000000) + 1000000000),
      role: 'customer',
      status: 'active',
      ...userData
    };
    
    return await User.create(defaultData);
  },

  // Create test tenant
  createTestTenant: async (tenantData = {}) => {
    const Tenant = require('../models/Tenant');
    const defaultData = {
      name: `Test Tenant ${Date.now()}`,
      code: `TEST${Date.now()}`,
      type: 'exchange',
      status: 'active',
      settings: {
        allowedCurrencies: ['USD', 'EUR', 'IRR'],
        maxDailyTransactionAmount: 10000,
        requiresDocumentVerification: true,
        baseCurrency: 'IRR',
        timezone: 'Asia/Tehran',
        features: {
          p2p: true,
          crypto: false,
          remittance: true
        }
      },
      ...tenantData
    };
    
    return await Tenant.create(defaultData);
  },

  // Create test branch
  createTestBranch: async (branchData = {}) => {
    const Branch = require('../models/Branch');
    const defaultData = {
      name: 'Test Branch',
      code: `BR_${Date.now()}`,
      address: 'Test Address',
      phone: '02123456789',
      status: 'active',
      ...branchData
    };
    
    return await Branch.create(defaultData);
  },

  // Create test customer
  createTestCustomer: async (customerData = {}) => {
    const Customer = require('../models/Customer');
    const defaultData = {
      firstName: 'Test',
      lastName: 'Customer',
      email: `customer_${Date.now()}@example.com`,
      phone: '09123456789',
      nationalId: String(Math.floor(Math.random() * 9000000000) + 1000000000),
      dateOfBirth: new Date('1990-01-01'),
      address: 'Test Address',
      status: 'active',
      ...customerData
    };
    
    return await Customer.create(defaultData);
  },

  // Create test transaction
  createTestTransaction: async (transactionData = {}) => {
    const Transaction = require('../models/Transaction');
    const defaultData = {
      type: 'exchange',
      sourceCurrency: 'USD',
      targetCurrency: 'IRR',
      sourceAmount: 100,
      targetAmount: 4200000,
      rate: 42000,
      status: 'pending',
      ...transactionData
    };
    
    return await Transaction.create(defaultData);
  },

  // Create test account
  createTestAccount: async (accountData = {}) => {
    const Account = require('../models/Account');
    const defaultData = {
      accountNumber: `ACC_${Date.now()}`,
      accountType: 'current',
      currency: 'IRR',
      balance: 0,
      status: 'active',
      ...accountData
    };
    
    return await Account.create(defaultData);
  },

  // Create test exchange rate
  createTestExchangeRate: async (rateData = {}) => {
    const ExchangeRate = require('../models/ExchangeRate');
    const defaultData = {
      fromCurrency: 'USD',
      toCurrency: 'IRR',
      buyRate: 42000,
      sellRate: 42500,
      isActive: true,
      validFrom: new Date(),
      validTo: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      ...rateData
    };
    
    return await ExchangeRate.create(defaultData);
  },

  // Generate JWT token for testing
  generateTestToken: (userData = {}) => {
    const jwt = require('jsonwebtoken');
    const defaultData = {
      userId: new mongoose.Types.ObjectId(),
      role: 'customer',
      ...userData
    };
    
    return jwt.sign(defaultData, process.env.JWT_SECRET, { expiresIn: '1h' });
  },

  // Create complete test scenario with tenant, users, branches
  createTestScenario: async (tenantData = {}) => {
    // Create tenant
    const tenant = await global.testUtils.createTestTenant(tenantData);

    // Create branch
    const branch = await global.testUtils.createTestBranch({
      tenantId: tenant._id
    });

    // Create users with different roles
    const superAdmin = await global.testUtils.createTestUser({
      role: 'super_admin',
      email: 'superadmin@test.com'
    });

    const tenantAdmin = await global.testUtils.createTestUser({
      tenantId: tenant._id,
      branchId: branch._id,
      role: 'tenant_admin',
      email: 'tenantadmin@test.com'
    });

    const branchAdmin = await global.testUtils.createTestUser({
      tenantId: tenant._id,
      branchId: branch._id,
      role: 'branch_admin',
      email: 'branchadmin@test.com'
    });

    const branchStaff = await global.testUtils.createTestUser({
      tenantId: tenant._id,
      branchId: branch._id,
      role: 'branch_staff',
      email: 'branchstaff@test.com'
    });

    const customer = await global.testUtils.createTestCustomer({
      tenantId: tenant._id,
      email: 'customer@test.com'
    });

    // Create exchange rates
    const usdRate = await global.testUtils.createTestExchangeRate({
      tenantId: tenant._id,
      fromCurrency: 'USD',
      toCurrency: 'IRR',
      buyRate: 42000,
      sellRate: 42500
    });

    return {
      tenant,
      branch,
      users: {
        superAdmin,
        tenantAdmin,
        branchAdmin,
        branchStaff
      },
      customer,
      exchangeRates: {
        usd: usdRate
      }
    };
  },

  // Generate tokens for all users in scenario
  generateTokensForScenario: (scenario) => {
    return {
      superAdminToken: global.testUtils.generateTestToken({
        userId: scenario.users.superAdmin._id,
        role: 'super_admin'
      }),
      tenantAdminToken: global.testUtils.generateTestToken({
        userId: scenario.users.tenantAdmin._id,
        tenantId: scenario.tenant._id,
        role: 'tenant_admin'
      }),
      branchAdminToken: global.testUtils.generateTestToken({
        userId: scenario.users.branchAdmin._id,
        tenantId: scenario.tenant._id,
        branchId: scenario.branch._id,
        role: 'branch_admin'
      }),
      branchStaffToken: global.testUtils.generateTestToken({
        userId: scenario.users.branchStaff._id,
        tenantId: scenario.tenant._id,
        branchId: scenario.branch._id,
        role: 'branch_staff'
      }),
      customerToken: global.testUtils.generateTestToken({
        userId: scenario.customer._id,
        tenantId: scenario.tenant._id,
        role: 'customer'
      })
    };
  },

  // Assert response structure
  expectSuccessResponse: (response, expectedData = {}) => {
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    
    if (Object.keys(expectedData).length > 0) {
      expect(response.body.data).toMatchObject(expectedData);
    }
  },

  expectErrorResponse: (response, expectedMessage = null) => {
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('message');
    
    if (expectedMessage) {
      expect(response.body.message).toContain(expectedMessage);
    }
  },

  // Mock external API responses
  mockExternalAPI: (url, response) => {
    const nock = require('nock');
    return nock(url).persist().get().reply(200, response);
  },

  // Wait for async operations
  wait: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms))
};

// Console override for cleaner test output
const originalConsoleError = console.error;
console.error = (...args) => {
  // Suppress known test warnings
  const message = args.join(' ');
  if (
    message.includes('DeprecationWarning') ||
    message.includes('ExperimentalWarning') ||
    message.includes('Warning: ReactDOM.render')
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Optionally exit the process in test environment
  if (process.env.NODE_ENV === 'test') {
    process.exit(1);
  }
});
