# راهنمای کامل نصب و راه‌اندازی Production

## 🚀 مراحل کامل برای آماده‌سازی سیستم

### مرحله 1: تکمیل کدهای ناقص

#### فایل‌های مورد نیاز که باید اضافه شوند:

```
backend/src/
├── app.js                    # Main application file
├── config/
│   ├── database.js           # Database configuration
│   ├── redis.js              # Redis configuration
│   └── auth.js               # Authentication config
├── middleware/
│   ├── authMiddleware.js     # JWT authentication
│   ├── tenantMiddleware.js   # Multi-tenant middleware
│   ├── errorHandler.js       # Error handling
│   └── validation.js         # Input validation
├── routes/
│   ├── index.js              # Main routes
│   ├── auth.js               # Authentication routes
│   ├── tenants.js            # Tenant management
│   ├── accounting.js         # Accounting routes
│   ├── payments.js           # Payment routes
│   └── p2p.js                # P2P marketplace routes
├── services/
│   ├── emailService.js       # Email notifications
│   ├── smsService.js         # SMS notifications
│   └── currencyService.js    # Currency rates
└── utils/
    ├── logger.js             # Logging utility
    ├── helpers.js            # Helper functions
    └── constants.js          # Application constants
```

### مرحله 2: P2P Marketplace System

```javascript
// backend/src/models/p2p/P2PAnnouncement.js
const mongoose = require('mongoose');

const p2pAnnouncementSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['buy', 'sell'],
    required: true
  },
  fromCurrency: {
    type: String,
    required: true,
    uppercase: true
  },
  toCurrency: {
    type: String,
    required: true,
    uppercase: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  minAmount: {
    type: Number,
    default: 0
  },
  maxAmount: {
    type: Number,
    required: true
  },
  location: {
    city: String,
    country: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  paymentMethods: [{
    type: String,
    enum: ['cash', 'bank_transfer', 'online_payment', 'crypto']
  }],
  description: String,
  terms: String,
  status: {
    type: String,
    enum: ['active', 'inactive', 'completed', 'cancelled'],
    default: 'active'
  },
  validUntil: Date,
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  isPublic: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

p2pAnnouncementSchema.index({ tenantId: 1, status: 1 });
p2pAnnouncementSchema.index({ fromCurrency: 1, toCurrency: 1 });
p2pAnnouncementSchema.index({ userId: 1 });
p2pAnnouncementSchema.index({ 'location.city': 1 });

module.exports = mongoose.model('P2PAnnouncement', p2pAnnouncementSchema);
```

### مرحله 3: Remittance System

```javascript
// backend/src/models/remittance/Remittance.js
const mongoose = require('mongoose');

const remittanceSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  remittanceNumber: {
    type: String,
    required: true,
    unique: true
  },
  sender: {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    nationalId: String,
    address: String
  },
  receiver: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    nationalId: String,
    address: String,
    bankAccount: {
      accountNumber: String,
      iban: String,
      bankName: String,
      swiftCode: String
    }
  },
  amount: {
    sent: { type: Number, required: true },
    received: { type: Number, required: true },
    sentCurrency: { type: String, required: true },
    receivedCurrency: { type: String, required: true },
    exchangeRate: { type: Number, required: true }
  },
  fees: {
    serviceFee: { type: Number, default: 0 },
    commissionRate: { type: Number, default: 0 },
    totalFees: { type: Number, default: 0 }
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'sent', 'delivered', 'cancelled', 'failed'],
    default: 'pending'
  },
  deliveryMethod: {
    type: String,
    enum: ['bank_transfer', 'cash_pickup', 'mobile_wallet', 'home_delivery'],
    required: true
  },
  tracking: {
    trackingNumber: String,
    estimatedDelivery: Date,
    actualDelivery: Date,
    notes: String
  },
  partnerInfo: {
    partnerId: String,
    partnerName: String,
    partnerTransactionId: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Auto-increment remittance number
remittanceSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments({ tenantId: this.tenantId });
    this.remittanceNumber = `REM-${this.tenantId.toString().slice(-6)}-${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Remittance', remittanceSchema);
```

### مرحله 4: Email & SMS Services

```javascript
// backend/src/services/emailService.js
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendWelcomeEmail(user, tenant) {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: user.email,
      subject: `خوش آمدید به ${tenant.name}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif;">
          <h2>خوش آمدید ${user.profile.firstName}!</h2>
          <p>حساب کاربری شما در ${tenant.name} با موفقیت ایجاد شد.</p>
          <p>اطلاعات ورود:</p>
          <ul>
            <li>ایمیل: ${user.email}</li>
            <li>نقش: ${this.getRoleDisplayName(user.role)}</li>
          </ul>
          <p>لطفاً رمز عبور خود را تغییر دهید.</p>
        </div>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendPaymentConfirmation(payment, user) {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: user.email,
      subject: 'تأیید پرداخت',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif;">
          <h2>تأیید پرداخت</h
