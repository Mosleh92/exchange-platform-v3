const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🚀 راه‌اندازی محیط پلتفرم صرافی...\n');

// ایجاد فایل .env برای backend
const backendEnvPath = path.join(__dirname, '../backend/.env');
const backendEnvExamplePath = path.join(__dirname, '../backend/env.example');

if (!fs.existsSync(backendEnvPath)) {
    console.log('📝 ایجاد فایل .env برای backend...');
    
    if (fs.existsSync(backendEnvExamplePath)) {
        let envContent = fs.readFileSync(backendEnvExamplePath, 'utf8');
        
        // تولید کلیدهای امن تصادفی
        const jwtSecret = crypto.randomBytes(64).toString('hex');
        const sessionSecret = crypto.randomBytes(32).toString('hex');
        
        // جایگزینی کلیدهای امن
        envContent = envContent.replace(
            'your-super-secret-jwt-key-change-this-in-production',
            jwtSecret
        );
        envContent = envContent.replace(
            'your-session-secret-key-change-this-in-production',
            sessionSecret
        );
        
        fs.writeFileSync(backendEnvPath, envContent);
        console.log('✅ فایل .env برای backend ایجاد شد');
    } else {
        console.log('❌ فایل env.example یافت نشد');
    }
} else {
    console.log('✅ فایل .env برای backend از قبل وجود دارد');
}

// ایجاد پوشه‌های مورد نیاز
const requiredDirs = [
    '../backend/logs',
    '../backend/uploads',
    '../backend/uploads/documents',
    '../backend/uploads/avatars',
    '../frontend/public/uploads'
];

requiredDirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`📁 پوشه ${dir} ایجاد شد`);
    }
});

// بررسی وجود MongoDB
console.log('\n🔍 بررسی پیش‌نیازها...');

// بررسی Node.js
const nodeVersion = process.version;
const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0]);
if (nodeMajor >= 16) {
    console.log(`✅ Node.js ${nodeVersion} - مناسب`);
} else {
    console.log(`❌ Node.js ${nodeVersion} - نیاز به نسخه 16 یا بالاتر`);
}

// بررسی npm
const npmVersion = require('child_process').execSync('npm --version', { encoding: 'utf8' }).trim();
console.log(`✅ npm ${npmVersion} - مناسب`);

console.log('\n🎉 راه‌اندازی محیط تکمیل شد!');
console.log('\n📋 مراحل بعدی:');
console.log('1. MongoDB را نصب و راه‌اندازی کنید');
console.log('2. فایل backend/.env را بررسی و تنظیم کنید');
console.log('3. دستور npm run seed را اجرا کنید');
console.log('4. دستور npm run dev را اجرا کنید');
console.log('\n🌐 دسترسی:');
console.log('- Frontend: http://localhost:8080');
console.log('- Backend API: http://localhost:3000'); 