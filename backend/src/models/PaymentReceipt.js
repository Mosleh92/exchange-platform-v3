const mongoose = require('mongoose');

/**
 * Payment Receipt Schema
 * Stores multi-stage payment receipt information with file attachments
 */
const PaymentReceiptSchema = new mongoose.Schema({
  // Deal reference
  dealId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deal',
    required: true,
    index: true
  },
  
  // Account index for multi-stage payments
  accountIndex: {
    type: Number,
    required: true,
    default: 0
  },
  
  // Payment details
  receiverName: {
    type: String,
    required: true,
    trim: true
  },
  
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  currency: {
    type: String,
    required: true,
    enum: ['IRR', 'USD', 'EUR', 'GBP', 'AED', 'CAD', 'AUD'],
    default: 'IRR'
  },
  
  // Account information
  accountDetails: {
    accountNumber: String,
    bankName: String,
    iban: String,
    swiftCode: String,
    routingNumber: String,
    branchCode: String
  },
  
  // Receipt files
  files: [{
    originalName: {
      type: String,
      required: true
    },
    filename: {
      type: String,
      required: true
    },
    path: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    thumbnail: String, // Path to thumbnail for images
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    verified: {
      type: Boolean,
      default: false
    },
    verificationNotes: String
  }],
  
  // Status tracking
  status: {
    type: String,
    enum: [
      'pending_verification',
      'under_review',
      'verified',
      'rejected',
      'requires_clarification'
    ],
    default: 'pending_verification',
    index: true
  },
  
  // Verification details
  verificationDetails: {
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: Date,
    approved: Boolean,
    comments: String,
    verificationLevel: {
      type: String,
      enum: ['manual', 'automatic', 'ai_assisted'],
      default: 'manual'
    },
    confidence: Number, // For AI-assisted verification (0-100)
    flags: [String] // Any flags raised during verification
  },
  
  // Submission details
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  submittedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Additional notes
  notes: String,
  
  // Processing metadata
  metadata: {
    ip: String,
    userAgent: String,
    sessionId: String,
    deviceInfo: String,
    processingTime: Number, // Time taken to process in milliseconds
    automaticChecks: {
      duplicateCheck: Boolean,
      amountValidation: Boolean,
      fileIntegrity: Boolean,
      ocrExtraction: String // Extracted text from receipt
    }
  },
  
  // Audit trail
  auditTrail: [{
    action: {
      type: String,
      enum: [
        'submitted', 'reviewed', 'verified', 'rejected', 
        'resubmitted', 'flagged', 'clarification_requested'
      ]
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: String,
    oldValues: mongoose.Schema.Types.Mixed,
    newValues: mongoose.Schema.Types.Mixed
  }],
  
  // Notification settings
  notifications: {
    emailSent: {
      type: Boolean,
      default: false
    },
    smsSent: {
      type: Boolean,
      default: false
    },
    pushSent: {
      type: Boolean,
      default: false
    },
    lastNotificationAt: Date
  },
  
  // Integration data
  integrationData: {
    bankVerification: {
      verified: Boolean,
      verificationId: String,
      verifiedAt: Date,
      bankResponse: mongoose.Schema.Types.Mixed
    },
    externalReferences: [{
      system: String,
      referenceId: String,
      data: mongoose.Schema.Types.Mixed
    }]
  },
  
  // Expiry and retention
  expiresAt: Date,
  retentionPolicy: {
    type: String,
    enum: ['standard', 'extended', 'permanent'],
    default: 'standard'
  }
}, {
  timestamps: true,
  collection: 'payment_receipts'
});

// Indexes for performance
PaymentReceiptSchema.index({ dealId: 1, accountIndex: 1 });
PaymentReceiptSchema.index({ submittedBy: 1, submittedAt: -1 });
PaymentReceiptSchema.index({ status: 1, submittedAt: -1 });
PaymentReceiptSchema.index({ 'verificationDetails.verifiedBy': 1, 'verificationDetails.verifiedAt': -1 });

// Compound indexes
PaymentReceiptSchema.index({ 
  dealId: 1, 
  status: 1, 
  submittedAt: -1 
});

PaymentReceiptSchema.index({ 
  submittedBy: 1, 
  currency: 1, 
  amount: 1 
});

// TTL index for automatic cleanup of expired receipts
PaymentReceiptSchema.index({ 
  expiresAt: 1 
}, { 
  expireAfterSeconds: 0 
});

// Virtual properties
PaymentReceiptSchema.virtual('totalFileSize').get(function() {
  return this.files.reduce((total, file) => total + file.size, 0);
});

PaymentReceiptSchema.virtual('fileCount').get(function() {
  return this.files.length;
});

PaymentReceiptSchema.virtual('verifiedFileCount').get(function() {
  return this.files.filter(file => file.verified).length;
});

PaymentReceiptSchema.virtual('isFullyVerified').get(function() {
  return this.status === 'verified' && 
         this.files.length > 0 && 
         this.files.every(file => file.verified);
});

PaymentReceiptSchema.virtual('daysSinceSubmission').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.submittedAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Instance methods
PaymentReceiptSchema.methods.addAuditEntry = function(action, performedBy, details = '', oldValues = null, newValues = null) {
  this.auditTrail.push({
    action,
    performedBy,
    details,
    oldValues,
    newValues,
    timestamp: new Date()
  });
  return this.save();
};

PaymentReceiptSchema.methods.updateStatus = function(newStatus, verificationDetails = null) {
  const oldStatus = this.status;
  this.status = newStatus;
  
  if (verificationDetails) {
    this.verificationDetails = { ...this.verificationDetails, ...verificationDetails };
  }
  
  // Add audit entry
  this.auditTrail.push({
    action: newStatus === 'verified' ? 'verified' : 'reviewed',
    performedBy: verificationDetails?.verifiedBy,
    details: verificationDetails?.comments || '',
    oldValues: { status: oldStatus },
    newValues: { status: newStatus },
    timestamp: new Date()
  });
  
  return this.save();
};

PaymentReceiptSchema.methods.markFileAsVerified = function(fileIndex, verificationNotes = '') {
  if (this.files[fileIndex]) {
    this.files[fileIndex].verified = true;
    this.files[fileIndex].verificationNotes = verificationNotes;
  }
  return this.save();
};

PaymentReceiptSchema.methods.setExpiry = function(days = 30) {
  this.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return this.save();
};

PaymentReceiptSchema.methods.sendNotification = function(type = 'email') {
  this.notifications[`${type}Sent`] = true;
  this.notifications.lastNotificationAt = new Date();
  return this.save();
};

// Static methods
PaymentReceiptSchema.statics.getReceiptsByDeal = function(dealId, status = null) {
  const query = { dealId };
  if (status) query.status = status;
  
  return this.find(query)
    .populate('submittedBy', 'firstName lastName email')
    .populate('verificationDetails.verifiedBy', 'firstName lastName email')
    .sort({ accountIndex: 1, submittedAt: -1 });
};

PaymentReceiptSchema.statics.getReceiptStatistics = function(filters = {}) {
  const matchStage = {};
  
  if (filters.startDate || filters.endDate) {
    matchStage.submittedAt = {};
    if (filters.startDate) matchStage.submittedAt.$gte = new Date(filters.startDate);
    if (filters.endDate) matchStage.submittedAt.$lte = new Date(filters.endDate);
  }
  
  if (filters.dealId) matchStage.dealId = mongoose.Types.ObjectId(filters.dealId);
  if (filters.submittedBy) matchStage.submittedBy = mongoose.Types.ObjectId(filters.submittedBy);
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalReceipts: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        averageAmount: { $avg: '$amount' },
        statusBreakdown: {
          $push: '$status'
        },
        currencyBreakdown: {
          $push: '$currency'
        }
      }
    },
    {
      $project: {
        totalReceipts: 1,
        totalAmount: 1,
        averageAmount: 1,
        statusCounts: {
          $arrayToObject: {
            $map: {
              input: { $setUnion: '$statusBreakdown' },
              as: 'status',
              in: {
                k: '$$status',
                v: {
                  $size: {
                    $filter: {
                      input: '$statusBreakdown',
                      cond: { $eq: ['$$this', '$$status'] }
                    }
                  }
                }
              }
            }
          }
        },
        currencyCounts: {
          $arrayToObject: {
            $map: {
              input: { $setUnion: '$currencyBreakdown' },
              as: 'currency',
              in: {
                k: '$$currency',
                v: {
                  $size: {
                    $filter: {
                      input: '$currencyBreakdown',
                      cond: { $eq: ['$$this', '$$currency'] }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  ]);
};

// Pre-save middleware
PaymentReceiptSchema.pre('save', function(next) {
  // Set expiry if not set
  if (!this.expiresAt && this.retentionPolicy === 'standard') {
    this.setExpiry(30); // 30 days for standard retention
  } else if (!this.expiresAt && this.retentionPolicy === 'extended') {
    this.setExpiry(365); // 1 year for extended retention
  }
  
  // Add initial audit entry for new receipts
  if (this.isNew) {
    this.auditTrail.push({
      action: 'submitted',
      performedBy: this.submittedBy,
      details: 'Receipt submitted for verification',
      timestamp: new Date()
    });
  }
  
  next();
});

// Post-save middleware
PaymentReceiptSchema.post('save', function(doc) {
  // Emit events for real-time updates
  if (doc.status === 'verified') {
    process.nextTick(() => {
      const logger = require('../utils/logger');
      logger.info('Payment receipt verified', {
        receiptId: doc._id,
        dealId: doc.dealId,
        amount: doc.amount,
        currency: doc.currency
      });
    });
  }
});

module.exports = mongoose.model('PaymentReceipt', PaymentReceiptSchema);