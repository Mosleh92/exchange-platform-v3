const mongoose = require('mongoose');

const kycVerificationSchema = new mongoose.Schema({
  // User and tenant information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },

  // KYC Level
  kycLevel: {
    type: String,
    enum: ['BASIC', 'ENHANCED', 'INSTITUTIONAL'],
    default: 'BASIC'
  },

  // Personal Information
  personalInfo: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    middleName: String,
    dateOfBirth: { type: Date, required: true },
    placeOfBirth: String,
    nationality: { type: String, required: true },
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'] },
    maritalStatus: { type: String, enum: ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'] }
  },

  // Contact Information
  contactInfo: {
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    alternatePhone: String,
    preferredContactMethod: { type: String, enum: ['EMAIL', 'PHONE', 'SMS'], default: 'EMAIL' }
  },

  // Address Information
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    postalCode: { type: String, required: true },
    addressType: { type: String, enum: ['RESIDENTIAL', 'BUSINESS'], default: 'RESIDENTIAL' }
  },

  // Identity Document Information
  identityDocuments: [{
    documentType: {
      type: String,
      enum: ['PASSPORT', 'NATIONAL_ID', 'DRIVERS_LICENSE', 'VOTER_ID'],
      required: true
    },
    documentNumber: { type: String, required: true },
    issuingCountry: { type: String, required: true },
    issuingAuthority: String,
    issueDate: Date,
    expiryDate: Date,
    documentImageUrl: String,
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED'],
      default: 'PENDING'
    }
  }],

  // Financial Information
  financialInfo: {
    employmentStatus: {
      type: String,
      enum: ['EMPLOYED', 'SELF_EMPLOYED', 'UNEMPLOYED', 'RETIRED', 'STUDENT']
    },
    employer: String,
    jobTitle: String,
    annualIncome: Number,
    sourceOfFunds: {
      type: String,
      enum: ['SALARY', 'BUSINESS', 'INVESTMENT', 'INHERITANCE', 'GIFT', 'OTHER']
    },
    purposeOfAccount: {
      type: String,
      enum: ['TRADING', 'INVESTMENT', 'REMITTANCE', 'BUSINESS', 'PERSONAL']
    },
    expectedMonthlyVolume: Number,
    bankAccount: {
      accountNumber: String,
      bankName: String,
      swiftCode: String,
      iban: String
    }
  },

  // Risk Assessment
  riskAssessment: {
    riskScore: { type: Number, min: 0, max: 100, default: 0 },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'],
      default: 'LOW'
    },
    riskFactors: [String],
    pepStatus: {
      type: String,
      enum: ['NOT_PEP', 'PEP', 'RELATIVE_OF_PEP', 'CLOSE_ASSOCIATE'],
      default: 'NOT_PEP'
    },
    sanctionsStatus: {
      type: String,
      enum: ['CLEAR', 'POTENTIAL_MATCH', 'CONFIRMED_MATCH'],
      default: 'CLEAR'
    },
    adverseMediaCheck: {
      status: { type: String, enum: ['CLEAR', 'POTENTIAL_MATCH', 'CONFIRMED_MATCH'], default: 'CLEAR' },
      lastChecked: Date
    }
  },

  // Verification Results
  verificationResults: {
    identityVerification: {
      status: { type: String, enum: ['PENDING', 'PASSED', 'FAILED'], default: 'PENDING' },
      method: String,
      confidence: Number,
      provider: String,
      verifiedAt: Date,
      notes: String
    },
    addressVerification: {
      status: { type: String, enum: ['PENDING', 'PASSED', 'FAILED'], default: 'PENDING' },
      method: String,
      confidence: Number,
      provider: String,
      verifiedAt: Date,
      notes: String
    },
    documentVerification: {
      status: { type: String, enum: ['PENDING', 'PASSED', 'FAILED'], default: 'PENDING' },
      method: String,
      confidence: Number,
      provider: String,
      verifiedAt: Date,
      notes: String
    },
    livenessCheck: {
      status: { type: String, enum: ['PENDING', 'PASSED', 'FAILED'], default: 'PENDING' },
      method: String,
      confidence: Number,
      provider: String,
      verifiedAt: Date,
      notes: String
    }
  },

  // Overall KYC Status
  status: {
    type: String,
    enum: ['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED', 'SUSPENDED'],
    default: 'PENDING',
    index: true
  },

  // Review Information
  reviewInfo: {
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewNotes: String,
    rejectionReason: String,
    requiredActions: [String]
  },

  // Compliance Information
  complianceInfo: {
    termsAccepted: { type: Boolean, default: false },
    termsAcceptedAt: Date,
    privacyPolicyAccepted: { type: Boolean, default: false },
    privacyPolicyAcceptedAt: Date,
    marketingConsent: { type: Boolean, default: false },
    dataRetentionConsent: { type: Boolean, default: false }
  },

  // External Service Information
  externalServices: {
    jumioReference: String,
    onfidoApplicantId: String,
    truliooTransactionId: String,
    thomsonReutersReference: String
  },

  // Audit Trail
  auditTrail: [{
    action: String,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String
  }],

  // Metadata
  metadata: {
    applicationSource: String,
    referralCode: String,
    campaignId: String,
    deviceFingerprint: String,
    ipAddress: String,
    userAgent: String
  },

  // Timestamps
  submittedAt: { type: Date, default: Date.now },
  lastUpdatedAt: { type: Date, default: Date.now },
  approvedAt: Date,
  rejectedAt: Date,
  expiresAt: Date
}, {
  timestamps: true
});

// Indexes for performance
kycVerificationSchema.index({ userId: 1, status: 1 });
kycVerificationSchema.index({ tenantId: 1, status: 1 });
kycVerificationSchema.index({ 'riskAssessment.riskLevel': 1 });
kycVerificationSchema.index({ 'personalInfo.nationality': 1 });
kycVerificationSchema.index({ submittedAt: -1 });
kycVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes
kycVerificationSchema.index({ 
  tenantId: 1, 
  status: 1, 
  'riskAssessment.riskLevel': 1 
});

// Pre-save middleware
kycVerificationSchema.pre('save', function(next) {
  this.lastUpdatedAt = new Date();
  
  // Set expiry date for pending applications (30 days)
  if (this.status === 'PENDING' && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  
  // Clear expiry date for approved applications
  if (this.status === 'APPROVED') {
    this.expiresAt = undefined;
    this.approvedAt = new Date();
  }
  
  // Set rejection date
  if (this.status === 'REJECTED' && !this.rejectedAt) {
    this.rejectedAt = new Date();
  }
  
  next();
});

// Instance methods
kycVerificationSchema.methods.isExpired = function() {
  return this.expiresAt && new Date() > this.expiresAt;
};

kycVerificationSchema.methods.canBeRenewed = function() {
  return this.status === 'EXPIRED' || this.status === 'REJECTED';
};

kycVerificationSchema.methods.getCompletionPercentage = function() {
  let completed = 0;
  let total = 4; // identity, address, document, liveness
  
  if (this.verificationResults.identityVerification.status === 'PASSED') completed++;
  if (this.verificationResults.addressVerification.status === 'PASSED') completed++;
  if (this.verificationResults.documentVerification.status === 'PASSED') completed++;
  if (this.verificationResults.livenessCheck.status === 'PASSED') completed++;
  
  return (completed / total) * 100;
};

kycVerificationSchema.methods.addAuditEntry = function(action, performedBy, details, ipAddress) {
  this.auditTrail.push({
    action,
    performedBy,
    details,
    ipAddress,
    timestamp: new Date()
  });
};

// Static methods
kycVerificationSchema.statics.findByStatus = function(status, tenantId = null) {
  const query = { status };
  if (tenantId) query.tenantId = tenantId;
  return this.find(query);
};

kycVerificationSchema.statics.findByRiskLevel = function(riskLevel, tenantId = null) {
  const query = { 'riskAssessment.riskLevel': riskLevel };
  if (tenantId) query.tenantId = tenantId;
  return this.find(query);
};

kycVerificationSchema.statics.findExpired = function(tenantId = null) {
  const query = { 
    expiresAt: { $lte: new Date() },
    status: 'PENDING'
  };
  if (tenantId) query.tenantId = tenantId;
  return this.find(query);
};

kycVerificationSchema.statics.getStatistics = function(tenantId = null, startDate = null, endDate = null) {
  const matchCondition = {};
  if (tenantId) matchCondition.tenantId = mongoose.Types.ObjectId(tenantId);
  if (startDate || endDate) {
    matchCondition.submittedAt = {};
    if (startDate) matchCondition.submittedAt.$gte = startDate;
    if (endDate) matchCondition.submittedAt.$lte = endDate;
  }

  return this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0] } },
        approved: { $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ['$status', 'REJECTED'] }, 1, 0] } },
        inReview: { $sum: { $cond: [{ $eq: ['$status', 'IN_REVIEW'] }, 1, 0] } },
        lowRisk: { $sum: { $cond: [{ $eq: ['$riskAssessment.riskLevel', 'LOW'] }, 1, 0] } },
        mediumRisk: { $sum: { $cond: [{ $eq: ['$riskAssessment.riskLevel', 'MEDIUM'] }, 1, 0] } },
        highRisk: { $sum: { $cond: [{ $eq: ['$riskAssessment.riskLevel', 'HIGH'] }, 1, 0] } },
        avgRiskScore: { $avg: '$riskAssessment.riskScore' }
      }
    }
  ]);
};

module.exports = mongoose.model('KYCVerification', kycVerificationSchema);