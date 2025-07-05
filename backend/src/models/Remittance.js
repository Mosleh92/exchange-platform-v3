const mongoose = require('mongoose');

// ایزولاسیون داده‌ها: tenantId و branchId برای جلوگیری از نشت داده بین صرافی‌ها و شعبه‌ها الزامی است.

const remittanceSchema = new mongoose.Schema({
  remittanceId: {
    type: String,
    required: true,
    unique: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  senderBranchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  receiverBranchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: [
      'inter_branch',     // بین شعبه‌ای
      'international',    // بین‌المللی
      'domestic',         // داخلی
      'crypto'           // ارز دیجیتال
    ],
    required: true
  },
  status: {
    type: String,
    enum: [
      'pending',          // در انتظار تأیید
      'approved',         // تأیید شده
      'processing',       // در حال پردازش
      'received',         // دریافت شده در شعبه مقصد
      'completed',        // تکمیل شده
      'cancelled',        // لغو شده
      'failed',           // ناموفق
      'refunded'          // بازگشت شده
    ],
    default: 'pending'
  },
  fromCurrency: {
    type: String,
    required: true
  },
  toCurrency: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  exchangeRate: {
    type: Number,
    required: true,
    min: 0
  },
  convertedAmount: {
    type: Number,
    required: true,
    min: 0
  },
  commission: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  // اطلاعات گیرنده
  receiverInfo: {
    name: { type: String, required: true },
    phone: String,
    email: String,
    nationalId: String,
    passportNumber: String,
    address: {
      country: String,
      city: String,
      street: String,
      postalCode: String
    },
    bankInfo: {
      bankName: String,
      accountNumber: String,
      iban: String,
      swiftCode: String
    }
  },
  // اطلاعات ارسال
  deliveryInfo: {
    method: {
      type: String,
      enum: [
        'bank_transfer',     // انتقال بانکی
        'cash_pickup',       // دریافت نقدی
        'home_delivery',     // تحویل در محل
        'crypto_wallet'      // کیف پول ارز دیجیتال
      ],
      required: true
    },
    pickupLocation: {
      name: String,
      address: String,
      phone: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    expectedDelivery: Date,
    actualDelivery: Date,
    deliveryCode: String
  },
  // اطلاعات امنیتی
  security: {
    pinCode: String,
    secretQuestion: String,
    secretAnswer: String,
    idVerification: {
      documentType: String,
      documentNumber: String,
      documentImage: String
    }
  },
  // تأییدات
  approvals: [{
    level: { type: Number, required: true },
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    notes: String
  }],
  // پرداخت‌ها
  payments: [{
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    reference: String,
    receipt: String,
    paidAt: { type: Date, default: Date.now },
    verified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date
  }],
  // مستندات
  documents: [{
    type: String,
    name: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  // یادداشت‌ها
  notes: {
    sender: String,
    receiver: String,
    staff: String,
    system: String
  },
  // متادیتا
  metadata: {
    ipAddress: String,
    userAgent: String,
    location: {
      country: String,
      city: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    }
  },
  // حسابرسی
  audit: {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    processedAt: Date,
    deliveredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deliveredAt: Date,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: Date,
    reason: String
  },
  secretCode: { type: String, unique: true, sparse: true }, // کد رمز حواله
  qrCode: { type: String }, // تصویر QR base64
  expiresAt: { type: Date }, // تاریخ انقضا حواله
  redeemedAt: { type: Date }, // زمان برداشت حواله
  statusHistory: [{
    status: { type: String, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
    note: String
  }],
}, {
  timestamps: true
});

// Indexes
remittanceSchema.index({ remittanceId: 1 });
remittanceSchema.index({ tenantId: 1 });
remittanceSchema.index({ senderId: 1 });
remittanceSchema.index({ receiverId: 1 });
remittanceSchema.index({ type: 1 });
remittanceSchema.index({ status: 1 });
remittanceSchema.index({ createdAt: -1 });
remittanceSchema.index({ 'receiverInfo.phone': 1 });
remittanceSchema.index({ 'deliveryInfo.deliveryCode': 1 });

// Virtual for isCompleted
remittanceSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

// Virtual for isPending
remittanceSchema.virtual('isPending').get(function() {
  return this.status === 'pending';
});

// Virtual for isApproved
remittanceSchema.virtual('isApproved').get(function() {
  return this.status === 'approved';
});

// Static method to generate remittance ID
remittanceSchema.statics.generateRemittanceId = function() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `REM${timestamp}${random}`;
};

// Method to add approval
remittanceSchema.methods.addApproval = function(level, approverId, notes = '') {
  this.approvals.push({
    level,
    approverId,
    approvedAt: new Date(),
    status: 'approved',
    notes
  });
  
  // Check if all required approvals are done
  const requiredLevels = this.type === 'international' ? 2 : 1;
  const approvedLevels = this.approvals
    .filter(a => a.status === 'approved')
    .map(a => a.level);
  
  if (approvedLevels.length >= requiredLevels) {
    this.status = 'approved';
  }
  
  return this.save();
};

// Method to process remittance
remittanceSchema.methods.process = function(processedBy) {
  if (this.status !== 'approved') {
    throw new Error('حواله باید تأیید شده باشد');
  }
  
  this.status = 'processing';
  this.audit.processedBy = processedBy;
  this.audit.processedAt = new Date();
  
  return this.save();
};

// Method to complete remittance
remittanceSchema.methods.complete = function(deliveredBy) {
  if (this.status !== 'processing') {
    throw new Error('حواله باید در حال پردازش باشد');
  }
  
  this.status = 'completed';
  this.audit.deliveredBy = deliveredBy;
  this.audit.deliveredAt = new Date();
  this.deliveryInfo.actualDelivery = new Date();
  
  return this.save();
};

// Method to cancel remittance
remittanceSchema.methods.cancel = function(reason, cancelledBy) {
  if (['completed', 'delivered'].includes(this.status)) {
    throw new Error('حواله تکمیل شده قابل لغو نیست');
  }
  
  this.status = 'cancelled';
  this.audit.cancelledBy = cancelledBy;
  this.audit.cancelledAt = new Date();
  this.audit.reason = reason;
  
  return this.save();
};

// Method to add payment
remittanceSchema.methods.addPayment = function(paymentData) {
  this.payments.push(paymentData);
  return this.save();
};

// Method to verify payment
remittanceSchema.methods.verifyPayment = function(paymentIndex, verifiedBy) {
  if (paymentIndex >= 0 && paymentIndex < this.payments.length) {
    this.payments[paymentIndex].verified = true;
    this.payments[paymentIndex].verifiedBy = verifiedBy;
    this.payments[paymentIndex].verifiedAt = new Date();
    return this.save();
  }
  throw new Error('پرداخت یافت نشد');
};

// Static method to get remittance statistics
remittanceSchema.statics.getStats = async function(tenantId, filters = {}) {
  const matchStage = { tenantId, ...filters };
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRemittances: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        totalCommission: { $sum: '$commission' },
        byStatus: {
          $push: {
            status: '$status',
            amount: '$totalAmount'
          }
        },
        byType: {
          $push: {
            type: '$type',
            amount: '$totalAmount'
          }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalRemittances: 0,
    totalAmount: 0,
    totalCommission: 0,
    byStatus: [],
    byType: []
  };
};

module.exports = mongoose.model('Remittance', remittanceSchema); 