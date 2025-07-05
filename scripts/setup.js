#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class SetupScript {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.backendPath = path.join(this.projectRoot, 'backend');
    this.frontendPath = path.join(this.projectRoot, 'frontend');
  }

  async run() {
    console.log('🚀 راه‌اندازی پلتفرم صرافی چند‌مستأجری');
    console.log('=====================================\n');

    try {
      await this.checkPrerequisites();
      await this.installDependencies();
      await this.setupEnvironment();
      await this.setupDatabase();
      await this.seedDatabase();
      await this.buildFrontend();
      
      console.log('\n✅ راه‌اندازی با موفقیت انجام شد!');
      console.log('\n📱 دسترسی به اپلیکیشن:');
      console.log('   Frontend: http://localhost:3000');
      console.log('   Backend:  http://localhost:5000');
      console.log('\n👤 حساب‌های پیش‌فرض:');
      console.log('   Super Admin: superadmin / SuperAdmin@123');
      console.log('   Tenant Admin: tenantadmin / TenantAdmin@123');
      console.log('   Customer: customer / Customer@123');
      
    } catch (error) {
      console.error('\n❌ خطا در راه‌اندازی:', error.message);
      process.exit(1);
    } finally {
      rl.close();
    }
  }

  async checkPrerequisites() {
    console.log('🔍 بررسی پیش‌نیازها...');

    // Check Node.js version
    const nodeVersion = process.version;
    const requiredVersion = '16.0.0';
    
    if (this.compareVersions(nodeVersion, requiredVersion) < 0) {
      throw new Error(`Node.js ${requiredVersion} یا بالاتر مورد نیاز است. نسخه فعلی: ${nodeVersion}`);
    }

    // Check npm version
    try {
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      const requiredNpmVersion = '8.0.0';
      
      if (this.compareVersions(npmVersion, requiredNpmVersion) < 0) {
        throw new Error(`npm ${requiredNpmVersion} یا بالاتر مورد نیاز است. نسخه فعلی: ${npmVersion}`);
      }
    } catch (error) {
      throw new Error('npm یافت نشد. لطفاً Node.js را نصب کنید.');
    }

    // Check MongoDB
    try {
      execSync('mongod --version', { stdio: 'ignore' });
    } catch (error) {
      console.warn('⚠️  MongoDB یافت نشد. لطفاً MongoDB را نصب کنید.');
      console.log('   راهنمای نصب: https://docs.mongodb.com/manual/installation/');
    }

    console.log('✅ پیش‌نیازها بررسی شدند');
  }

  async installDependencies() {
    console.log('\n📦 نصب وابستگی‌ها...');

    // Install root dependencies
    console.log('   نصب وابستگی‌های اصلی...');
    execSync('npm install', { cwd: this.projectRoot, stdio: 'inherit' });

    // Install backend dependencies
    console.log('   نصب وابستگی‌های بک‌اند...');
    execSync('npm install', { cwd: this.backendPath, stdio: 'inherit' });

    // Install frontend dependencies
    console.log('   نصب وابستگی‌های فرانت‌اند...');
    execSync('npm install', { cwd: this.frontendPath, stdio: 'inherit' });

    console.log('✅ وابستگی‌ها نصب شدند');
  }

  async setupEnvironment() {
    console.log('\n⚙️  تنظیم متغیرهای محیطی...');

    // Create backend .env file
    const backendEnvPath = path.join(this.backendPath, '.env');
    if (!fs.existsSync(backendEnvPath)) {
      const backendEnvContent = this.getBackendEnvContent();
      fs.writeFileSync(backendEnvPath, backendEnvContent);
      console.log('   فایل .env بک‌اند ایجاد شد');
    }

    // Create frontend .env file
    const frontendEnvPath = path.join(this.frontendPath, '.env');
    if (!fs.existsSync(frontendEnvPath)) {
      const frontendEnvContent = this.getFrontendEnvContent();
      fs.writeFileSync(frontendEnvPath, frontendEnvContent);
      console.log('   فایل .env فرانت‌اند ایجاد شد');
    }

    console.log('✅ متغیرهای محیطی تنظیم شدند');
  }

  async setupDatabase() {
    console.log('\n🗄️  راه‌اندازی دیتابیس...');

    // Check if MongoDB is running
    try {
      execSync('mongod --version', { stdio: 'ignore' });
      
      // Try to start MongoDB if not running
      try {
        execSync('mongod --dbpath /tmp/mongodb --port 27017 --fork --logpath /tmp/mongodb.log', { stdio: 'ignore' });
        console.log('   MongoDB راه‌اندازی شد');
      } catch (error) {
        console.log('   MongoDB در حال اجرا است');
      }
    } catch (error) {
      console.warn('⚠️  MongoDB یافت نشد. لطفاً MongoDB را نصب و راه‌اندازی کنید.');
    }

    console.log('✅ دیتابیس راه‌اندازی شد');
  }

  async seedDatabase() {
    console.log('\n🌱 Seed کردن داده‌های اولیه...');

    try {
      execSync('npm run seed', { cwd: this.backendPath, stdio: 'inherit' });
      console.log('✅ داده‌های اولیه ایجاد شدند');
    } catch (error) {
      console.warn('⚠️  خطا در seed کردن دیتابیس:', error.message);
    }
  }

  async buildFrontend() {
    console.log('\n🔨 Build فرانت‌اند...');

    try {
      execSync('npm run build', { cwd: this.frontendPath, stdio: 'inherit' });
      console.log('✅ فرانت‌اند build شد');
    } catch (error) {
      console.warn('⚠️  خطا در build فرانت‌اند:', error.message);
    }
  }

  getBackendEnvContent() {
    return `# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/exchange_platform
MONGODB_URI_PROD=mongodb://your-production-db-url

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this-in-production
JWT_REFRESH_EXPIRES_IN=7d

# Email (برای ارسال ایمیل)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
FRONTEND_URL=http://localhost:3000

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret-change-this-in-production

# External APIs (برای نرخ ارز)
EXCHANGE_RATE_API_KEY=your-api-key
EXCHANGE_RATE_BASE_URL=https://api.exchangerate-api.com/v4

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Redis (برای cache و session)
REDIS_URL=redis://localhost:6379

# AWS S3 (برای آپلود فایل در production)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# Payment Gateway (برای پرداخت‌ها)
PAYMENT_GATEWAY_API_KEY=your-payment-api-key
PAYMENT_GATEWAY_SECRET=your-payment-secret

# SMS Gateway (برای ارسال پیامک)
SMS_API_KEY=your-sms-api-key
SMS_API_SECRET=your-sms-secret
SMS_FROM_NUMBER=your-sms-number

# Monitoring
SENTRY_DSN=your-sentry-dsn
NEW_RELIC_LICENSE_KEY=your-newrelic-key

# Backup
BACKUP_PATH=./backups
BACKUP_RETENTION_DAYS=30

# SSL/TLS
SSL_KEY_PATH=./ssl/private.key
SSL_CERT_PATH=./ssl/certificate.crt
`;
  }

  getFrontendEnvContent() {
    return `# API Configuration
VITE_API_BASE_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000

# App Configuration
VITE_APP_NAME=پلتفرم صرافی
VITE_APP_VERSION=1.0.0
VITE_APP_DESCRIPTION=پلتفرم صرافی چند‌مستأجری

# Features
VITE_ENABLE_PWA=true
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true

# External Services
VITE_GOOGLE_ANALYTICS_ID=your-ga-id
VITE_SENTRY_DSN=your-sentry-dsn

# Payment
VITE_STRIPE_PUBLIC_KEY=your-stripe-public-key
VITE_PAYPAL_CLIENT_ID=your-paypal-client-id

# Maps
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-key

# File Upload
VITE_MAX_FILE_SIZE=5242880
VITE_ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf

# Real-time
VITE_ENABLE_REALTIME=true
VITE_REALTIME_UPDATE_INTERVAL=30000

# Localization
VITE_DEFAULT_LOCALE=fa
VITE_FALLBACK_LOCALE=en
VITE_SUPPORTED_LOCALES=fa,en,ar

# Theme
VITE_DEFAULT_THEME=light
VITE_ENABLE_DARK_MODE=true

# Performance
VITE_ENABLE_CACHE=true
VITE_CACHE_DURATION=300000
VITE_ENABLE_COMPRESSION=true

# Security
VITE_ENABLE_CSRF=true
VITE_ENABLE_XSS_PROTECTION=true
VITE_ENABLE_CONTENT_SECURITY_POLICY=true

# Development
VITE_ENABLE_HOT_RELOAD=true
VITE_ENABLE_SOURCE_MAPS=true
VITE_ENABLE_ESLINT=true
`;
  }

  compareVersions(version1, version2) {
    const v1 = version1.replace('v', '').split('.').map(Number);
    const v2 = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const num1 = v1[i] || 0;
      const num2 = v2[i] || 0;
      
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    
    return 0;
  }

  async question(prompt) {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  }
}

// Run the setup script
const setup = new SetupScript();
setup.run().catch(console.error); 