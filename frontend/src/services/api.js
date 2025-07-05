import axios from 'axios'
import { toast } from 'react-hot-toast'

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token to headers
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Add tenant ID to headers if available
    const tenantId = localStorage.getItem('current_tenant_id')
    if (tenantId) {
      config.headers['X-Tenant-ID'] = tenantId
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      // Try to refresh token
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const refreshResponse = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            { refreshToken }
          )

          if (refreshResponse.data.success) {
            const { token } = refreshResponse.data
            localStorage.setItem('auth_token', token)
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`
            originalRequest.headers['Authorization'] = `Bearer ${token}`
            
            return api(originalRequest)
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError)
        }
      }

      // If refresh failed, logout user
      localStorage.removeItem('auth_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('current_tenant_id')
      
      // Redirect to login
      window.location.href = '/login'
      return Promise.reject(error)
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      toast.error('دسترسی غیرمجاز')
      return Promise.reject(error)
    }

    // Handle 404 Not Found
    if (error.response?.status === 404) {
      toast.error('منبع مورد نظر یافت نشد')
      return Promise.reject(error)
    }

    // Handle 422 Validation Error
    if (error.response?.status === 422) {
      const errors = error.response.data.errors
      if (errors && typeof errors === 'object') {
        Object.values(errors).forEach(error => {
          toast.error(error[0] || 'خطا در اعتبارسنجی داده‌ها')
        })
      } else {
        toast.error('خطا در اعتبارسنجی داده‌ها')
      }
      return Promise.reject(error)
    }

    // Handle 500 Server Error
    if (error.response?.status >= 500) {
      toast.error('خطا در سرور. لطفاً دوباره تلاش کنید')
      return Promise.reject(error)
    }

    // Handle network errors
    if (!error.response) {
      toast.error('خطا در ارتباط با سرور')
      return Promise.reject(error)
    }

    // Handle other errors
    const errorMessage = error.response?.data?.message || error.message || 'خطا در ارتباط با سرور'
    toast.error(errorMessage)
    return Promise.reject(error)
  }
)

// API endpoints
export const endpoints = {
  // Authentication
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
    validate: '/api/auth/validate',
    profile: '/api/auth/profile',
    changePassword: '/api/auth/change-password',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword: '/api/auth/reset-password',
  },

  // Tenants
  tenants: {
    list: '/api/tenants',
    create: '/api/tenants',
    get: (id) => `/api/tenants/${id}`,
    update: (id) => `/api/tenants/${id}`,
    delete: (id) => `/api/tenants/${id}`,
    current: '/api/tenants/current',
    branches: (id) => `/api/tenants/${id}/branches`,
    createBranch: (id) => `/api/tenants/${id}/branches`,
    updateBranch: (tenantId, branchId) => `/api/tenants/${tenantId}/branches/${branchId}`,
    deleteBranch: (tenantId, branchId) => `/api/tenants/${tenantId}/branches/${branchId}`,
  },

  // Users
  users: {
    list: '/api/users',
    create: '/api/users',
    get: (id) => `/api/users/${id}`,
    update: (id) => `/api/users/${id}`,
    delete: (id) => `/api/users/${id}`,
    permissions: (id) => `/api/users/${id}/permissions`,
  },

  // Transactions
  transactions: {
    list: '/api/transactions',
    create: '/api/transactions',
    get: (id) => `/api/transactions/${id}`,
    update: (id) => `/api/transactions/${id}`,
    delete: (id) => `/api/transactions/${id}`,
    calculate: '/api/transactions/calculate',
    history: '/api/transactions/history',
  },

  // Exchange Rates
  rates: {
    list: '/api/rates',
    create: '/api/rates',
    get: (id) => `/api/rates/${id}`,
    update: (id) => `/api/rates/${id}`,
    delete: (id) => `/api/rates/${id}`,
    live: '/api/rates/live',
    updateFromMarket: '/api/rates/update-from-market',
  },

  // Remittances
  remittances: {
    list: '/api/remittances',
    create: '/api/remittances',
    get: (id) => `/api/remittances/${id}`,
    update: (id) => `/api/remittances/${id}`,
    delete: (id) => `/api/remittances/${id}`,
    approve: (id) => `/api/remittances/${id}/approve`,
    reject: (id) => `/api/remittances/${id}/reject`,
  },

  // Customers
  customers: {
    list: '/api/customers',
    create: '/api/customers',
    get: (id) => `/api/customers/${id}`,
    update: (id) => `/api/customers/${id}`,
    delete: (id) => `/api/customers/${id}`,
    accounts: (id) => `/api/customers/${id}/accounts`,
    transactions: (id) => `/api/customers/${id}/transactions`,
  },

  // Reports
  reports: {
    financial: '/api/reports/financial',
    transactions: '/api/reports/transactions',
    customers: '/api/reports/customers',
    remittances: '/api/reports/remittances',
    export: '/api/reports/export',
  },

  // P2P Marketplace
  p2p: {
    orders: '/api/p2p/orders',
    createOrder: '/api/p2p/orders',
    getOrder: (id) => `/api/p2p/orders/${id}`,
    updateOrder: (id) => `/api/p2p/orders/${id}`,
    deleteOrder: (id) => `/api/p2p/orders/${id}`,
    matches: '/api/p2p/matches',
  },

  // Settings
  settings: {
    get: '/api/settings',
    update: '/api/settings',
    currencies: '/api/settings/currencies',
    notifications: '/api/settings/notifications',
  },
}

// Helper functions
export const apiHelpers = {
  // Format currency
  formatCurrency: (amount, currency = 'AED') => {
    return new Intl.NumberFormat('fa-IR', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  },

  // Format date
  formatDate: (date, locale = 'fa-IR') => {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  },

  // Format number
  formatNumber: (number, locale = 'fa-IR') => {
    return new Intl.NumberFormat(locale).format(number)
  },

  // Validate email
  validateEmail: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  },

  // Validate phone
  validatePhone: (phone) => {
    const re = /^[\+]?[1-9][\d]{0,15}$/
    return re.test(phone)
  },

  // Generate random ID
  generateId: () => {
    return Math.random().toString(36).substr(2, 9)
  },

  // Debounce function
  debounce: (func, wait) => {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  },

  // Throttle function
  throttle: (func, limit) => {
    let inThrottle
    return function() {
      const args = arguments
      const context = this
      if (!inThrottle) {
        func.apply(context, args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  },
}

export default api 