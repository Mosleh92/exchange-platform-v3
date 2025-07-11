// frontend/src/utils/apiConfig.js
// Unified API Configuration for the Exchange Platform

const API_CONFIG = {
  // Base URLs
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  WS_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:3000',
  
  // Timeouts
  REQUEST_TIMEOUT: 30000,
  UPLOAD_TIMEOUT: 60000,
  
  // Retry settings
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  
  // Rate limiting
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 100,
  
  // Cache settings
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  STALE_TIME: 2 * 60 * 1000, // 2 minutes
  
  // File upload
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  
  // WebSocket settings
  WS_RECONNECT_ATTEMPTS: 5,
  WS_RECONNECT_DELAY: 1000,
  WS_HEARTBEAT_INTERVAL: 30000,
  
  // API Endpoints
  ENDPOINTS: {
    // Authentication
    AUTH: {
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      REFRESH: '/api/auth/refresh',
      LOGOUT: '/api/auth/logout',
      ME: '/api/auth/me',
      VERIFY_2FA: '/api/auth/verify-2fa',
      SETUP_2FA: '/api/auth/setup-2fa'
    },
    
    // Transactions
    TRANSACTIONS: {
      LIST: '/api/transactions',
      CREATE: '/api/transactions',
      GET: (id) => `/api/transactions/${id}`,
      UPDATE: (id) => `/api/transactions/${id}`,
      DELETE: (id) => `/api/transactions/${id}`,
      RECEIPTS: (id) => `/api/transactions/${id}/receipts`,
      UPLOAD_RECEIPT: (id) => `/api/transactions/${id}/receipts`
    },
    
    // Users
    USERS: {
      PROFILE: '/api/users/profile',
      UPDATE_PROFILE: '/api/users/profile',
      KYC: '/api/users/kyc',
      CHANGE_PASSWORD: '/api/users/change-password'
    },
    
    // P2P
    P2P: {
      ANNOUNCEMENTS: '/api/p2p/announcements',
      CREATE_ANNOUNCEMENT: '/api/p2p/announcements',
      GET_ANNOUNCEMENT: (id) => `/api/p2p/announcements/${id}`,
      MATCH_ANNOUNCEMENT: (id) => `/api/p2p/announcements/${id}/match`,
      CHAT: (id) => `/api/p2p/chat/${id}`,
      MESSAGES: (id) => `/api/p2p/chat/${id}/messages`
    },
    
    // Reports
    REPORTS: {
      FINANCIAL: '/api/reports/financial',
      TRANSACTIONS: '/api/reports/transactions',
      ANALYTICS: '/api/reports/analytics',
      EXPORT: (type) => `/api/reports/${type}/export`
    },
    
    // Accounting
    ACCOUNTING: {
      JOURNAL_ENTRIES: '/api/accounting/journal-entries',
      TRIAL_BALANCE: '/api/accounting/trial-balance',
      REPORTS: '/api/accounting/reports',
      CREATE_ENTRY: '/api/accounting/journal-entries'
    },
    
    // Tenants
    TENANTS: {
      SETTINGS: '/api/tenant-settings',
      UPDATE_SETTINGS: '/api/tenant-settings',
      LOGO: '/api/tenant-settings/logo',
      FAVICON: '/api/tenant-settings/favicon',
      TEST_DELIVERY: '/api/tenant-settings/test-delivery'
    },
    
    // Receipts
    RECEIPTS: {
      GENERATE: '/api/receipts/generate',
      LIST: '/api/receipts',
      GET: (id) => `/api/receipts/${id}`,
      DOWNLOAD: (id) => `/api/receipts/${id}/download`,
      RESEND: (id) => `/api/receipts/${id}/resend`,
      DELETE: (id) => `/api/receipts/${id}`
    }
  },
  
  // Error codes mapping
  ERROR_CODES: {
    TOKEN_MISSING: 'TOKEN_MISSING',
    TOKEN_INVALID: 'TOKEN_INVALID',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    ACCOUNT_DEACTIVATED: 'ACCOUNT_DEACTIVATED',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
    TENANT_INACTIVE: 'TENANT_INACTIVE',
    CROSS_TENANT_ACCESS: 'CROSS_TENANT_ACCESS',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INVALID_ID: 'INVALID_ID',
    DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
    INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
    INVALID_TRANSACTION: 'INVALID_TRANSACTION',
    TRANSACTION_LIMIT_EXCEEDED: 'TRANSACTION_LIMIT_EXCEEDED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
  },
  
  // HTTP status codes
  STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  },
  
  // Request headers
  HEADERS: {
    CONTENT_TYPE: 'Content-Type',
    AUTHORIZATION: 'Authorization',
    TENANT_ID: 'x-tenant-id',
    TENANT_SUBDOMAIN: 'x-tenant-subdomain',
    REQUEST_ID: 'X-Request-ID',
    DEVICE_FINGERPRINT: 'X-Device-Fingerprint',
    TIMESTAMP: 'X-Timestamp',
    SIGNATURE: 'X-Signature'
  },
  
  // WebSocket events
  WS_EVENTS: {
    // Connection
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    CONNECT_ERROR: 'connect_error',
    
    // Authentication
    AUTHENTICATE: 'authenticate',
    AUTH_SUCCESS: 'auth_success',
    AUTH_ERROR: 'auth_error',
    
    // Real-time updates
    TRANSACTION_UPDATE: 'transaction_update',
    BALANCE_UPDATE: 'balance_update',
    P2P_UPDATE: 'p2p_update',
    NOTIFICATION: 'notification',
    
    // P2P specific
    P2P_MESSAGE: 'p2p_message',
    P2P_TYPING: 'p2p_typing',
    P2P_READ: 'p2p_read',
    
    // Trading
    PRICE_UPDATE: 'price_update',
    ORDER_UPDATE: 'order_update',
    TRADE_UPDATE: 'trade_update',
    
    // System
    SERVER_SHUTDOWN: 'server_shutdown',
    MAINTENANCE: 'maintenance'
  }
};

// Environment-specific configurations
const ENV_CONFIG = {
  development: {
    LOG_LEVEL: 'debug',
    ENABLE_MOCK_DATA: true,
    ENABLE_DEBUG_TOOLS: true,
    API_TIMEOUT: 10000
  },
  production: {
    LOG_LEVEL: 'error',
    ENABLE_MOCK_DATA: false,
    ENABLE_DEBUG_TOOLS: false,
    API_TIMEOUT: 30000
  },
  test: {
    LOG_LEVEL: 'warn',
    ENABLE_MOCK_DATA: true,
    ENABLE_DEBUG_TOOLS: false,
    API_TIMEOUT: 5000
  }
};

// Get current environment
const getCurrentEnv = () => {
  return import.meta.env.MODE || 'development';
};

// Get environment-specific config
const getEnvConfig = () => {
  const env = getCurrentEnv();
  return ENV_CONFIG[env] || ENV_CONFIG.development;
};

// Export configuration
export const config = {
  ...API_CONFIG,
  env: getEnvConfig(),
  isDevelopment: getCurrentEnv() === 'development',
  isProduction: getCurrentEnv() === 'production',
  isTest: getCurrentEnv() === 'test'
};

export default config; 