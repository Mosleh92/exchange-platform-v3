# بهروزرسانی اتوماتیک سیستم - راهنمای استفاده

این پلتفرم حالا شامل سیستم بهروزرسانی و راهاندازی خودکار میباشد.

## نصب اتوماتیک

### 1. راهاندازی اولیه
```bash
npm run setup
```

این دستور موارد زیر را انجام میدهد:
- ایجاد ساختار پوشهها
- نصب وابستگیها  
- ایجاد فایلهای پیکربندی (.env.example, docker-compose.yml, Dockerfile)
- کپی کردن فایل .env از .env.example

### 2. اجرای مایگریشنها
```bash
npm run migrate
```

این دستور:
- اتصال به MongoDB
- اجرای مایگریشنهای جدید
- ایجاد ایندکسهای لازم
- بهروزرسانی ساختار دیتابیس

### 3. وارد کردن دادههای اولیه
```bash
npm run seed
```

این دستور:
- وارد کردن نرخهای ارز اولیه (IRR/AED)
- ایجاد طرحهای اشتراک (basic, professional)
- تنظیم دادههای اولیه سیستم

### 4. اجرای برنامه در حالت توسعه
```bash
npm run dev
```

### 5. اجرا با داکر
```bash
docker-compose up -d
```

## ویژگیهای جدید

### Package.json بکند (v3.0.0)
- **نسخه جدید**: 3.0.0
- **وابستگیهای جدید**:
  - dinero.js: کتابخانه مدیریت ارز
  - accounting-js: محاسبات مالی  
  - moment-jalaali: تاریخ شمسی
  - big.js: محاسبات اعشاری دقیق
  - bcrypt: رمزنگاری
  - redis: کش و سشن

### اسکریپتهای جدید
- `setup`: راهاندازی اولیه اتوماتیک
- `migrate`: اجرای مایگریشنهای دیتابیس
- `seed`: وارد کردن دادههای اولیه
- `format`: فرمت کردن کد با Prettier

### فایلهای پیکربندی
- **Docker**: Dockerfile و docker-compose.yml
- **Environment**: .env.example با تمام متغیرهای لازم
- **Database**: سیستم مایگریشن خودکار

## ساختار دیرکتوری

```
backend/
├── scripts/
│   ├── setup.js      # راهاندازی اولیه
│   ├── migrate.js    # مایگریشن دیتابیس  
│   └── seed.js       # دادههای اولیه
├── src/
│   ├── config/       # تنظیمات
│   ├── models/       # مدلهای دیتابیس
│   ├── services/     # سرویسها
│   ├── controllers/  # کنترلرها
│   ├── routes/       # مسیرها
│   ├── middleware/   # میدلورها
│   └── utils/        # ابزارها
├── .env.example      # نمونه متغیرهای محیطی
├── Dockerfile        # تنظیمات داکر
└── docker-compose.yml # داکر کامپوز
```

## استفاده در محیط تولید

```bash
# 1. کلون ریپازیتوری
git clone <repository-url>
cd exchange-platform-v3/backend

# 2. راهاندازی اولیه
npm run setup

# 3. تنظیم متغیرهای محیطی
cp .env.example .env
# ویرایش فایل .env با مقادیر واقعی

# 4. اجرای مایگریشنها
npm run migrate

# 5. وارد کردن دادههای اولیه
npm run seed

# 6. اجرای برنامه
npm start

# یا با داکر
docker-compose up -d
```

## نکات مهم

1. **MongoDB**: قبل از اجرای migrate و seed، MongoDB باید نصب و در حال اجرا باشد
2. **Redis**: برای کارکرد کامل سیستم، Redis نیز لازم است
3. **متغیرهای محیطی**: فایل .env را با مقادیر واقعی پر کنید
4. **امنیت**: در محیط تولید، JWT_SECRET و SESSION_SECRET را تغییر دهید

## دستورات اضافی

```bash
npm run lint          # بررسی کد
npm run format        # فرمت کردن کد
npm run test          # اجرای تستها
npm run start         # اجرای برنامه
```