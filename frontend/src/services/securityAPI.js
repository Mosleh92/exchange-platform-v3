// frontend/src/services/securityAPI.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance with default config
const apiClient = axios.create({
    baseURL: `${API_BASE_URL}/api/security`,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Handle responses and errors
apiClient.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('authToken');
            window.location.href = '/login';
        }
        
        if (error.response?.status === 429) {
            // Rate limit exceeded
            throw new Error('تعداد درخواست‌ها از حد مجاز تجاوز کرده است');
        }

        const message = error.response?.data?.message || 'خطای شبکه رخ داد';
        throw new Error(message);
    }
);

class SecurityAPI {
    // Dashboard
    async getSecurityDashboard() {
        return apiClient.get('/dashboard');
    }

    // Two-Factor Authentication
    async generate2FASecret() {
        return apiClient.post('/2fa/generate-secret');
    }

    async verifyAndEnable2FA(token) {
        return apiClient.post('/2fa/verify-enable', { token });
    }

    async verify2FA(token) {
        return apiClient.post('/2fa/verify', { token });
    }

    async disable2FA(token) {
        return apiClient.post('/2fa/disable', { token });
    }

    async get2FAStatus() {
        return apiClient.get('/2fa/status');
    }

    async regenerateBackupCodes(token) {
        return apiClient.post('/2fa/regenerate-backup-codes', { token });
    }

    // IP Whitelist
    async getIPWhitelist() {
        return apiClient.get('/ip-whitelist');
    }

    async addIPToWhitelist(ip, description = '') {
        return apiClient.post('/ip-whitelist', { ip, description });
    }

    async removeIPFromWhitelist(ip) {
        return apiClient.delete(`/ip-whitelist/${encodeURIComponent(ip)}`);
    }

    // API Keys
    async getAPIKeys() {
        return apiClient.get('/api-keys');
    }

    async generateAPIKey(name, permissions) {
        return apiClient.post('/api-keys', { name, permissions });
    }

    async deleteAPIKey(keyId) {
        return apiClient.delete(`/api-keys/${keyId}`);
    }

    // Digital Signature
    async getDigitalSignatureStatus() {
        return apiClient.get('/digital-signature/status');
    }

    async generateSignatureKeys() {
        return apiClient.post('/digital-signature/generate-keys');
    }

    async revokeSignatureKeys(reason = '') {
        return apiClient.post('/digital-signature/revoke', { reason });
    }

    // Security Events & Audit Logs
    async getSecurityEvents(days = 30, page = 1, limit = 50) {
        return apiClient.get('/events', {
            params: { days, page, limit }
        });
    }

    async getAuditLogs(filters = {}, page = 1, limit = 50) {
        return apiClient.get('/audit-logs', {
            params: { ...filters, page, limit }
        });
    }

    async generateSecurityReport(startDate, endDate, format = 'json') {
        const response = await apiClient.get('/reports/security', {
            params: { startDate, endDate, format },
            responseType: format === 'csv' ? 'blob' : 'json'
        });

        if (format === 'csv') {
            // Create download link for CSV
            const blob = new Blob([response], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `security-report-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            return { success: true };
        }

        return response;
    }

    // Device Management
    async getTrustedDevices() {
        return apiClient.get('/devices');
    }

    async removeTrustedDevice(deviceId) {
        return apiClient.delete(`/devices/${deviceId}`);
    }

    // Security Settings
    async updateSecuritySettings(settings) {
        return apiClient.put('/settings', settings);
    }

    // Emergency Actions
    async emergencyLockAccount() {
        return apiClient.post('/emergency/lock-account');
    }

    async revokeAllSessions() {
        return apiClient.post('/emergency/revoke-sessions');
    }

    // Security Analysis
    async getSecurityRecommendations() {
        return apiClient.get('/recommendations');
    }

    async testSecurityFeatures() {
        return apiClient.get('/test');
    }

    // Bulk Operations (Admin)
    async bulkSecurityOperations(operation, userIds, parameters = {}) {
        return apiClient.post('/bulk-operations', {
            operation,
            userIds,
            parameters
        });
    }

    // System Health
    async getSecurityHealth() {
        return apiClient.get('/health');
    }
}

// Helper functions for client-side security
class SecurityUtils {
    // Generate client-side signature for API requests
    static async signRequest(method, url, body, timestamp, apiSecret) {
        const message = `${method}${url}${JSON.stringify(body || {})}${timestamp}`;
        
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(apiSecret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        
        const signature = await crypto.subtle.sign(
            'HMAC',
            key,
            encoder.encode(message)
        );
        
        return Array.from(new Uint8Array(signature))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    // Validate 2FA token format
    static validate2FAToken(token) {
        if (!token) return false;
        
        // Remove spaces and non-alphanumeric characters
        const cleanToken = token.replace(/[^a-zA-Z0-9]/g, '');
        
        // Check length (6 digits for TOTP, 8 chars for backup codes)
        return cleanToken.length === 6 || cleanToken.length === 8;
    }

    // Validate IP address format
    static validateIPAddress(ip) {
        // IPv4 regex
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        
        // IPv6 regex (simplified)
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        
        // CIDR notation
        if (ip.includes('/')) {
            const [address, prefix] = ip.split('/');
            const prefixNum = parseInt(prefix);
            
            if (ipv4Regex.test(address)) {
                return prefixNum >= 0 && prefixNum <= 32;
            }
            
            if (ipv6Regex.test(address)) {
                return prefixNum >= 0 && prefixNum <= 128;
            }
            
            return false;
        }
        
        return ipv4Regex.test(ip) || ipv6Regex.test(ip);
    }

    // Generate secure random password
    static generateSecurePassword(length = 16) {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            password += charset[randomIndex];
        }
        
        return password;
    }

    // Check password strength
    static checkPasswordStrength(password) {
        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            numbers: /\d/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };
        
        const score = Object.values(checks).filter(Boolean).length;
        
        let strength = 'ضعیف';
        if (score >= 4) strength = 'قوی';
        else if (score >= 3) strength = 'متوسط';
        
        return {
            score,
            strength,
            checks,
            suggestions: this.getPasswordSuggestions(checks)
        };
    }

    static getPasswordSuggestions(checks) {
        const suggestions = [];
        
        if (!checks.length) suggestions.push('حداقل 8 کاراکتر استفاده کنید');
        if (!checks.uppercase) suggestions.push('حداقل یک حرف بزرگ اضافه کنید');
        if (!checks.lowercase) suggestions.push('حداقل یک حرف کوچک اضافه کنید');
        if (!checks.numbers) suggestions.push('حداقل یک عدد اضافه کنید');
        if (!checks.special) suggestions.push('حداقل یک کاراکتر خاص اضافه کنید');
        
        return suggestions;
    }

    // Device fingerprinting
    static async generateDeviceFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device fingerprint', 2, 2);
        
        const fingerprint = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenResolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            canvas: canvas.toDataURL(),
            plugins: Array.from(navigator.plugins).map(p => p.name).join(','),
            webgl: this.getWebGLFingerprint()
        };
        
        // Generate hash
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(fingerprint));
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        return {
            fingerprint,
            hash: hashHex
        };
    }

    static getWebGLFingerprint() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl) return 'not-supported';
            
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                return {
                    vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
                    renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
                };
            }
            
            return {
                vendor: gl.getParameter(gl.VENDOR),
                renderer: gl.getParameter(gl.RENDERER)
            };
        } catch (e) {
            return 'error';
        }
    }

    // Secure local storage with encryption
    static async encryptAndStore(key, data, password) {
        try {
            const encoder = new TextEncoder();
            const salt = crypto.getRandomValues(new Uint8Array(16));
            
            // Derive key from password
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                encoder.encode(password),
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey']
            );
            
            const cryptoKey = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );
            
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encodedData = encoder.encode(JSON.stringify(data));
            
            const encryptedData = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                cryptoKey,
                encodedData
            );
            
            const result = {
                salt: Array.from(salt),
                iv: Array.from(iv),
                data: Array.from(new Uint8Array(encryptedData))
            };
            
            localStorage.setItem(key, JSON.stringify(result));
            return true;
        } catch (error) {
            console.error('خطا در رمزگذاری:', error);
            return false;
        }
    }

    static async decryptAndRetrieve(key, password) {
        try {
            const stored = localStorage.getItem(key);
            if (!stored) return null;
            
            const { salt, iv, data } = JSON.parse(stored);
            const encoder = new TextEncoder();
            const decoder = new TextDecoder();
            
            // Derive key from password
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                encoder.encode(password),
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey']
            );
            
            const cryptoKey = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: new Uint8Array(salt),
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );
            
            const decryptedData = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: new Uint8Array(iv) },
                cryptoKey,
                new Uint8Array(data)
            );
            
            return JSON.parse(decoder.decode(decryptedData));
        } catch (error) {
            console.error('خطا در رمزگشایی:', error);
            return null;
        }
    }

    // Session security
    static startSecureSession() {
        // Store session start time
        sessionStorage.setItem('sessionStart', Date.now().toString());
        
        // Monitor for tab visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                sessionStorage.setItem('lastHidden', Date.now().toString());
            } else {
                const lastHidden = sessionStorage.getItem('lastHidden');
                if (lastHidden) {
                    const hiddenDuration = Date.now() - parseInt(lastHidden);
                    // If hidden for more than 30 minutes, require re-authentication
                    if (hiddenDuration > 30 * 60 * 1000) {
                        this.clearSession();
                        window.location.reload();
                    }
                }
            }
        });
        
        // Auto-logout after inactivity
        let lastActivity = Date.now();
        const maxInactivity = 30 * 60 * 1000; // 30 minutes
        
        const resetTimer = () => {
            lastActivity = Date.now();
        };
        
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetTimer, true);
        });
        
        setInterval(() => {
            if (Date.now() - lastActivity > maxInactivity) {
                this.clearSession();
                alert('جلسه شما به دلیل عدم فعالیت منقضی شد');
                window.location.href = '/login';
            }
        }, 60000); // Check every minute
    }

    static clearSession() {
        localStorage.removeItem('authToken');
        sessionStorage.clear();
    }

    // Content Security Policy helpers
    static setupCSP() {
        // Add nonce to script tags
        const scripts = document.querySelectorAll('script[nonce]');
        scripts.forEach(script => {
            script.nonce = this.generateNonce();
        });
    }

    static generateNonce() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode.apply(null, array));
    }

    // Input sanitization
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        let sanitized = input.trim();
        let previous;
        do {
            previous = sanitized;
            sanitized = sanitized
                .replace(/[<>]/g, '') // Remove HTML tags
                .replace(/javascript:/gi, '') // Remove javascript: URLs
                .replace(/on\w+=/gi, ''); // Remove event handlers
        } while (sanitized !== previous);
        
        return sanitized;
    }

    // URL validation
    static isValidURL(string) {
        try {
            const url = new URL(string);
            return ['http:', 'https:'].includes(url.protocol);
        } catch {
            return false;
        }
    }

    // Rate limiting helper
    static createRateLimiter(maxRequests, windowMs) {
        const requests = [];
        
        return function() {
            const now = Date.now();
            
            // Remove old requests outside the window
            while (requests.length > 0 && requests[0] <= now - windowMs) {
                requests.shift();
            }
            
            // Check if we're at the limit
            if (requests.length >= maxRequests) {
                return false;
            }
            
            // Add current request
            requests.push(now);
            return true;
        };
    }
}

// Create API instance
const securityAPI = new SecurityAPI();

// Enhanced axios instance with security features
const createSecureApiClient = (options = {}) => {
    const client = axios.create({
        baseURL: `${API_BASE_URL}/api`,
        timeout: 30000,
        ...options
    });

    // Add security headers
    client.interceptors.request.use(async (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Add device fingerprint
        try {
            const fingerprint = await SecurityUtils.generateDeviceFingerprint();
            config.headers['X-Device-Fingerprint'] = fingerprint.hash;
        } catch (error) {
            console.warn('Could not generate device fingerprint:', error);
        }

        // Add timestamp for replay attack prevention
        config.headers['X-Timestamp'] = Date.now().toString();

        // Add request signature if API secret is available
        const apiSecret = localStorage.getItem('apiSecret');
        if (apiSecret && config.method && config.url) {
            try {
                const timestamp = Date.now();
                const signature = await SecurityUtils.signRequest(
                    config.method.toUpperCase(),
                    config.url,
                    config.data,
                    timestamp,
                    apiSecret
                );
                config.headers['X-Signature'] = signature;
                config.headers['X-Timestamp'] = timestamp.toString();
            } catch (error) {
                console.warn('Could not sign request:', error);
            }
        }

        return config;
    });

    // Enhanced error handling
    client.interceptors.response.use(
        (response) => {
            // Check for security warnings in response headers
            const securityWarning = response.headers['x-security-warning'];
            if (securityWarning) {
                console.warn('Security warning:', securityWarning);
                // Could show user notification here
            }

            return response.data;
        },
        (error) => {
            if (error.response?.status === 401) {
                SecurityUtils.clearSession();
                window.location.href = '/login';
                return Promise.reject(new Error('احراز هویت نامعتبر'));
            }

            if (error.response?.status === 429) {
                const retryAfter = error.response.headers['retry-after'];
                return Promise.reject(new Error(
                    `تعداد درخواست‌ها زیاد است. ${retryAfter ? `لطفاً ${retryAfter} ثانیه صبر کنید.` : ''}`
                ));
            }

            if (error.response?.status === 403) {
                const errorCode = error.response.data?.code;
                if (errorCode === 'REQUIRE_2FA') {
                    return Promise.reject(new Error('نیاز به کد دو عاملی'));
                }
                if (errorCode === 'IP_NOT_WHITELISTED') {
                    return Promise.reject(new Error('IP شما در لیست مجاز نیست'));
                }
            }

            const message = error.response?.data?.message || 'خطای شبکه';
            return Promise.reject(new Error(message));
        }
    );

    return client;
};

// Export everything
export {
    securityAPI,
    SecurityUtils,
    createSecureApiClient
};

export default securityAPI;
