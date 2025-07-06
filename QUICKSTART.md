# 🚀 راهنمای سریع راه‌اندازی

## 📋 پیش‌نیازها

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0  
- **MongoDB** (محلی یا ابری)

## ⚡ راه‌اندازی در 5 دقیقه

### 1️⃣ نصب وابستگی‌ها
```bash
npm run install:all
```

### 2️⃣ راه‌اندازی محیط
```bash
npm run setup:env
```

### 3️⃣ راه‌اندازی دیتابیس
```bash
npm run seed
```

### 4️⃣ اجرای سیستم
```bash
npm run dev
```

### 5️⃣ دسترسی به سیستم
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3000

## 👤 اطلاعات ورود پیش‌فرض

### مدیر سیستم
- **نام کاربری**: `sysadmin`
- **رمز عبور**: `admin123`
- **نقش**: مدیر کل سیستم

### صرافی نمونه
- **نام کاربری**: `admin`
- **رمز عبور**: `admin123`
- **نقش**: مدیر صرافی
- **مستأجر**: `sarrafi001`

### کارمند نمونه
- **نام کاربری**: `employee`
- **رمز عبور**: `employee123`
- **نقش**: کارمند
- **شعبه**: شعبه مرکزی

## 🔧 تنظیمات مهم

### فایل .env
فایل `backend/.env` را بررسی و تنظیم کنید:

```env
# دیتابیس
MONGODB_URI=mongodb://localhost:27017/exchange_platform

# سرور
PORT=3000
NODE_ENV=development

# امنیت
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret

# CORS
ALLOWED_ORIGINS=http://localhost:8080
```

### MongoDB
اگر MongoDB محلی ندارید:
1. MongoDB را نصب کنید: https://docs.mongodb.com/manual/installation/
2. یا از MongoDB Atlas استفاده کنید: https://www.mongodb.com/atlas

## 🐛 عیب‌یابی

### خطای اتصال به دیتابیس
```bash
# بررسی وضعیت MongoDB
mongosh --eval "db.runCommand('ping')"
```

### خطای پورت
```bash
# بررسی پورت‌های استفاده شده
netstat -an | grep :3000
netstat -an | grep :8080
```

### خطای وابستگی‌ها
```bash
# پاک کردن cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## 📁 ساختار پروژه

```
exchange-platform-v3/
├── backend/           # API سرور
│   ├── src/          # کدهای اصلی
│   ├── scripts/      # اسکریپت‌ها
│   └── .env          # تنظیمات محیط
├── frontend/         # رابط کاربری
│   ├── public/       # فایل‌های استاتیک
│   └── src/          # کدهای React/Vue
└── scripts/          # اسکریپت‌های کلی
```

## 🔄 دستورات مفید

```bash
# راه‌اندازی کامل
npm run setup

# اجرای همزمان backend و frontend
npm run dev

# فقط backend
npm run dev:backend

# فقط frontend  
npm run dev:frontend

# تست سیستم
npm run test

# بررسی کد
npm run lint

# ساخت برای تولید
npm run build
```

## 📞 پشتیبانی

اگر مشکلی دارید:
1. لاگ‌ها را بررسی کنید: `npm run logs`
2. فایل README.md را مطالعه کنید
3. Issue ایجاد کنید

## 🎯 مراحل بعدی

1. **تنظیمات امنیتی**: کلیدهای JWT و Session را تغییر دهید
2. **پیکربندی دیتابیس**: تنظیمات MongoDB را بهینه کنید
3. **تنظیمات ایمیل/SMS**: برای اطلاع‌رسانی پیکربندی کنید
4. **مانیتورینگ**: سیستم نظارت اضافه کنید
5. **Backup**: سیستم پشتیبان‌گیری راه‌اندازی کنید 