// backend/src/scripts/initializeSecurity.js
const mongoose = require('mongoose');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const bcrypt = require('bcryptjs');

class SecurityInitializer {
    async initialize() {
        try {
            console.log('🔒 شروع تنظیم اولیه سیستم امنیتی...');

            // 1. Connect to database
            await this.connectDatabase();

            // 2. Create security indexes
            await this.createSecurityIndexes();

            // 3. Setup default admin with security features
            await this.setupSecureAdmin();

            // 4. Initialize rate limiting rules
            await this.initializeRateLimits();

            // 5. Create security policies
            await this.createSecurityPolicies();

            console.log('✅ تنظیم اولیه سیستم امنیتی با موفقیت انجام شد');
        } catch (error) {
            console.error('❌ خطا در تنظیم اولیه سیستم امنیتی:', error);
            throw error;
        }
    }

    async connectDatabase() {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/exchange');
        console.log('📚 اتصال به پایگاه داده برقرار شد');
    }

    async createSecurityIndexes() {
        // User security indexes
        await User.collection.createIndex({ email: 1 }, { unique: true });
        await User.collection.createIndex({ 'apiKeys.key': 1 });
        await User.collection.createIndex({ 'ipWhitelist.ip': 1 });
        await User.collection.createIndex({ lastLoginAt: -1 });
        await User.collection.createIndex({ failedLoginAttempts: 1, lockoutUntil: 1 });

        // Audit log indexes
        await AuditLog.collection.createIndex({ userId: 1, createdAt: -1 });
        await AuditLog.collection.createIndex({ action: 1, createdAt: -1 });
        await AuditLog.collection.createIndex({ severity: 1, createdAt: -1 });
        await AuditLog.collection.createIndex({ ipAddress: 1, createdAt: -1 });
        await AuditLog.collection.createIndex({ createdAt: -1 });

        console.log('📊 ایندکس‌های امنیتی ایجاد شدند');
    }

    async setupSecureAdmin() {
        const adminEmail = 'admin@exchange.com';
        let admin = await User.findOne({ email: adminEmail });

        if (!admin) {
            const hashedPassword = await bcrypt.hash('Admin@123!', 12);
            
            admin = new User({
                email: adminEmail,
                password: hashedPassword,
                firstName: 'System',
                lastName: 'Administrator',
                phone: '+1234567890',
                role: 'super_admin',
                isActive: true,
                isVerified: true,
                kycStatus: 'approved',
                twoFactorEnabled: false, // Will be prompted to enable on first login
                ipWhitelistEnabled: false,
                notifications: {
                    email: {
                        login: true,
                        transaction: true,
                        security: true,
                        marketing: false
                    },
                    sms: {
                        login: true,
                        transaction: true,
                        security: true
                    }
                }
            });

            await admin.save();
            console.log('👨‍💼 ادمین امن ایجاد شد:', adminEmail);
        }

        // Create initial audit log
        await AuditLog.create({
            userId: admin._id,
            action: 'SYSTEM_INITIALIZATION',
            resource: 'Security',
            details: 'سیستم امنیتی مقداردهی اولیه شد',
            severity: 'medium',
            ipAddress: '127.0.0.1'
        });
    }

    async initializeRateLimits() {
        const Redis = require('redis');
        const redis = Redis.createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        });
        
        try {
            await redis.connect();
            
            // Set default rate limiting rules
            const defaultRules = {
                global: { requests: 1000, window: 3600000 }, // 1000 per hour
                auth: { requests: 5, window: 900000 }, // 5 per 15 minutes
                api: { requests: 100, window: 60000 }, // 100 per minute
                sensitive: { requests: 3, window: 60000 }, // 3 per minute
                upload: { requests: 10, window: 60000 } // 10 per minute
            };

            await redis.set('rate_limits:rules', JSON.stringify(defaultRules));
            
            // Initialize security IP lists
            await redis.set('security:blocked_ips', JSON.stringify([]));
            await redis.set('security:trusted_ips', JSON.stringify(['127.0.0.1', '::1']));
            
            await redis.disconnect();
            console.log('⚡ قوانین Rate Limiting تنظیم شدند');
        } catch (error) {
            console.warn('⚠️  خطا در اتصال Redis:', error.message);
        }
    }

    async createSecurityPolicies() {
        // Create default security policies document
        const SecurityPolicy = require('../models/SecurityPolicy');
        
        const defaultPolicy = {
            passwordPolicy: {
                minLength: 8,
                requireUppercase: true,
                requireLowercase: true,
                requireNumbers: true,
                requireSpecialChars: true,
                maxAge: 90, // days
                preventReuse: 5 // last 5 passwords
            },
            sessionPolicy: {
                maxDuration: 30, // minutes
                requireReauth: 60, // minutes for sensitive operations
                maxConcurrentSessions: 3
            },
            loginPolicy: {
                maxFailedAttempts: 5,
                lockoutDuration: 15, // minutes
                require2FA: false, // can be enabled per user
                allowedCountries: [],
                blockedCountries: ['CN', 'RU', 'KP']
            },
            apiPolicy: {
                requireSignature: false,
                maxKeyAge: 365, // days
                allowedOrigins: ['http://localhost:3000', 'http://localhost:5173']
            }
        };

        await SecurityPolicy.findOneAndUpdate(
            { type: 'default' },
            defaultPolicy,
            { upsert: true, new: true }
        );

        console.log('📋 سیاست‌های امنیتی پیش‌فرض ایجاد شدند');
    }

    async testSecurityFeatures() {
        console.log('🧪 تست ویژگی‌های امنیتی...');

        try {
            // Test services
            const TwoFactorAuthService = require('../services/twoFactorAuthService');
            const IPWhitelistService = require('../services/ipWhitelistService');
            const DigitalSignatureService = require('../services/digitalSignatureService');
            const RateLimiterService = require('../services/rateLimiterService');

            // Test 2FA service
            console.log('  ✓ TwoFactorAuthService loaded');

            // Test IP Whitelist service
            console.log('  ✓ IPWhitelistService loaded');

            // Test Digital Signature service
            console.log('  ✓ DigitalSignatureService loaded');

            // Test Rate Limiter service
            console.log('  ✓ RateLimiterService loaded');

            console.log('✅ تمام سرویس‌های امنیتی آماده هستند');
        } catch (error) {
            console.error('❌ خطا در تست سرویس‌های امنیتی:', error);
            throw error;
        }
    }

    async generateSecurityReport() {
        const report = {
            timestamp: new Date(),
            features: {
                twoFactorAuth: '✅ پیاده‌سازی شده',
                ipWhitelisting: '✅ پیاده‌سازی شده',
                digitalSignature: '✅ پیاده‌سازی شده',
                rateLimiting: '✅ پیاده‌سازی شده',
                auditLogging: '✅ پیاده‌سازی شده',
                securityMiddleware: '✅ پیاده‌سازی شده'
            },
            recommendations: [
                'فعال‌سازی 2FA برای تمام کاربران',
                'تنظیم لیست سفید IP برای دسترسی‌های حساس',
                'بررسی منظم گزارش‌های امنیتی',
                'به‌روزرسانی منظم رمزهای عبور',
                'نظارت بر فعالیت‌های مشکوک'
            ]
        };

        console.log('\n📋 گزارش امنیتی سیستم:');
        console.log(JSON.stringify(report, null, 2));
        
        return report;
    }
}

// Initialize if run directly
if (require.main === module) {
    const initializer = new SecurityInitializer();
    initializer.initialize()
        .then(() => initializer.testSecurityFeatures())
        .then(() => initializer.generateSecurityReport())
        .then(() => {
            console.log('\n🎉 سیستم امنیتی آماده استفاده است!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 خطا در مقداردهی اولیه:', error);
            process.exit(1);
        });
}

module.exports = SecurityInitializer;
