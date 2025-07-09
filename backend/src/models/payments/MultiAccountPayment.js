// backend/src/models/payments/MultiAccountPayment.js
const mongoose = require('mongoose');

const multiAccountPaymentSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  paymentNumber: {
    type: String,
    required: true,
    unique: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  remainingAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'IRR'
  },
  exchangeRate: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['pending', 'partial', 'completed', 'cancelled'],
    default: 'pending'
  },
  description: {
    type: String,
    required: true
  },
  dueDate: Date,
  paymentAccounts: [{
    accountName: {
      type: String,
      required: true
    },
    accountNumber: {
      type: String,
      required: true
    },
    bankName: String,
    iban: String,
    swiftCode: String,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Auto-increment payment number
multiAccountPaymentSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments({ tenantId: this.tenantId });
    this.paymentNumber = `PAY-${this.tenantId.toString().slice(-6)}-${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

multiAccountPaymentSchema.index({ tenantId: 1, paymentNumber: 1 });
multiAccountPaymentSchema.index({ tenantId: 1, customerId: 1 });
multiAccountPaymentSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model('MultiAccountPayment', multiAccountPaymentSchema);

// backend/src/models/payments/PaymentReceipt.js
const mongoose = require('mongoose');

const paymentReceiptSchema = new mongoose.Schema({
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MultiAccountPayment',
    required: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  receiptNumber: {
    type: String,
    required: true,
    unique: true
  },
  targetAccount: {
    accountName: {
      type: String,
      required: true
    },
    accountNumber: {
      type: String,
      required: true
    },
    bankName: String
  },
  senderInfo: {
    name: {
      type: String,
      required: true
    },
    accountNumber: String,
    bankName: String,
    phone: String
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'IRR'
  },
  paymentDate: {
    type: Date,
    required: true
  },
  receiptImage: {
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String
  },
  trackingNumber: String,
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  notes: String,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  rejectionReason: String,
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Auto-increment receipt number
paymentReceiptSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments({ tenantId: this.tenantId });
    this.receiptNumber = `REC-${this.tenantId.toString().slice(-6)}-${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

paymentReceiptSchema.index({ paymentId: 1 });
paymentReceiptSchema.index({ tenantId: 1, receiptNumber: 1 });
paymentReceiptSchema.index({ tenantId: 1, status: 1 });

module.exports = mongoose.model('PaymentReceipt', paymentReceiptSchema);

// backend/src/controllers/payments/MultiPaymentController.js
const MultiAccountPayment = require('../../models/payments/MultiAccountPayment');
const PaymentReceipt = require('../../models/payments/PaymentReceipt');
const Transaction = require('../../models/accounting/Transaction');
const User = require('../../models/User');
const multer = require('multer');
const path = require('path');

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/receipts/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('فقط فایل‌های تصویری و PDF مجاز هستند'));
    }
  }
});

class MultiPaymentController {
  // ایجاد درخواست پرداخت چندحسابه
  static async createMultiAccountPayment(req, res) {
    try {
      const { 
        customerId, 
        totalAmount, 
        currency, 
        description, 
        dueDate, 
        paymentAccounts,
        transactionId 
      } = req.body;
      
      const tenantId = req.tenant ? req.tenant._id : req.body.tenantId;

      // بررسی وجود مشتری
      const customer = await User.findById(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'مشتری یافت نشد'
        });
      }

      const payment = new MultiAccountPayment({
        tenantId,
        customerId,
