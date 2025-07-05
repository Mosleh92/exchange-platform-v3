const mongoose = require('mongoose');

const paymentOrderSchema = new mongoose.Schema({
  // شماره دستور پرداخت
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  
  // ارتباط با Tenant
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  
  // نوع دستور پرداخت
  type: {
    type: String,
    enum: [
      'internal',      // داخلی
      'external',      // خارجی
      'salary',        // حقوق
      'commission',    // کمیسیون
      'expense',       // هزینه
      'refund',        // بازگشت
      'other'          // سایر
    ],
    required: true
  },
  
  // اطلاعات مبلغ
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    enum: ['IRR', 'USD', 'EUR', 'AED', 'GBP', 'TRY']
  },
  
  // ذینفع
  beneficiary: {
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['employee', 'partner', 'supplier', 'customer', 'other'],
      required: true
    },
    nationalId: String,
    phone: String,
    email: String,
    address: String
  },
  
  // اطلاعات بانکی
  bankDetails: {
    bankName: String,
    accountNumber: String,
    accountHolder: String,
    iban: String,
    swiftCode: String
  },
  
  // روش پرداخت
  paymentMethod: {
    type: String,
    enum: [
      'cash',              // نقدی
      'bank_transfer',     // انتقال بانکی
      'check',             // چک
      'card',              // کارت
      'crypto',            // ارز دیجیتال
      'other'              // سایر
    ],
    required: true
  },
  
  // علت پرداخت
  purpose: {
    type: String,
    required: true
  },
  
  // اولویت
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // تاریخ‌های مهم
  requestedDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  processedDate: Date,
  completedDate: Date,
  
  // وضعیت دستور پرداخت
  status: {
    type: String,
    enum: [
      'pending',      // در انتظار تأیید
      'approved',     // تأیید شده
      'processing',   // در حال پردازش
      'completed',    // تکمیل شده
      'rejected',     // رد شده
      'cancelled'     // لغو شده
    ],
    default: 'pending'
  },
  
  // تأیید و تصویب
  approval: {
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    notes: String
  },
  
  // اجرا
  execution: {
    executedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    executedAt: Date,
    executionMethod: String,
    referenceNumber: String,
    notes: String
  },
  
  // تاریخچه وضعیت
  statusHistory: [{
    status: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    reason: String,
    notes: String
  }],
  
  // فایل‌های پیوست
  attachments: [{
    fileName: String,
    filePath: String,
    fileSize: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    description: String
  }],
  
  // اطلاعات اضافی
  description: String,
  notes: String,
  
  // متادیتا
  metadata: {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch'
    },
    relatedTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    tags: [String]
  }
}, {
  timestamps: true
});

// Indexes
paymentOrderSchema.index({ orderNumber: 1 });
paymentOrderSchema.index({ tenantId: 1 });
paymentOrderSchema.index({ status: 1 });
paymentOrderSchema.index({ priority: 1 });
paymentOrderSchema.index({ dueDate: 1 });
paymentOrderSchema.index({ 'beneficiary.name': 1 });

// Virtual for days until due
paymentOrderSchema.virtual('daysUntilDue').get(function() {
  const today = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for is overdue
paymentOrderSchema.virtual('isOverdue').get(function() {
  return this.daysUntilDue < 0 && ['pending', 'approved', 'processing'].includes(this.status);
});

// Virtual for is urgent
paymentOrderSchema.virtual('isUrgent').get(function() {
  return this.priority === 'urgent' || this.daysUntilDue <= 1;
});

// Static method to generate order number
paymentOrderSchema.statics.generateOrderNumber = function(_tenantId) { // tenantId marked as unused
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PO${timestamp}${random}`;
};

// Method to approve order
paymentOrderSchema.methods.approve = function(approvedBy, notes = '') {
  this.status = 'approved';
  this.approval.approvedBy = approvedBy;
  this.approval.approvedAt = new Date();
  this.approval.notes = notes;
  
  this.statusHistory.push({
    status: 'approved',
    changedBy: approvedBy,
    changedAt: new Date(),
    reason: notes
  });
  
  return this.save();
};

// Method to start processing
paymentOrderSchema.methods.startProcessing = function(executedBy, notes = '') {
  this.status = 'processing';
  this.execution.executedBy = executedBy;
  this.execution.executedAt = new Date();
  this.execution.notes = notes;
  
  this.statusHistory.push({
    status: 'processing',
    changedBy: executedBy,
    changedAt: new Date(),
    reason: notes
  });
  
  return this.save();
};

// Method to complete order
paymentOrderSchema.methods.complete = function(completedBy, executionData) {
  this.status = 'completed';
  this.completedDate = new Date();
  
  // Update execution details
  this.execution.executionMethod = executionData.method;
  this.execution.referenceNumber = executionData.reference;
  this.execution.notes = executionData.notes;
  
  this.statusHistory.push({
    status: 'completed',
    changedBy: completedBy,
    changedAt: new Date(),
    reason: 'Payment completed'
  });
  
  return this.save();
};

// Method to reject order
paymentOrderSchema.methods.reject = function(rejectedBy, reason = '') {
  this.status = 'rejected';
  
  this.statusHistory.push({
    status: 'rejected',
    changedBy: rejectedBy,
    changedAt: new Date(),
    reason: reason
  });
  
  return this.save();
};

// Method to cancel order
paymentOrderSchema.methods.cancel = function(cancelledBy, reason = '') {
  this.status = 'cancelled';
  
  this.statusHistory.push({
    status: 'cancelled',
    changedBy: cancelledBy,
    changedAt: new Date(),
    reason: reason
  });
  
  return this.save();
};

// Pre-save middleware
paymentOrderSchema.pre('save', function(next) {
  // Generate order number if not provided
  if (!this.orderNumber) {
    this.orderNumber = this.constructor.generateOrderNumber(this.tenantId);
  }
  
  // Set default due date if not provided
  if (!this.dueDate) {
    const due = new Date();
    due.setDate(due.getDate() + 7); // Default to 7 days from now
    this.dueDate = due;
  }
  
  next();
});

module.exports = mongoose.model('PaymentOrder', paymentOrderSchema); 