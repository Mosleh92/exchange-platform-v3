// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [5, 10, 20, 50, 100],
} as const;

// Currency Configuration
export const CURRENCIES = {
  IRR: { code: 'IRR', name: 'تومان ایران', symbol: '₺' },
  USD: { code: 'USD', name: 'دلار آمریکا', symbol: '$' },
  EUR: { code: 'EUR', name: 'یورو', symbol: '€' },
  GBP: { code: 'GBP', name: 'پوند انگلیس', symbol: '£' },
  AED: { code: 'AED', name: 'درهم امارات', symbol: 'د.إ' },
  SAR: { code: 'SAR', name: 'ریال عربستان', symbol: 'ر.س' },
  QAR: { code: 'QAR', name: 'ریال قطر', symbol: 'ر.ق' },
  KWD: { code: 'KWD', name: 'دینار کویت', symbol: 'د.ك' },
  TRY: { code: 'TRY', name: 'لیر ترکیه', symbol: '₺' },
  CNY: { code: 'CNY', name: 'یوان چین', symbol: '¥' },
  JPY: { code: 'JPY', name: 'ین ژاپن', symbol: '¥' },
  CHF: { code: 'CHF', name: 'فرانک سوئیس', symbol: 'CHF' },
} as const;

// Countries
export const COUNTRIES = {
  IR: { code: 'IR', name: 'ایران', flag: '🇮🇷' },
  AE: { code: 'AE', name: 'امارات متحده عربی', flag: '🇦🇪' },
  SA: { code: 'SA', name: 'عربستان سعودی', flag: '🇸🇦' },
  QA: { code: 'QA', name: 'قطر', flag: '🇶🇦' },
  KW: { code: 'KW', name: 'کویت', flag: '🇰🇼' },
  TR: { code: 'TR', name: 'ترکیه', flag: '🇹🇷' },
  CN: { code: 'CN', name: 'چین', flag: '🇨🇳' },
  JP: { code: 'JP', name: 'ژاپن', flag: '🇯🇵' },
  CH: { code: 'CH', name: 'سوئیس', flag: '🇨🇭' },
  US: { code: 'US', name: 'آمریکا', flag: '🇺🇸' },
  GB: { code: 'GB', name: 'انگلیس', flag: '🇬🇧' },
  DE: { code: 'DE', name: 'آلمان', flag: '🇩🇪' },
} as const;

// Payment Methods
export const PAYMENT_METHODS = {
  BANK_TRANSFER: { value: 'bank_transfer', label: 'انتقال بانکی', icon: '🏦' },
  CASH: { value: 'cash', label: 'نقدی', icon: '💵' },
  CRYPTO: { value: 'crypto', label: 'ارز دیجیتال', icon: '₿' },
  OTHER: { value: 'other', label: 'سایر', icon: '💳' },
} as const;

// Order Status
export const ORDER_STATUS = {
  ACTIVE: { value: 'active', label: 'فعال', color: 'green' },
  PENDING: { value: 'pending', label: 'در انتظار', color: 'yellow' },
  COMPLETED: { value: 'completed', label: 'تکمیل شده', color: 'blue' },
  CANCELLED: { value: 'cancelled', label: 'لغو شده', color: 'red' },
} as const;

// User Roles
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
  CUSTOMER: 'customer',
} as const;

// Transaction Types
export const TRANSACTION_TYPES = {
  BUY: 'buy',
  SELL: 'sell',
  TRANSFER: 'transfer',
  WITHDRAWAL: 'withdrawal',
  DEPOSIT: 'deposit',
} as const;

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  MAX_FILES: 5,
} as const;

// Validation Rules
export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
  PHONE_REGEX: /^(\+98|0)?9\d{9}$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  NATIONAL_ID_REGEX: /^\d{10}$/,
} as const;

// UI Configuration
export const UI_CONFIG = {
  THEME: {
    LIGHT: 'light',
    DARK: 'dark',
    SYSTEM: 'system',
  },
  LANGUAGE: {
    FA: 'fa',
    EN: 'en',
  },
  ANIMATION_DURATION: 300,
  TOAST_DURATION: 4000,
  DEBOUNCE_DELAY: 300,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'خطا در ارتباط با سرور',
  UNAUTHORIZED: 'دسترسی غیرمجاز',
  FORBIDDEN: 'دسترسی محدود شده',
  NOT_FOUND: 'موردی یافت نشد',
  VALIDATION_ERROR: 'اطلاعات وارد شده صحیح نیست',
  SERVER_ERROR: 'خطای سرور',
  TIMEOUT_ERROR: 'درخواست شما با تاخیر مواجه شد',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  ORDER_CREATED: 'سفارش با موفقیت ایجاد شد',
  ORDER_UPDATED: 'سفارش با موفقیت بروزرسانی شد',
  ORDER_DELETED: 'سفارش با موفقیت حذف شد',
  PAYMENT_SUCCESS: 'پرداخت با موفقیت انجام شد',
  PROFILE_UPDATED: 'پروفایل با موفقیت بروزرسانی شد',
  PASSWORD_CHANGED: 'رمز عبور با موفقیت تغییر یافت',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  TENANT_DATA: 'tenant_data',
  THEME: 'theme',
  LANGUAGE: 'language',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
} as const;

// WebSocket Events
export const WS_EVENTS = {
  ORDER_CREATED: 'order_created',
  ORDER_UPDATED: 'order_updated',
  ORDER_DELETED: 'order_deleted',
  MESSAGE_RECEIVED: 'message_received',
  BALANCE_UPDATED: 'balance_updated',
  RATE_UPDATED: 'rate_updated',
} as const;

// Chart Colors
export const CHART_COLORS = {
  PRIMARY: '#3b82f6',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  DANGER: '#ef4444',
  INFO: '#06b6d4',
  SECONDARY: '#6b7280',
} as const;

// Date Formats
export const DATE_FORMATS = {
  SHORT: 'yyyy/MM/dd',
  LONG: 'yyyy/MM/dd HH:mm',
  TIME: 'HH:mm',
  RELATIVE: 'relative',
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  P2P_TRADING: true,
  CRYPTO_TRADING: false,
  ADVANCED_CHARTS: true,
  REAL_TIME_NOTIFICATIONS: true,
  MULTI_LANGUAGE: true,
  DARK_MODE: true,
} as const; 