# 🚀 راهنمای استقرار سیستم صرافی در هاست‌های رایگان

## 📋 فهرست مطالب
1. [Railway (توصیه شده)](#railway)
2. [Render](#render)
3. [Heroku](#heroku)
4. [Vercel (Frontend)](#vercel)
5. [نحوه کار سیستم](#system-workflow)

---

## 🚂 Railway (ساده‌ترین روش)

### مرحله 1: ثبت‌نام
1. به [railway.app](https://railway.app) بروید
2. با GitHub ثبت‌نام کنید
3. روی "New Project" کلیک کنید

### مرحله 2: اتصال به GitHub
1. "Deploy from GitHub repo" را انتخاب کنید
2. repository پروژه را انتخاب کنید
3. روی "Deploy Now" کلیک کنید

### مرحله 3: تنظیم متغیرهای محیطی
در Railway Dashboard:
```
NODE_ENV=production
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this
SESSION_SECRET=your-session-secret-change-this
MONGODB_URI=mongodb://localhost:27017/exchange_platform
REDIS_URL=redis://localhost:6379
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

### مرحله 4: اضافه کردن دیتابیس
1. روی "New" کلیک کنید
2. "Database" را انتخاب کنید
3. "MongoDB" را انتخاب کنید
4. متغیر `MONGODB_URI` را به environment variables اضافه کنید

### مرحله 5: اضافه کردن Redis
1. روی "New" کلیک کنید
2. "Database" را انتخاب کنید
3. "Redis" را انتخاب کنید
4. متغیر `REDIS_URL` را به environment variables اضافه کنید

### مرحله 6: دامنه سفارشی
1. در "Settings" > "Domains"
2. دامنه خود را اضافه کنید
3. DNS records را تنظیم کنید

---

## 🎨 Render

### مرحله 1: ثبت‌نام
1. به [render.com](https://render.com) بروید
2. با GitHub ثبت‌نام کنید

### مرحله 2: ایجاد Web Service
1. "New Web Service" را انتخاب کنید
2. repository پروژه را انتخاب کنید
3. تنظیمات:
   - **Name:** exchange-platform
   - **Environment:** Node
   - **Build Command:** `cd backend && npm install`
   - **Start Command:** `cd backend && npm start`

### مرحله 3: متغیرهای محیطی
```
NODE_ENV=production
PORT=10000
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this
SESSION_SECRET=your-session-secret-change-this
MONGODB_URI=mongodb://localhost:27017/exchange_platform
REDIS_URL=redis://localhost:6379
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

### مرحله 4: دیتابیس
1. "New Database" ایجاد کنید
2. "MongoDB" را انتخاب کنید
3. متغیر `MONGODB_URI` را کپی کنید

---

## 🏔️ Heroku

### مرحله 1: نصب Heroku CLI
```bash
# Windows
winget install --id=Heroku.HerokuCLI

# macOS
brew tap heroku/brew && brew install heroku

# Linux
curl https://cli-assets.heroku.com/install.sh | sh
```

### مرحله 2: ورود و ایجاد اپ
```bash
heroku login
heroku create your-exchange-platform
```

### مرحله 3: اضافه کردن Add-ons
```bash
# MongoDB
heroku addons:create mongolab:sandbox

# Redis
heroku addons:create rediscloud:30
```

### مرحله 4: تنظیم متغیرهای محیطی
```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-super-secret-jwt-key-change-this
heroku config:set JWT_REFRESH_SECRET=your-refresh-secret-key-change-this
heroku config:set SESSION_SECRET=your-session-secret-change-this
heroku config:set ALLOWED_ORIGINS=https://your-frontend-domain.com
```

### مرحله 5: Deploy
```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

### مرحله 6: دامنه سفارشی
```bash
heroku domains:add yourdomain.com
```

---

## ⚡ Vercel (Frontend)

### مرحله 1: ثبت‌نام
1. به [vercel.com](https://vercel.com) بروید
2. با GitHub ثبت‌نام کنید

### مرحله 2: Import Project
1. "New Project" را انتخاب کنید
2. repository پروژه را انتخاب کنید
3. تنظیمات:
   - **Framework Preset:** Vite
   - **Root Directory:** frontend
   - **Build Command:** `npm run build`
   - **Output Directory:** dist

### مرحله 3: متغیرهای محیطی
```
VITE_API_URL=https://your-backend-url.com
```

### مرحله 4: Deploy
روی "Deploy" کلیک کنید

---

## 🔄 نحوه کار سیستم

### 1. صفحه ورود (Login)
```
https://your-domain.com/login
```

**نقش‌های مختلف:**
- **Super Admin:** مدیریت کل سیستم
- **Tenant Admin:** مدیریت صرافی خاص
- **Manager:** مدیریت شعبه
- **Staff:** کارمند عادی
- **Customer:** مشتری

### 2. مسیرهای مختلف بر اساس نقش

#### Super Admin
```
/login → /super-admin/dashboard
├── مدیریت صرافی‌ها
├── مدیریت کاربران
├── گزارش‌های کلی
└── تنظیمات سیستم
```

#### Tenant Admin
```
/login → /admin/dashboard
├── مدیریت مشتریان
├── مدیریت تراکنش‌ها
├── مدیریت نرخ‌ها
├── گزارش‌های مالی
└── تنظیمات صرافی
```

#### Manager
```
/login → /manager/dashboard
├── مدیریت شعبه
├── تایید تراکنش‌ها
├── گزارش‌های شعبه
└── مدیریت کارمندان
```

#### Staff
```
/login → /staff/dashboard
├── ثبت تراکنش‌ها
├── مدیریت مشتریان
├── گزارش‌های روزانه
└── پروفایل شخصی
```

#### Customer
```
/login → /customer/dashboard
├── کیف پول
├── تاریخچه تراکنش‌ها
├── خرید/فروش ارز
├── حواله‌ها
└── پروفایل
```

### 3. فرآیند احراز هویت

1. **ورود:** ایمیل + رمز عبور
2. **تایید دو مرحله‌ای:** OTP (اختیاری)
3. **بررسی نقش:** سیستم نقش کاربر را بررسی می‌کند
4. **هدایت:** کاربر به dashboard مناسب هدایت می‌شود

### 4. امنیت

- **JWT Token:** برای احراز هویت
- **Session Management:** با Redis
- **Role-based Access:** کنترل دسترسی بر اساس نقش
- **Tenant Isolation:** جداسازی داده‌های صرافی‌ها
- **Rate Limiting:** محدودیت درخواست‌ها
- **CSRF Protection:** محافظت در برابر حملات CSRF

### 5. ویژگی‌های کلیدی

#### برای مشتریان:
- ثبت‌نام و احراز هویت
- خرید و فروش ارز
- حواله‌های بین‌المللی
- کیف پول دیجیتال
- تاریخچه تراکنش‌ها
- پروفایل شخصی

#### برای مدیران:
- مدیریت مشتریان
- تایید تراکنش‌ها
- تنظیم نرخ‌های ارز
- گزارش‌های مالی
- مدیریت کارمندان
- تنظیمات سیستم

---

## 🚨 نکات مهم

### 1. امنیت
- کلیدهای JWT را تغییر دهید
- از HTTPS استفاده کنید
- فایروال تنظیم کنید
- Backup منظم داشته باشید

### 2. عملکرد
- Redis برای کش استفاده کنید
- تصاویر را بهینه کنید
- CDN برای فایل‌های استاتیک
- Monitoring تنظیم کنید

### 3. مقیاس‌پذیری
- Load Balancer استفاده کنید
- Database sharding
- Microservices architecture
- Auto-scaling

---

## 📞 پشتیبانی

در صورت بروز مشکل:
1. لاگ‌های سیستم را بررسی کنید
2. متغیرهای محیطی را چک کنید
3. اتصال دیتابیس را تست کنید
4. با تیم پشتیبانی تماس بگیرید

---

## 🎉 تبریک!

سیستم صرافی شما آماده استفاده است! 🚀 