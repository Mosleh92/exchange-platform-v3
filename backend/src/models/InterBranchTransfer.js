const mongoose = require('mongoose');

// ایزولاسیون داده‌ها: tenantId و branchId برای جلوگیری از نشت داده بین صرافی‌ها و شعبه‌ها الزامی است.

const interBranchTransferSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  
  // Transfer details
  transferNumber: {
    type: String,
    required: true,
    unique: true
  },
  
  // Source and destination
  sourceBranchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  destinationBranchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  
  // Amount and currency
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    uppercase: true
  },
  
  // Transfer type
  transferType: {
    type: String,
    enum: ['cash', 'account', 'emergency', 'regular'],
    default: 'regular'
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'approved', 'in_transit', 'completed', 'cancelled', 'rejected'],
    default: 'pending'
  },
  
  // Approval process
  approval: {
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectedAt: Date,
    rejectionReason: String
  },
  
  // Security verification
  security: {
    verificationCode: {
      type: String,
      required: true
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: Date,
    verificationMethod: {
      type: String,
      enum: ['sms', 'email', 'phone', 'in_person'],
      required: true
    }
  },
  
  // Transfer details
  transferDetails: {
    method: {
      type: String,
      enum: ['bank_transfer', 'cash_courier', 'digital_transfer', 'check'],
      required: true
    },
    expectedDelivery: Date,
    actualDelivery: Date,
    trackingNumber: String,
    courierName: String,
    courierContact: String
  },
  
  // Fees and charges
  fees: {
    transferFee: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    description: String
  },
  
  // Recipient information
  recipient: {
    name: String,
    phone: String,
    email: String,
    idNumber: String,
    signature: String
  },
  
  // Notes and comments
  notes: {
    requestNotes: String,
    approvalNotes: String,
    deliveryNotes: String,
    internalNotes: String
  },
  
  // Metadata
  metadata: {
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal'
    },
    tags: [String],
    category: {
      type: String,
      enum: ['operational', 'customer_request', 'emergency', 'maintenance'],
      default: 'operational'
    }
  },
  
  // Audit trail
  audit: {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: Date,
    reason: String
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes
interBranchTransferSchema.index({ tenantId: 1, transferNumber: 1 }, { unique: true });
interBranchTransferSchema.index({ tenantId: 1, sourceBranchId: 1 });
interBranchTransferSchema.index({ tenantId: 1, destinationBranchId: 1 });
interBranchTransferSchema.index({ tenantId: 1, status: 1 });
interBranchTransferSchema.index({ tenantId: 1, 'approval.requestedAt': 1 });

// Static method to generate transfer number
interBranchTransferSchema.statics.generateTransferNumber = function(tenantId) {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TFR${timestamp}${random}`;
};

// Static method to generate verification code
interBranchTransferSchema.statics.generateVerificationCode = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Static method to get pending transfers
interBranchTransferSchema.statics.getPendingTransfers = function(tenantId, branchId = null) {
  const query = {
    tenantId,
    status: 'pending'
  };
  
  if (branchId) {
    query.$or = [
      { sourceBranchId: branchId },
      { destinationBranchId: branchId }
    ];
  }
  
  return this.find(query)
    .populate('sourceBranchId', 'name code')
    .populate('destinationBranchId', 'name code')
    .populate('approval.requestedBy', 'name email')
    .sort({ 'approval.requestedAt': 1 });
};

// Static method to get transfers by status
interBranchTransferSchema.statics.getTransfersByStatus = function(tenantId, status, branchId = null) {
  const query = {
    tenantId,
    status
  };
  
  if (branchId) {
    query.$or = [
      { sourceBranchId: branchId },
      { destinationBranchId: branchId }
    ];
  }
  
  return this.find(query)
    .populate('sourceBranchId', 'name code')
    .populate('destinationBranchId', 'name code')
    .populate('approval.requestedBy', 'name email')
    .populate('approval.approvedBy', 'name email')
    .sort({ created_at: -1 });
};

// Method to approve transfer
interBranchTransferSchema.methods.approveTransfer = function(approvedBy, notes = '') {
  if (this.status !== 'pending') {
    throw new Error('Transfer is not in pending status');
  }
  
  this.status = 'approved';
  this.approval.approvedBy = approvedBy;
  this.approval.approvedAt = new Date();
  this.notes.approvalNotes = notes;
  
  return this.save();
};

// Method to reject transfer
interBranchTransferSchema.methods.rejectTransfer = function(rejectedBy, reason) {
  if (this.status !== 'pending') {
    throw new Error('Transfer is not in pending status');
  }
  
  this.status = 'rejected';
  this.approval.rejectedBy = rejectedBy;
  this.approval.rejectedAt = new Date();
  this.approval.rejectionReason = reason;
  
  return this.save();
};

// Method to verify transfer
interBranchTransferSchema.methods.verifyTransfer = function(verificationCode, verifiedBy) {
  if (this.security.verificationCode !== verificationCode) {
    throw new Error('Invalid verification code');
  }
  
  if (this.status !== 'approved') {
    throw new Error('Transfer must be approved before verification');
  }
  
  this.status = 'in_transit';
  this.security.verifiedBy = verifiedBy;
  this.security.verifiedAt = new Date();
  
  return this.save();
};

// Method to complete transfer
interBranchTransferSchema.methods.completeTransfer = function(recipientInfo = {}) {
  if (this.status !== 'in_transit') {
    throw new Error('Transfer must be in transit to complete');
  }
  
  this.status = 'completed';
  this.transferDetails.actualDelivery = new Date();
  this.recipient = { ...this.recipient, ...recipientInfo };
  
  return this.save();
};

// Method to cancel transfer
interBranchTransferSchema.methods.cancelTransfer = function(cancelledBy, reason) {
  if (!['pending', 'approved'].includes(this.status)) {
    throw new Error('Transfer cannot be cancelled in current status');
  }
  
  this.status = 'cancelled';
  this.audit.cancelledBy = cancelledBy;
  this.audit.cancelledAt = new Date();
  this.audit.reason = reason;
  
  return this.save();
};

// Virtual for transfer duration
interBranchTransferSchema.virtual('transferDuration').get(function() {
  if (this.status === 'completed' && this.transferDetails.actualDelivery) {
    const start = new Date(this.approval.requestedAt);
    const end = new Date(this.transferDetails.actualDelivery);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Pre-save middleware to set transfer number
interBranchTransferSchema.pre('save', function(next) {
  if (this.isNew && !this.transferNumber) {
    this.transferNumber = this.constructor.generateTransferNumber(this.tenantId);
  }
  
  if (this.isNew && !this.security.verificationCode) {
    this.security.verificationCode = this.constructor.generateVerificationCode();
  }
  
  next();
});

module.exports = mongoose.model('InterBranchTransfer', interBranchTransferSchema); 