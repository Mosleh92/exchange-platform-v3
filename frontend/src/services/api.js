import axios from 'axios';
import { toast } from 'react-hot-toast';

// Unified API configuration
const API_CONFIG = {
const API_BASE_URL = process.env.VITE_API_URL || '/api';
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

// Create axios instance with enhanced configuration
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Enhanced request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const tenant = localStorage.getItem('tenant');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (tenant) {
      config.headers['x-tenant-subdomain'] = tenant;
    }

    // Add request ID for tracking
    config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add timestamp for cache busting
    if (config.method === 'get') {
      config.params = { ...config.params, _t: Date.now() };
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Enhanced response interceptor with retry logic
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (import.meta.env.DEV) {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, response.status);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_CONFIG.BASE_URL}/api/auth/refresh`, {
            refreshToken
          });
          
          const { token } = response.data;
          localStorage.setItem('token', token);
          
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle rate limiting
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 60;
      toast.error(`تعداد درخواست‌ها زیاد است. لطفاً ${retryAfter} ثانیه صبر کنید.`);
      return Promise.reject(error);
    }

    // Handle server errors
    if (error.response?.status >= 500) {
      toast.error('خطای سرور. لطفاً دوباره تلاش کنید.');
    }

    // Handle network errors
    if (!error.response) {
      toast.error('خطای شبکه. لطفاً اتصال اینترنت خود را بررسی کنید.');
    }

    // Log errors in development
    if (import.meta.env.DEV) {
      console.error(`❌ ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`, error.response?.status, error.response?.data);
    }

    return Promise.reject(error);
  }
);

// Enhanced API methods with retry logic
const apiWithRetry = async (config, retries = API_CONFIG.RETRY_ATTEMPTS) => {
  try {
    return await api(config);
  } catch (error) {
    if (retries > 0 && !error.response) {
      await new Promise(resolve => setTimeout(resolve, API_CONFIG.RETRY_DELAY));
      return apiWithRetry(config, retries - 1);
    }
    throw error;
  }
};

export const authAPI = {
  login: (data) => axios.post(`${API_BASE_URL}/auth/login`, data),
  register: (data) => axios.post(`${API_BASE_URL}/auth/register`, data),
};
export const apiClient = {
  get: (url, config = {}) => apiWithRetry({ ...config, method: 'get', url }),
  post: (url, data, config = {}) => apiWithRetry({ ...config, method: 'post', url, data }),
  put: (url, data, config = {}) => apiWithRetry({ ...config, method: 'put', url, data }),
  patch: (url, data, config = {}) => apiWithRetry({ ...config, method: 'patch', url, data }),
  delete: (url, config = {}) => apiWithRetry({ ...config, method: 'delete', url }),
  upload: (url, formData, config = {}) => apiWithRetry({
    ...config,
    method: 'post',
    url,
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

export default api;
