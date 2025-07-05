const mongoose = require('mongoose');
const User = require('../src/models/User');
const Partner = require('../src/models/Partner');
const Currency = require('../src/models/Currency');
const ExchangeRate = require('../src/models/ExchangeRate');
const Branch = require('../src/models/Branch');
const Account = require('../src/models/Account');
const authConfig = require('../src/config/auth');
require('dotenv').config();

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/exchange_platform');
        console.log('📦 اتصال به دیتابیس برای راه‌اندازی...');

        // پاک کردن داده‌های قبلی
        console.log('🧹 پاک کردن داده‌های قبلی...');
        await User.deleteMany({});
        await Partner.deleteMany({});
        await Currency.deleteMany({});
        await ExchangeRate.deleteMany({});
        await Branch.deleteMany({});
        await Account.deleteMany({});

        // ایجاد ارزهای اصلی
        console.log('💰 ایجاد ارزهای اصلی...');
        const currencies = [
            { code: 'USD', name: 'دلار آمریکا', symbol: '$', isActive: true },
            { code: 'EUR', name: 'یورو', symbol: '€', isActive: true },
            { code: 'GBP', name: 'پوند انگلیس', symbol: '£', isActive: true },
            { code: 'IRR', name: 'ریال ایران', symbol: 'ریال', isActive: true },
            { code: 'TRY', name: 'لیر ترکیه', symbol: '₺', isActive: true },
            { code: 'AED', name: 'درهم امارات', symbol: 'د.ا', isActive: true }
        ];

        const createdCurrencies = await Currency.insertMany(currencies);
        console.log(`✅ ${createdCurrencies.length} ارز ایجاد شد`);

        // ایجاد نرخ‌های ارز نمونه
        console.log('📊 ایجاد نرخ‌های ارز نمونه...');
        const rates = [
            { fromCurrency: 'USD', toCurrency: 'IRR', rate: 500000, isActive: true },
            { fromCurrency: 'EUR', toCurrency: 'IRR', rate: 550000, isActive: true },
            { fromCurrency: 'GBP', toCurrency: 'IRR', rate: 650000, isActive: true },
            { fromCurrency: 'USD', toCurrency: 'TRY', rate: 30, isActive: true },
            { fromCurrency: 'EUR', toCurrency: 'TRY', rate: 33, isActive: true },
            { fromCurrency: 'USD', toCurrency: 'AED', rate: 3.67, isActive: true }
        ];

        await ExchangeRate.insertMany(rates);
        console.log(`✅ ${rates.length} نرخ ارز ایجاد شد`);

        // ایجاد کاربر مدیر سیستم
        console.log('👤 ایجاد مدیر سیستم...');
        const systemAdmin = new User({
            tenantId: 'system',
            username: 'sysadmin',
            password: await authConfig.hashPassword('admin123'),
            role: 'system',
            name: 'مدیر سیستم',
            email: 'admin@exchangeplatform.com',
            permissions: ['all'],
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        await systemAdmin.save();

        // ایجاد صرافی نمونه
        console.log('🏢 ایجاد صرافی نمونه...');
        const samplePartner = new Partner({
            tenantId: 'sarrafi001',
            name: 'صرافی نمونه',
            type: 'exchange',
            address: 'تهران، خیابان ولیعصر',
            phone: '+98-21-12345678',
            email: 'info@sarrafi001.com',
            licenseNumber: 'EX-001-2024',
            isActive: true,
            settings: {
                maxTransactionAmount: 1000000000,
                minTransactionAmount: 100000,
                supportedCurrencies: ['USD', 'EUR', 'GBP', 'IRR', 'TRY', 'AED']
            }
        });
        await samplePartner.save();

        // ایجاد مدیر صرافی نمونه
        const sampleExchangeAdmin = new User({
            tenantId: 'sarrafi001',
            username: 'admin',
            password: await authConfig.hashPassword('admin123'),
            role: 'admin',
            name: 'مدیر صرافی نمونه',
            email: 'admin@sarrafi001.com',
            permissions: ['all'],
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        await sampleExchangeAdmin.save();

        // ایجاد شعبه نمونه
        console.log('🏪 ایجاد شعبه نمونه...');
        const sampleBranch = new Branch({
            tenantId: 'sarrafi001',
            name: 'شعبه مرکزی',
            address: 'تهران، خیابان ولیعصر، پلاک 123',
            phone: '+98-21-12345679',
            email: 'branch@sarrafi001.com',
            managerId: sampleExchangeAdmin._id,
            isActive: true,
            settings: {
                maxDailyTransactions: 100,
                maxTransactionAmount: 500000000
            }
        });
        await sampleBranch.save();

        // ایجاد حساب‌های نمونه
        console.log('💳 ایجاد حساب‌های نمونه...');
        const accounts = [
            {
                tenantId: 'sarrafi001',
                branchId: sampleBranch._id,
                accountNumber: 'ACC-001-USD',
                currency: 'USD',
                balance: 100000,
                type: 'operational',
                isActive: true
            },
            {
                tenantId: 'sarrafi001',
                branchId: sampleBranch._id,
                accountNumber: 'ACC-002-EUR',
                currency: 'EUR',
                balance: 50000,
                type: 'operational',
                isActive: true
            },
            {
                tenantId: 'sarrafi001',
                branchId: sampleBranch._id,
                accountNumber: 'ACC-003-IRR',
                currency: 'IRR',
                balance: 1000000000,
                type: 'operational',
                isActive: true
            }
        ];

        await Account.insertMany(accounts);
        console.log(`✅ ${accounts.length} حساب ایجاد شد`);

        // ایجاد کاربر کارمند نمونه
        console.log('👨‍💼 ایجاد کارمند نمونه...');
        const sampleEmployee = new User({
            tenantId: 'sarrafi001',
            username: 'employee',
            password: await authConfig.hashPassword('employee123'),
            role: 'employee',
            name: 'کارمند نمونه',
            email: 'employee@sarrafi001.com',
            branchId: sampleBranch._id,
            permissions: ['transactions', 'customers', 'reports'],
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        await sampleEmployee.save();

        console.log('\n🎉 راه‌اندازی دیتابیس با موفقیت تکمیل شد!');
        console.log('\n👤 اطلاعات ورود:');
        console.log('📋 مدیر سیستم:');
        console.log('   - نام کاربری: sysadmin');
        console.log('   - رمز عبور: admin123');
        console.log('   - نقش: مدیر کل سیستم');
        console.log('\n🏢 صرافی نمونه:');
        console.log('   - نام کاربری: admin');
        console.log('   - رمز عبور: admin123');
        console.log('   - نقش: مدیر صرافی');
        console.log('   - مستأجر: sarrafi001');
        console.log('\n👨‍💼 کارمند نمونه:');
        console.log('   - نام کاربری: employee');
        console.log('   - رمز عبور: employee123');
        console.log('   - نقش: کارمند');
        console.log('   - شعبه: شعبه مرکزی');
        
        process.exit(0);

    } catch (error) {
        console.error('❌ خطا در راه‌اندازی دیتابیس:', error);
        process.exit(1);
    }
}

seedDatabase();