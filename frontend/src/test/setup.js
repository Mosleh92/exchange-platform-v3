import { expect, afterEach, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import matchers from '@testing-library/jest-dom/matchers';
import { server } from './mocks/server';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Mock environment variables
Object.defineProperty(window, 'ENV', {
  value: {
    VITE_API_BASE_URL: 'http://localhost:5000',
    VITE_SOCKET_URL: 'http://localhost:5000',
    VITE_APP_NAME: 'پلتفرم صرافی تست'
  },
  writable: true
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock localStorage
const localStorageMock = {
  getItem: (key) => {
    return localStorageMock[key] || null;
  },
  setItem: (key, value) => {
    localStorageMock[key] = value.toString();
  },
  removeItem: (key) => {
    delete localStorageMock[key];
  },
  clear: () => {
    Object.keys(localStorageMock).forEach(key => {
      if (key !== 'getItem' && key !== 'setItem' && key !== 'removeItem' && key !== 'clear') {
        delete localStorageMock[key];
      }
    });
  },
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: (key) => {
    return sessionStorageMock[key] || null;
  },
  setItem: (key, value) => {
    sessionStorageMock[key] = value.toString();
  },
  removeItem: (key) => {
    delete sessionStorageMock[key];
  },
  clear: () => {
    Object.keys(sessionStorageMock).forEach(key => {
      if (key !== 'getItem' && key !== 'setItem' && key !== 'removeItem' && key !== 'clear') {
        delete sessionStorageMock[key];
      }
    });
  },
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock fetch for tests that don't use MSW
global.fetch = vi.fn();

// Start MSW server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

// Clean up after each test
afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorageMock.clear();
  sessionStorageMock.clear();
  vi.clearAllMocks();
});

// Stop MSW server after all tests
afterAll(() => {
  server.close();
});

// Suppress console errors in tests unless they're relevant
const originalError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render') ||
     args[0].includes('Warning: React.createFactory') ||
     args[0].includes('act(...)'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};

// Global test utilities
global.testUtils = {
  // Create mock user
  createMockUser: (overrides = {}) => ({
    id: '64f1a2b3c4d5e6f7a8b9c0d1',
    username: 'testuser',
    email: 'test@example.com',
    fullName: 'Test User',
    role: 'customer',
    tenantId: '64f1a2b3c4d5e6f7a8b9c0d2',
    status: 'active',
    ...overrides
  }),
  
  // Create mock tenant
  createMockTenant: (overrides = {}) => ({
    id: '64f1a2b3c4d5e6f7a8b9c0d2',
    name: 'Test Tenant',
    code: 'TEST',
    type: 'exchange',
    status: 'active',
    settings: {
      allowedCurrencies: ['USD', 'EUR', 'IRR'],
      maxDailyTransactionAmount: 10000
    },
    ...overrides
  }),
  
  // Create mock transaction
  createMockTransaction: (overrides = {}) => ({
    id: '64f1a2b3c4d5e6f7a8b9c0d3',
    type: 'exchange',
    amount: 1000,
    sourceCurrency: 'USD',
    targetCurrency: 'EUR',
    exchangeRate: 0.85,
    status: 'pending',
    tenantId: '64f1a2b3c4d5e6f7a8b9c0d2',
    customerId: '64f1a2b3c4d5e6f7a8b9c0d1',
    createdAt: new Date().toISOString(),
    ...overrides
  }),
  
  // Wait for async operations
  waitFor: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Create authenticated user context
  createAuthContext: (user = null) => ({
    user: user || global.testUtils.createMockUser(),
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: true,
    loading: false,
    updateUser: vi.fn()
  })
};
