# سیستم رسید و تنظیمات صرافان

## 📧 سیستم رسید و اطلاع‌رسانی

### 🎯 ویژگی‌های کلیدی

#### 1. **ارسال چندکاناله**
- **ایمیل**: با قالب HTML سفارشی و پیوست PDF
- **SMS**: از طریق ارائه‌دهندگان مختلف (کاوه‌نگار، ملی پیامک، قاصدک)
- **واتساپ**: از طریق Twilio و سایر ارائه‌دهندگان

#### 2. **قالب‌های سفارشی**
- قالب‌های HTML قابل شخصی‌سازی
- پشتیبانی از CSS سفارشی
- متغیرهای پویا برای اطلاعات تراکنش
- لوگو و اطلاعات صرافی

#### 3. **تولید PDF خودکار**
- تولید خودکار PDF رسید
- قالب‌بندی حرفه‌ای
- پشتیبانی از فونت‌های فارسی
- ذخیره‌سازی امن

### 🔄 گردش کار رسید

```
تراکنش تکمیل → تولید رسید → ارسال خودکار → پیگیری وضعیت
```

## ⚙️ سیستم تنظیمات صرافان

### 🎨 **برندینگ و ظاهر**

#### لوگو و فاویکون
- آپلود لوگو با فرمت‌های مختلف
- فاویکون سفارشی
- رنگ‌های برند
- فونت‌های سفارشی

#### اطلاعات تماس
- آدرس کامل صرافی
- شماره‌های تماس (اصلی، ثانویه، واتساپ)
- ایمیل‌های مختلف (اصلی، پشتیبانی، اطلاعات)
- شبکه‌های اجتماعی

### 📧 **تنظیمات رسید**

#### ارسال ایمیل
```javascript
{
  enabled: true,
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    username: 'your-email@gmail.com',
    password: 'your-password'
  },
  fromName: 'صرافی شما',
  fromEmail: 'noreply@your-exchange.com',
  subject: 'رسید تراکنش'
}
```

#### ارسال SMS
```javascript
{
  enabled: true,
  provider: 'kavenegar', // kavenegar, melipayamak, ghasedak
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret',
  fromNumber: '100000000',
  template: 'رسید تراکنش {{transactionId}}'
}
```

#### ارسال واتساپ
```javascript
{
  enabled: true,
  provider: 'twilio', // twilio, whatsapp_business
  apiKey: 'your-account-sid',
  apiSecret: 'your-auth-token',
  phoneNumber: '+1234567890',
  template: 'رسید تراکنش شما آماده است'
}
```

### 💱 **تنظیمات نرخ ارز**

#### منبع نرخ‌ها
- **دستی**: ورود دستی توسط کارمندان
- **API**: دریافت خودکار از API های خارجی
- **ترکیبی**: ترکیب هر دو روش

#### تنظیمات دستی
```javascript
{
  enabled: true,
  updateBy: 'admin', // admin, manager, staff
  approvalRequired: true
}
```

#### تنظیمات API
```javascript
{
  provider: 'fixer.io',
  url: 'http://data.fixer.io/api/latest',
  apiKey: 'your-api-key',
  updateInterval: 3600 // 1 hour
}
```

### 🏦 **تنظیمات حسابداری**

#### سال مالی
```javascript
{
  fiscalYear: {
    startMonth: 1, // January
    startDay: 1
  }
}
```

#### ارز پایه
- تعیین ارز پایه برای محاسبات
- پشتیبانی از ارزهای مختلف

#### مالیات
```javascript
{
  tax: {
    enabled: false,
    rate: 0, // percentage
    number: 'tax-registration-number'
  }
}
```

#### شماره‌گذاری خودکار
```javascript
{
  autoNumbering: {
    enabled: true,
    prefix: 'TXN',
    suffix: '',
    startNumber: 1,
    padding: 6 // 000001
  }
}
```

### 🔐 **تنظیمات امنیت**

#### تأیید دو مرحله‌ای
```javascript
{
  twoFactor: {
    enabled: true,
    methods: ['sms', 'email', 'authenticator']
  }
}
```

#### محدودیت‌های ورود
```javascript
{
  login: {
    maxAttempts: 5,
    lockoutDuration: 30, // minutes
    sessionTimeout: 480 // 8 hours
  }
}
```

#### رمزنگاری
```javascript
{
  encryption: {
    enabled: true,
    algorithm: 'AES-256'
  }
}
```

### 🔔 **تنظیمات اعلان‌ها**

```javascript
{
  notifications: {
    email: {
      enabled: true,
      types: ['transaction', 'transfer', 'alert', 'report']
    },
    sms: {
      enabled: true,
      types: ['transaction', 'transfer', 'alert']
    },
    push: {
      enabled: false,
      types: ['transaction', 'transfer', 'alert']
    }
  }
}
```

## 🔄 سیستم مهاجرت داده‌ها

### 📊 **ویژگی‌های مهاجرت**

#### پشتیبانی از سیستم‌های مختلف
- سیستم‌های قدیمی صرافی
- پایگاه‌های داده مختلف
- فرمت‌های مختلف داده

#### فرآیند مهاجرت
```javascript
{
  status: 'in_progress', // not_started, in_progress, completed, failed
  source: {
    system: 'legacy_exchange_system',
    version: '2.1',
    database: 'mysql',
    connection: {
      host: 'localhost',
      port: 3306,
      username: 'user',
      password: 'pass'
    }
  },
  progress: {
    totalRecords: 10000,
    processedRecords: 5000,
    failedRecords: 10,
    startTime: '2024-01-01T00:00:00Z',
    endTime: null
  }
}
```

#### گزارش‌گیری
- لاگ‌های کامل مهاجرت
- آمار پیشرفت
- خطاهای مهاجرت
- تأیید داده‌ها

## 📱 رابط کاربری

### 🎨 **پنل تنظیمات**

#### تب‌های مختلف
1. **برندینگ**: لوگو، رنگ‌ها، فونت‌ها
2. **اطلاعات تماس**: آدرس، تلفن، ایمیل
3. **رسید**: تنظیمات ارسال، قالب‌ها
4. **نرخ ارز**: منبع، تنظیمات دستی/API
5. **حسابداری**: سال مالی، مالیات، شماره‌گذاری
6. **امنیت**: تأیید دو مرحله‌ای، محدودیت‌ها
7. **اعلان‌ها**: تنظیمات اعلان‌های مختلف
8. **مهاجرت**: مدیریت مهاجرت داده‌ها

#### ویژگی‌های رابط
- آپلود فایل با drag & drop
- پیش‌نمایش لوگو و فاویکون
- تست تنظیمات ارسال
- نمایش وضعیت مهاجرت
- تاریخچه تغییرات

## 🔧 API ها

### رسید
- `POST /api/receipts/generate` - تولید و ارسال رسید
- `GET /api/receipts` - دریافت لیست رسیدها
- `GET /api/receipts/:id` - دریافت رسید خاص
- `GET /api/receipts/:id/download` - دانلود PDF
- `PUT /api/receipts/:id/resend` - ارسال مجدد
- `DELETE /api/receipts/:id` - حذف رسید

### تنظیمات
- `GET /api/tenant-settings` - دریافت تنظیمات
- `PUT /api/tenant-settings` - بروزرسانی تنظیمات
- `POST /api/tenant-settings/logo` - آپلود لوگو
- `POST /api/tenant-settings/favicon` - آپلود فاویکون
- `POST /api/tenant-settings/test-delivery` - تست ارسال
- `POST /api/tenant-settings/migration/start` - شروع مهاجرت

## 📊 مزایای سیستم

### برای صرافان
- **شخصی‌سازی کامل**: لوگو، رنگ‌ها، قالب‌ها
- **ارسال خودکار**: رسیدها بدون دخالت دستی
- **چندکاناله**: ایمیل، SMS، واتساپ
- **مهاجرت آسان**: انتقال از سیستم‌های قدیمی
- **امنیت بالا**: تأیید دو مرحله‌ای، رمزنگاری

### برای مشتریان
- **رسید فوری**: دریافت بلافاصله پس از تراکنش
- **چندکاناله**: دریافت از طریق کانال دلخواه
- **قالب حرفه‌ای**: رسیدهای زیبا و کامل
- **اطلاعات کامل**: جزئیات کامل تراکنش

### برای سیستم
- **مقیاس‌پذیری**: پشتیبانی از صرافان متعدد
- **انعطاف‌پذیری**: تنظیمات کاملاً قابل شخصی‌سازی
- **قابلیت توسعه**: API های کامل برای توسعه
- **پایداری**: سیستم پایدار و قابل اعتماد

## 🚀 راه‌اندازی

### 1. نصب وابستگی‌ها
```bash
npm install pdfkit nodemailer axios multer
```

### 2. تنظیم پوشه‌های آپلود
```bash
mkdir -p backend/uploads/branding
mkdir -p backend/uploads/receipts
```

### 3. تنظیم متغیرهای محیطی
```env
# Email Settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password

# SMS Settings
KAVENEGAR_API_KEY=your-api-key
MELIPAYAMAK_API_KEY=your-api-key

# WhatsApp Settings
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
```

### 4. اجرای سیستم
```bash
npm run dev
```

## 📞 پشتیبانی

برای پشتیبانی و راهنمایی:
- ایمیل: support@exchange-platform.com
- تلفن: +98-21-12345678
- چت آنلاین: در پنل مدیریت

---

**توجه**: این سیستم برای استفاده در محیط‌های تولید طراحی شده و تمام استانداردهای امنیتی را رعایت می‌کند. 