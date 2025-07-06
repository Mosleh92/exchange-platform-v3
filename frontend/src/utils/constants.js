// API Configuration
export const API_CONFIG = {
    BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:5000/api' 
        : 'https://your-backend-railway.up.railway.app/api',
    SOCKET_URL: window.location.hostname === 'localhost'
        ? 'http://localhost:5000'
        : 'https://your-backend-railway.up.railway.app',
    TIMEOUT: 30000,
    RETRY_ATTEMPTS: 3
};

// User Roles
const USER_ROLES = {
    SUPER_ADMIN: 'super_admin',
    TENANT_ADMIN: 'tenant_admin',
    MANAGER: 'manager',
    EMPLOYEE: 'employee',
    ACCOUNTANT: 'accountant',
    CUSTOMER: 'customer'
};

// Transaction Types
const TRANSACTION_TYPES = {
    BUY: 'buy',
    SELL: 'sell',
    EXCHANGE: 'exchange',
    TRANSFER: 'transfer',
    DEPOSIT: 'deposit',
    WITHDRAWAL: 'withdrawal'
};

// Transaction Status
const TRANSACTION_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    FAILED: 'failed',
    ON_HOLD: 'on_hold'
};

// Currencies
const CURRENCIES = {
    FIAT: {
        USD: { code: 'USD', name: 'دلار آمریکا', symbol: '$', flag: '🇺🇸' },
        EUR: { code: 'EUR', name: 'یورو', symbol: '€', flag: '🇪🇺' },
        GBP: { code: 'GBP', name: 'پوند انگلیس', symbol: '£', flag: '🇬🇧' },
        AED: { code: 'AED', name: 'درهم امارات', symbol: 'د.إ', flag: '🇦🇪' },
        SAR: { code: 'SAR', name: 'ریال عربستان', symbol: 'ر.س', flag: '🇸🇦' },
        TRY: { code: 'TRY', name: 'لیر ترکیه', symbol: '₺', flag: '🇹🇷' },
        IRR: { code: 'IRR', name: 'ریال ایران', symbol: '﷼', flag: '🇮🇷' }
    },
    CRYPTO: {
        BTC: { code: 'BTC', name: 'بیت‌کوین', symbol: '₿', icon: '🟡' },
        ETH: { code: 'ETH', name: 'اتریوم', symbol: 'Ξ', icon: '⚪' },
        USDT: { code: 'USDT', name: 'تتر', symbol: '₮', icon: '🟢' },
        BNB: { code: 'BNB', name: 'بایننس کوین', symbol: 'BNB', icon: '🟨' },
        XRP: { code: 'XRP', name: 'ریپل', symbol: 'XRP', icon: '🔵' },
        ADA: { code: 'ADA', name: 'کاردانو', symbol: 'ADA', icon: '🔴' }
    }
};

// KYC Status
const KYC_STATUS = {
    PENDING: 'pending',
    BASIC: 'basic',
    VERIFIED: 'verified',
    ENHANCED: 'enhanced',
    REJECTED: 'rejected'
};

// Customer Types
const CUSTOMER_TYPES = {
    INDIVIDUAL: 'individual',
    BUSINESS: 'business',
    VIP: 'vip',
    GOVERNMENT: 'government'
};

// Persian Calendar Months
const PERSIAN_MONTHS = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

// Status Colors
const STATUS_COLORS = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-gray-100 text-gray-800',
    processing: 'bg-indigo-100 text-indigo-800',
    failed: 'bg-red-100 text-red-800',
    verified: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
};

// Chart Colors (Persian-friendly)
const CHART_COLORS = {
    primary: '#3b82f6',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#06b6d4',
    purple: '#8b5cf6',
    pink: '#ec4899',
    indigo: '#6366f1'
};

// Default Exchange Rates (for demo)
const DEFAULT_RATES = {
    USD_IRR: { buy: 42000, sell: 42500 },
    EUR_IRR: { buy: 45000, sell: 45600 },
    GBP_IRR: { buy: 52000, sell: 52700 },
    AED_IRR: { buy: 11450, sell: 11580 },
    BTC_USD: { buy: 43000, sell: 43500 },
    ETH_USD: { buy: 2600, sell: 2650 },
    USDT_USD: { buy: 0.998, sell: 1.002 }
};

// Validation Rules
const VALIDATION_RULES = {
    password: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false
    },
    phone: {
        iranMobile: /^09\d{9}$/,
        international: /^\+?[1-9]\d{1,14}$/
    },
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    nationalId: /^\d{10}$/
};

// File Upload Limits
const UPLOAD_LIMITS = {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    maxFiles: 10
};

// Notification Types
const NOTIFICATION_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info'
};

// Local Storage Keys
export const STORAGE_KEYS = {
    AUTH_TOKEN: 'auth_token',
    TENANT_ID: 'tenant_id',
    USER_PREFERENCES: 'user_preferences',
    THEME: 'theme',
    LANGUAGE: 'language',
    LAST_LOGIN: 'last_login'
};

// Export for global use
window.API_CONFIG = API_CONFIG;
window.USER_ROLES = USER_ROLES;
window.TRANSACTION_TYPES = TRANSACTION_TYPES;
window.TRANSACTION_STATUS = TRANSACTION_STATUS;
window.CURRENCIES = CURRENCIES;
window.KYC_STATUS = KYC_STATUS;
window.CUSTOMER_TYPES = CUSTOMER_TYPES;
window.PERSIAN_MONTHS = PERSIAN_MONTHS;
window.STATUS_COLORS = STATUS_COLORS;
window.CHART_COLORS = CHART_COLORS;
window.DEFAULT_RATES = DEFAULT_RATES;
window.VALIDATION_RULES = VALIDATION_RULES;
window.UPLOAD_LIMITS = UPLOAD_LIMITS;
window.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
window.STORAGE_KEYS = STORAGE_KEYS;