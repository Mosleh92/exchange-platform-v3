const mongoose = require('mongoose');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-purposes-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-testing-purposes-only';
process.env.SESSION_SECRET = 'test-session-secret-for-testing-purposes-only';
process.env.BCRYPT_ROUNDS = '4'; // Faster hashing for tests

// Mock MongoDB connection for testing
let mockConnection;

// Mock Redis client
const mockRedisClient = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  flushall: jest.fn(),
  on: jest.fn(),
  isReady: true
};

// Mock Redis module
jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient)
}));

// Mock mongoose connection for tests that don't need real DB
jest.mock('mongoose', () => ({
  connect: jest.fn(() => Promise.resolve()),
  disconnect: jest.fn(() => Promise.resolve()),
  connection: {
    readyState: 1,
    close: jest.fn(() => Promise.resolve())
  },
  Schema: jest.requireActual('mongoose').Schema,
  model: jest.fn(),
  Types: jest.requireActual('mongoose').Types
}));

// Global test setup
beforeAll(async () => {
  // Mock successful connection
  mockConnection = {
    readyState: 1,
    close: jest.fn()
  };
  
  // Setup mock Redis client
  mockRedisClient.connect.mockResolvedValue(undefined);
  mockRedisClient.get.mockResolvedValue(null);
  mockRedisClient.set.mockResolvedValue('OK');
  mockRedisClient.del.mockResolvedValue(1);
  mockRedisClient.exists.mockResolvedValue(0);
  mockRedisClient.expire.mockResolvedValue(1);
});

// Global test cleanup
afterAll(async () => {
  if (mockConnection) {
    await mockConnection.close();
  }
  await mockRedisClient.disconnect();
});

// Helper functions for tests
global.createMockUser = () => ({
  _id: new mongoose.Types.ObjectId(),
  email: 'test@example.com',
  username: 'testuser',
  password: '$2b$04$hashed.password.here',
  role: 'user',
  tenantId: new mongoose.Types.ObjectId(),
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

global.createMockTenant = () => ({
  _id: new mongoose.Types.ObjectId(),
  name: 'Test Tenant',
  domain: 'test.example.com',
  isActive: true,
  settings: {
    currency: 'USD',
    timezone: 'UTC'
  },
  createdAt: new Date(),
  updatedAt: new Date()
});

global.createMockTransaction = () => ({
  _id: new mongoose.Types.ObjectId(),
  userId: new mongoose.Types.ObjectId(),
  tenantId: new mongoose.Types.ObjectId(),
  type: 'exchange',
  amount: 1000,
  currency: 'USD',
  status: 'pending',
  createdAt: new Date(),
  updatedAt: new Date()
});

// Suppress console messages during testing
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  // Only show actual errors, not MongoDB connection messages
  const message = args[0];
  if (typeof message === 'string' && 
      (message.includes('fastdl.mongodb.org') || 
       message.includes('MongoMemoryServer'))) {
    return;
  }
  originalConsoleError.apply(console, args);
};

console.warn = (...args) => {
  // Suppress MongoDB warnings
  const message = args[0];
  if (typeof message === 'string' && 
      (message.includes('MongoMemoryServer') ||
       message.includes('MongoDB'))) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

module.exports = {
  mockRedisClient,
  mockConnection
};