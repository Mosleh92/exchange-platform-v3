const mongoose = require('mongoose');
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
mockRedisClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  quit: jest.fn().mockResolvedValue(undefined)
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient)
}));

// Setup function that can be called in tests
global.setupTestDatabase = async () => {
  if (!mongoServer) {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    }
  }
  return mongoServer;
};

// Teardown function that can be called in tests  
global.teardownTestDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }
  
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
};

// Global test timeout
jest.setTimeout(30000);

console.log('Test setup configuration loaded');
  
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
    const defaultData = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'Test@123456',
      fullName: 'Test User',
      phone: '09123456789',
      nationalId: '1234567890',
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
        requiresDocumentVerification: true
      },
      ...tenantData
    };
    
    return await Tenant.create(defaultData);
  },

  // Create test transaction
  createTestTransaction: async (transactionData = {}) => {
    const Transaction = require('../models/Transaction');
    const defaultData = {
      type: 'exchange',
      amount: 100,
      sourceCurrency: 'USD',
      targetCurrency: 'EUR',
      exchangeRate: 0.85,
      status: 'pending',
      ...transactionData
    };
    
    return await Transaction.create(defaultData);
  },

  // Generate JWT token for testing
  generateTestToken: (userData = {}) => {
    const jwt = require('jsonwebtoken');
    const defaultData = {
      userId: new mongoose.Types.ObjectId(),
      role: 'customer',
      tenantId: new mongoose.Types.ObjectId(),
      ...userData
    };
    
    return jwt.sign(defaultData, process.env.JWT_SECRET, { expiresIn: '1h' });
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
