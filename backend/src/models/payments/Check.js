const mongoose = require('mongoose');

/**
 * Check Payment Model
 * Handles check-based payments with proper validation and tracking
 */
const checkSchema = new mongoose.Schema({
  // Tenant isolation
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },

  // Check identification
  checkNumber: {
    type: String,
    required: true,
    unique: true
  },

  // Transaction reference
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true,
    index: true
  },

  // Check details
  bankName: {
    type: String,
    required: true,
    maxlength: 100
  },

  accountNumber: {
    type: String,
    required: true,
    maxlength: 50
  },

  checkAmount: {
    type: Number,
    required: true,
    min: 0
  },

  currency: {
    type: String,
    required: true,
    default: 'IRR'
  },

  issueDate: {
    type: Date,
    required: true
  },

  dueDate: {
    type: Date,
    required: true
  },

  // Check status
  status: {
    type: String,
    enum: [
      'pending',      // در انتظار تایید
      'approved',     // تایید شده
      'cleared',      // وصول شده
      'bounced',      // برگشت خورده
      'cancelled',    // لغو شده
      'expired'       // منقضی شده
    ],
    default: 'pending'
  },

  // Check verification
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  verifiedAt: Date,

  verificationNotes: {
    type: String,
    maxlength: 500
  },

  // Check images/documents
  checkImages: [{
    filePath: String,
    fileName: String,
    fileSize: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    description: String
  }],

  // Bank processing details
  bankProcessing: {
    processingDate: Date,
    clearingDate: Date,
    bankReference: String,
    processingNotes: String
  },

  // Risk assessment
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },

  riskFactors: [{
    factor: String,
    description: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high']
    }
  }],

  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
checkSchema.index({ tenantId: 1, status: 1 });
checkSchema.index({ tenantId: 1, issueDate: -1 });
checkSchema.index({ tenantId: 1, dueDate: 1 });
checkSchema.index({ checkNumber: 1 }, { unique: true });
checkSchema.index({ transactionId: 1 });

// Pre-save validation
checkSchema.pre('save', function(next) {
  // Validate check dates
  if (this.issueDate && this.dueDate && this.issueDate > this.dueDate) {
    return next(new Error('Issue date cannot be after due date'));
  }

  // Validate check amount
  if (this.checkAmount <= 0) {
    return next(new Error('Check amount must be greater than zero'));
  }

  // Generate check number if not provided
  if (!this.checkNumber) {
    this.checkNumber = this.generateCheckNumber();
  }

  next();
});

// Instance methods
checkSchema.methods.generateCheckNumber = function() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  return `CHK-${year}${month}-${timestamp}`;
};

checkSchema.methods.verify = async function(userId, notes) {
  if (this.status !== 'pending') {
    throw new Error('Only pending checks can be verified');
  }

  this.status = 'approved';
  this.verifiedBy = userId;
  this.verifiedAt = new Date();
  this.verificationNotes = notes;

  return this.save();
};

checkSchema.methods.clear = async function(clearingDate, bankReference) {
  if (this.status !== 'approved') {
    throw new Error('Only approved checks can be cleared');
  }

  this.status = 'cleared';
  this.bankProcessing = {
    clearingDate: clearingDate || new Date(),
    bankReference: bankReference
  };

  return this.save();
};

checkSchema.methods.bounce = async function(reason) {
  if (!['pending', 'approved'].includes(this.status)) {
    throw new Error('Only pending or approved checks can be bounced');
  }

  this.status = 'bounced';
  this.verificationNotes = `Bounced: ${reason}`;

  return this.save();
};

// Static methods
checkSchema.statics.findByStatus = function(tenantId, status) {
  return this.find({ tenantId, status }).sort({ createdAt: -1 });
};

checkSchema.statics.findExpiredChecks = function(tenantId) {
  return this.find({
    tenantId,
    dueDate: { $lt: new Date() },
    status: { $in: ['pending', 'approved'] }
  });
};

checkSchema.statics.getCheckSummary = async function(tenantId) {
  const summary = await this.aggregate([
    { $match: { tenantId: mongoose.Types.ObjectId(tenantId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$checkAmount' }
      }
    }
  ]);

  return summary;
};

module.exports = mongoose.model('Check', checkSchema); 