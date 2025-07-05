# مستندات API پلتفرم صرافی | Exchange Platform API Documentation

## 📋 فهرست مطالب

- [معرفی](#معرفی)
- [احراز هویت](#احراز-هویت)
- [Endpoints](#endpoints)
- [کدهای خطا](#کدهای-خطا)
- [مثال‌های استفاده](#مثال‌های-استفاده)
- [Rate Limiting](#rate-limiting)

## معرفی

API پلتفرم صرافی یک RESTful API است که امکان مدیریت کامل صرافی‌ها، تراکنش‌ها، مشتریان و گزارش‌ها را فراهم می‌کند.

### Base URL
- **Development**: `http://localhost:5000/api`
- **Staging**: `https://staging-api.exchange.com/api`
- **Production**: `https://api.exchange.com/api`

### Content-Type
```
Content-Type: application/json
```

### Response Format
تمام پاسخ‌ها در فرمت JSON هستند:
```json
{
  "success": true,
  "message": "عملیات با موفقیت انجام شد",
  "data": {},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## احراز هویت

### JWT Authentication
تمام درخواست‌ها (به جز login و register) نیاز به توکن JWT دارند.

#### دریافت توکن
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### پاسخ
```json
{
  "success": true,
  "message": "ورود موفقیت‌آمیز",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "role": "tenant_admin",
      "tenantId": "507f1f77bcf86cd799439012"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### استفاده از توکن
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Endpoints

### 🔐 Authentication

#### POST /api/auth/login
ورود کاربر

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "ورود موفقیت‌آمیز",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "role": "tenant_admin",
      "tenantId": "507f1f77bcf86cd799439012",
      "permissions": ["read:transactions", "write:transactions"]
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### POST /api/auth/register
ثبت‌نام کاربر جدید

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "نام کاربر",
  "phone": "+989123456789",
  "role": "customer"
}
```

#### POST /api/auth/logout
خروج کاربر

**Headers:**
```http
Authorization: Bearer <access_token>
```

### 💰 Transactions

#### GET /api/transactions
دریافت لیست تراکنش‌ها

**Query Parameters:**
- `page`: شماره صفحه (پیش‌فرض: 1)
- `limit`: تعداد آیتم در هر صفحه (پیش‌فرض: 10)
- `status`: فیلتر بر اساس وضعیت
- `type`: فیلتر بر اساس نوع
- `fromDate`: تاریخ شروع
- `toDate`: تاریخ پایان

**Headers:**
```http
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "تراکنش‌ها با موفقیت دریافت شدند",
  "data": {
    "transactions": [
      {
        "id": "507f1f77bcf86cd799439011",
        "transactionId": "TXN202401010001",
        "customerId": "507f1f77bcf86cd799439013",
        "customerName": "علی احمدی",
        "type": "currency_buy",
        "fromCurrency": "USD",
        "toCurrency": "IRR",
        "amount": 1000,
        "exchangeRate": 500000,
        "totalAmount": 500000000,
        "status": "completed",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "pages": 10
    }
  }
}
```

#### POST /api/transactions
ایجاد تراکنش جدید

**Request Body:**
```json
{
  "customerId": "507f1f77bcf86cd799439013",
  "type": "currency_buy",
  "fromCurrency": "USD",
  "toCurrency": "IRR",
  "amount": 1000,
  "exchangeRate": 500000,
  "paymentMethod": "bank_transfer",
  "deliveryMethod": "bank_transfer",
  "bankDetails": {
    "bankName": "ملت",
    "accountNumber": "1234567890",
    "iban": "IR123456789012345678901234"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "تراکنش با موفقیت ایجاد شد",
  "data": {
    "transaction": {
      "id": "507f1f77bcf86cd799439011",
      "transactionId": "TXN202401010001",
      "status": "pending",
      "totalAmount": 500000000,
      "remainingAmount": 500000000,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### GET /api/transactions/:id
دریافت جزئیات تراکنش

**Response:**
```json
{
  "success": true,
  "message": "جزئیات تراکنش دریافت شد",
  "data": {
    "transaction": {
      "id": "507f1f77bcf86cd799439011",
      "transactionId": "TXN202401010001",
      "customerId": "507f1f77bcf86cd799439013",
      "customerName": "علی احمدی",
      "type": "currency_buy",
      "fromCurrency": "USD",
      "toCurrency": "IRR",
      "amount": 1000,
      "exchangeRate": 500000,
      "totalAmount": 500000000,
      "paidAmount": 500000000,
      "remainingAmount": 0,
      "status": "completed",
      "payments": [
        {
          "paymentId": "507f1f77bcf86cd799439014",
          "amount": 500000000,
          "status": "verified",
          "method": "bank_transfer",
          "date": "2024-01-01T00:00:00.000Z"
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 👥 Customers

#### GET /api/customers
دریافت لیست مشتریان

**Query Parameters:**
- `page`: شماره صفحه
- `limit`: تعداد آیتم در هر صفحه
- `search`: جستجو در نام، ایمیل یا شماره تلفن
- `kyc_status`: فیلتر بر اساس وضعیت KYC

**Response:**
```json
{
  "success": true,
  "message": "مشتریان با موفقیت دریافت شدند",
  "data": {
    "customers": [
      {
        "id": "507f1f77bcf86cd799439013",
        "name": "علی احمدی",
        "email": "ali@example.com",
        "phone": "+989123456789",
        "nationalId": "1234567890",
        "kyc_status": "verified",
        "totalTransactions": 15,
        "totalAmount": 5000000000,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "pages": 5
    }
  }
}
```

#### POST /api/customers
ایجاد مشتری جدید

**Request Body:**
```json
{
  "name": "علی احمدی",
  "email": "ali@example.com",
  "phone": "+989123456789",
  "nationalId": "1234567890",
  "address": "تهران، خیابان ولیعصر",
  "documents": [
    {
      "type": "national_id",
      "filePath": "uploads/documents/national_id_123.pdf"
    }
  ]
}
```

### 🏦 Payments

#### GET /api/payments
دریافت لیست پرداخت‌ها

**Query Parameters:**
- `transactionId`: فیلتر بر اساس تراکنش
- `status`: فیلتر بر اساس وضعیت
- `method`: فیلتر بر اساس روش پرداخت

#### POST /api/payments
ثبت پرداخت جدید

**Request Body:**
```json
{
  "transactionId": "507f1f77bcf86cd799439011",
  "amount": 500000000,
  "method": "bank_transfer",
  "reference": "TR123456789",
  "receipt": {
    "fileName": "receipt.pdf",
    "filePath": "uploads/receipts/receipt_123.pdf"
  }
}
```

### 📊 Reports

#### GET /api/reports/financial
گزارش مالی

**Query Parameters:**
- `fromDate`: تاریخ شروع
- `toDate`: تاریخ پایان
- `type`: نوع گزارش (daily, weekly, monthly)

**Response:**
```json
{
  "success": true,
  "message": "گزارش مالی دریافت شد",
  "data": {
    "summary": {
      "totalTransactions": 150,
      "totalAmount": 75000000000,
      "totalCommission": 750000000,
      "averageTransaction": 500000000
    },
    "byType": [
      {
        "type": "currency_buy",
        "count": 100,
        "amount": 50000000000
      },
      {
        "type": "currency_sell",
        "count": 50,
        "amount": 25000000000
      }
    ],
    "byStatus": [
      {
        "status": "completed",
        "count": 120,
        "amount": 60000000000
      },
      {
        "status": "pending",
        "count": 30,
        "amount": 15000000000
      }
    ]
  }
}
```

#### GET /api/reports/transactions
گزارش تراکنش‌ها

#### GET /api/reports/customers
گزارش مشتریان

### 🏢 Tenants

#### GET /api/tenants
دریافت لیست سازمان‌ها (فقط Super Admin)

#### POST /api/tenants
ایجاد سازمان جدید

**Request Body:**
```json
{
  "name": "صرافی نمونه",
  "domain": "sample-exchange.com",
  "settings": {
    "currency": "IRR",
    "timezone": "Asia/Tehran",
    "language": "fa"
  }
}
```

### 🔧 Settings

#### GET /api/settings
دریافت تنظیمات سازمان

#### PUT /api/settings
بروزرسانی تنظیمات

**Request Body:**
```json
{
  "currency": "IRR",
  "timezone": "Asia/Tehran",
  "language": "fa",
  "exchangeRates": {
    "USD": 500000,
    "EUR": 550000
  },
  "commission": {
    "percentage": 1.5,
    "minimum": 10000
  }
}
```

## کدهای خطا

### HTTP Status Codes

| کد | معنی | توضیح |
|---|---|---|
| 200 | OK | درخواست موفق |
| 201 | Created | منبع جدید ایجاد شد |
| 400 | Bad Request | درخواست نامعتبر |
| 401 | Unauthorized | احراز هویت ناموفق |
| 403 | Forbidden | دسترسی غیرمجاز |
| 404 | Not Found | منبع یافت نشد |
| 422 | Unprocessable Entity | داده‌های ورودی نامعتبر |
| 429 | Too Many Requests | تعداد درخواست‌ها بیش از حد |
| 500 | Internal Server Error | خطای داخلی سرور |

### Error Response Format
```json
{
  "success": false,
  "message": "پیام خطا",
  "code": "ERROR_CODE",
  "details": {
    "field": "توضیح خطا"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### کدهای خطای رایج

| کد | معنی |
|---|---|
| `TENANT_ID_REQUIRED` | شناسه سازمان الزامی است |
| `TENANT_ACCESS_DENIED` | دسترسی به سازمان مجاز نیست |
| `INVALID_CREDENTIALS` | نام کاربری یا رمز عبور اشتباه |
| `TOKEN_EXPIRED` | توکن منقضی شده |
| `INVALID_TOKEN` | توکن نامعتبر |
| `PERMISSION_DENIED` | دسترسی غیرمجاز |
| `RESOURCE_NOT_FOUND` | منبع یافت نشد |
| `VALIDATION_ERROR` | خطای اعتبارسنجی |

## مثال‌های استفاده

### ایجاد تراکنش کامل
```javascript
// 1. ورود کاربر
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { data: { accessToken } } = await loginResponse.json();

// 2. ایجاد تراکنش
const transactionResponse = await fetch('/api/transactions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    customerId: '507f1f77bcf86cd799439013',
    type: 'currency_buy',
    fromCurrency: 'USD',
    toCurrency: 'IRR',
    amount: 1000,
    exchangeRate: 500000,
    paymentMethod: 'bank_transfer'
  })
});

const { data: { transaction } } = await transactionResponse.json();

// 3. ثبت پرداخت
const paymentResponse = await fetch('/api/payments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    transactionId: transaction.id,
    amount: 500000000,
    method: 'bank_transfer',
    reference: 'TR123456789'
  })
});
```

### دریافت گزارش مالی
```javascript
const reportResponse = await fetch('/api/reports/financial?fromDate=2024-01-01&toDate=2024-01-31', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const { data } = await reportResponse.json();
console.log('Total Transactions:', data.summary.totalTransactions);
console.log('Total Amount:', data.summary.totalAmount);
```

## Rate Limiting

### محدودیت‌های درخواست
- **عمومی**: 100 درخواست در 15 دقیقه
- **احراز هویت**: 5 درخواست در 15 دقیقه
- **ایجاد تراکنش**: 50 درخواست در ساعت
- **گزارش‌گیری**: 20 درخواست در ساعت

### Headers پاسخ
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### پاسخ Rate Limit
```json
{
  "success": false,
  "message": "تعداد درخواست‌ها بیش از حد مجاز است",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 900
}
```

## WebSocket Events

### اتصال
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: accessToken
  }
});
```

### Events

#### transaction:created
```javascript
socket.on('transaction:created', (data) => {
  console.log('تراکنش جدید:', data);
});
```

#### transaction:updated
```javascript
socket.on('transaction:updated', (data) => {
  console.log('تراکنش بروزرسانی شد:', data);
});
```

#### payment:received
```javascript
socket.on('payment:received', (data) => {
  console.log('پرداخت جدید:', data);
});
```

#### notification:new
```javascript
socket.on('notification:new', (data) => {
  console.log('اعلان جدید:', data);
});
```

---

**نسخه API**: v1.0.0  
**آخرین بروزرسانی**: 2024  
**توسعه‌دهنده**: Exchange Platform Team 