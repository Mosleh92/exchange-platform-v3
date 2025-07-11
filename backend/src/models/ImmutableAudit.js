const mongoose = require('mongoose');

const immutableAuditSchema = new mongoose.Schema({
  // Unique identifier for this audit entry
  auditId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Blockchain reference (optional for blockchain-based audit trail)
  blockchainRef: {
    transactionHash: String,
    blockNumber: Number,
    blockTimestamp: Date,
    network: String, // mainnet, testnet, private
    gasUsed: Number,
    contractAddress: String
  },

  // Previous audit entry hash for chain integrity
  previousHash: {
    type: String,
    required: true,
    index: true
  },

  // Current entry hash
  currentHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Digital signature for non-repudiation
  digitalSignature: {
    signature: String,
    publicKey: String,
    algorithm: String, // RSA, ECDSA, etc.
    timestamp: Date
  },

  // Sequence number for ordering
  sequenceNumber: {
    type: Number,
    required: true,
    index: true
  },

  // Entity Information
  entityInfo: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    entityType: { 
      type: String, 
      enum: ['USER', 'TRANSACTION', 'ORDER', 'ACCOUNT', 'SYSTEM', 'COMPLIANCE'],
      required: true 
    },
    entityId: { type: String, required: true },
    entityVersion: String
  },

  // Event Information
  eventInfo: {
    eventType: { 
      type: String, 
      enum: [
        'CREATE', 'READ', 'UPDATE', 'DELETE',
        'LOGIN', 'LOGOUT', 'AUTHENTICATION',
        'TRANSACTION_CREATED', 'TRANSACTION_EXECUTED', 'TRANSACTION_CANCELLED',
        'ORDER_PLACED', 'ORDER_FILLED', 'ORDER_CANCELLED',
        'ACCOUNT_CREATED', 'ACCOUNT_MODIFIED', 'ACCOUNT_SUSPENDED',
        'KYC_SUBMITTED', 'KYC_APPROVED', 'KYC_REJECTED',
        'COMPLIANCE_CHECK', 'RISK_ASSESSMENT', 'FRAUD_DETECTION',
        'SYSTEM_CONFIG', 'BACKUP_CREATED', 'BACKUP_RESTORED',
        'DATA_EXPORT', 'DATA_DELETION', 'GDPR_REQUEST'
      ],
      required: true 
    },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    resourceId: String,
    outcome: { 
      type: String, 
      enum: ['SUCCESS', 'FAILURE', 'PARTIAL', 'PENDING'],
      required: true 
    }
  },

  // Change Information (for data modifications)
  changeInfo: {
    beforeState: mongoose.Schema.Types.Mixed,
    afterState: mongoose.Schema.Types.Mixed,
    fieldChanges: [{
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed,
      changeType: { type: String, enum: ['ADD', 'MODIFY', 'DELETE'] }
    }],
    changeReason: String,
    changeCategory: String
  },

  // Context Information
  contextInfo: {
    sessionId: String,
    requestId: String,
    correlationId: String,
    ipAddress: String,
    userAgent: String,
    deviceFingerprint: String,
    geolocation: {
      country: String,
      region: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    apiVersion: String,
    clientInfo: String
  },

  // Security Information
  securityInfo: {
    authenticationMethod: String,
    authorizationLevel: String,
    securityClearance: String,
    riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    threatIndicators: [String],
    securityFlags: [String]
  },

  // Compliance Information
  complianceInfo: {
    regulatoryFramework: [String], // GDPR, SOX, PCI-DSS, etc.
    retentionPeriod: Number, // in days
    classificationLevel: { type: String, enum: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'] },
    sensitiveData: Boolean,
    personalData: Boolean,
    financialData: Boolean,
    complianceFlags: [String]
  },

  // Performance Metrics
  performanceInfo: {
    processingTime: Number, // milliseconds
    resourceUsage: {
      cpu: Number,
      memory: Number,
      storage: Number,
      network: Number
    },
    operationComplexity: String,
    cacheHitRate: Number
  },

  // Integrity Information
  integrityInfo: {
    checksum: String,
    algorithm: String, // SHA-256, SHA-512, etc.
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
    verifiedBy: String,
    tamperEvidence: [{
      detectedAt: Date,
      evidenceType: String,
      description: String,
      severity: String
    }]
  },

  // Metadata
  metadata: {
    source: String, // APPLICATION, API, BATCH, SYSTEM
    priority: { type: String, enum: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'], default: 'NORMAL' },
    tags: [String],
    customFields: mongoose.Schema.Types.Mixed,
    businessContext: String,
    processId: String,
    workflowId: String
  },

  // Storage Information
  storageInfo: {
    storageLocation: String,
    backupLocation: String,
    archiveLocation: String,
    replicationStatus: String,
    compressionApplied: Boolean,
    encryptionApplied: Boolean,
    encryptionAlgorithm: String
  },

  // Immutable timestamp (cannot be modified)
  immutableTimestamp: {
    type: Date,
    required: true,
    immutable: true,
    default: Date.now
  },

  // Version information
  version: {
    type: String,
    required: true,
    default: '1.0'
  },

  // Schema version for future migrations
  schemaVersion: {
    type: String,
    required: true,
    default: '2.0'
  }
}, {
  timestamps: false, // We use immutableTimestamp instead
  strict: true,
  validateBeforeSave: true
});

// Indexes for performance and integrity
immutableAuditSchema.index({ auditId: 1 }, { unique: true });
immutableAuditSchema.index({ currentHash: 1 }, { unique: true });
immutableAuditSchema.index({ previousHash: 1 });
immutableAuditSchema.index({ sequenceNumber: 1 });
immutableAuditSchema.index({ 'entityInfo.tenantId': 1, immutableTimestamp: -1 });
immutableAuditSchema.index({ 'entityInfo.userId': 1, immutableTimestamp: -1 });
immutableAuditSchema.index({ 'eventInfo.eventType': 1, immutableTimestamp: -1 });
immutableAuditSchema.index({ 'contextInfo.sessionId': 1 });
immutableAuditSchema.index({ 'blockchainRef.transactionHash': 1 });

// Compound indexes
immutableAuditSchema.index({ 
  'entityInfo.tenantId': 1, 
  'eventInfo.eventType': 1, 
  immutableTimestamp: -1 
});

// Pre-save middleware for immutability and integrity
immutableAuditSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Generate unique audit ID
    if (!this.auditId) {
      this.auditId = require('crypto').randomUUID();
    }

    // Get the last sequence number
    const lastAudit = await this.constructor.findOne({
      'entityInfo.tenantId': this.entityInfo.tenantId
    }).sort({ sequenceNumber: -1 });

    this.sequenceNumber = lastAudit ? lastAudit.sequenceNumber + 1 : 1;

    // Set previous hash
    this.previousHash = lastAudit ? lastAudit.currentHash : '0000000000000000000000000000000000000000000000000000000000000000';

    // Calculate current hash
    this.currentHash = this.calculateHash();

    // Generate digital signature
    this.digitalSignature = this.generateDigitalSignature();

    // Calculate integrity checksum
    this.integrityInfo.checksum = this.calculateChecksum();
    this.integrityInfo.algorithm = 'SHA-256';
  } else {
    // Prevent modifications to existing audit entries
    throw new Error('Immutable audit entries cannot be modified');
  }

  next();
});

// Instance methods
immutableAuditSchema.methods.calculateHash = function() {
  const crypto = require('crypto');
  
  const data = {
    auditId: this.auditId,
    previousHash: this.previousHash,
    sequenceNumber: this.sequenceNumber,
    entityInfo: this.entityInfo,
    eventInfo: this.eventInfo,
    changeInfo: this.changeInfo,
    contextInfo: this.contextInfo,
    immutableTimestamp: this.immutableTimestamp
  };

  const jsonString = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('sha256').update(jsonString).digest('hex');
};

immutableAuditSchema.methods.generateDigitalSignature = function() {
  const crypto = require('crypto');
  
  // In production, use proper key management
  const privateKey = process.env.AUDIT_PRIVATE_KEY || 'default-key';
  const dataToSign = this.currentHash;
  
  const signature = crypto.createHmac('sha256', privateKey).update(dataToSign).digest('hex');
  
  return {
    signature,
    algorithm: 'HMAC-SHA256',
    timestamp: new Date()
  };
};

immutableAuditSchema.methods.calculateChecksum = function() {
  const crypto = require('crypto');
  const jsonString = JSON.stringify(this.toObject());
  return crypto.createHash('sha256').update(jsonString).digest('hex');
};

immutableAuditSchema.methods.verifyIntegrity = function() {
  const currentChecksum = this.calculateChecksum();
  const storedChecksum = this.integrityInfo.checksum;
  
  return currentChecksum === storedChecksum;
};

immutableAuditSchema.methods.verifyChain = async function() {
  // Verify the chain integrity by checking the previous hash
  if (this.sequenceNumber === 1) {
    return this.previousHash === '0000000000000000000000000000000000000000000000000000000000000000';
  }

  const previousAudit = await this.constructor.findOne({
    'entityInfo.tenantId': this.entityInfo.tenantId,
    sequenceNumber: this.sequenceNumber - 1
  });

  if (!previousAudit) {
    return false;
  }

  return this.previousHash === previousAudit.currentHash;
};

// Static methods
immutableAuditSchema.statics.verifyChainIntegrity = async function(tenantId, startSequence = 1, endSequence = null) {
  const query = { 'entityInfo.tenantId': tenantId };
  
  if (endSequence) {
    query.sequenceNumber = { $gte: startSequence, $lte: endSequence };
  } else {
    query.sequenceNumber = { $gte: startSequence };
  }

  const audits = await this.find(query).sort({ sequenceNumber: 1 });
  
  let isValid = true;
  const violations = [];

  for (let i = 0; i < audits.length; i++) {
    const audit = audits[i];
    
    // Verify individual entry integrity
    if (!audit.verifyIntegrity()) {
      isValid = false;
      violations.push({
        type: 'INTEGRITY_VIOLATION',
        auditId: audit.auditId,
        sequenceNumber: audit.sequenceNumber,
        description: 'Audit entry checksum mismatch'
      });
    }

    // Verify chain link
    if (!(await audit.verifyChain())) {
      isValid = false;
      violations.push({
        type: 'CHAIN_VIOLATION',
        auditId: audit.auditId,
        sequenceNumber: audit.sequenceNumber,
        description: 'Chain link integrity violation'
      });
    }
  }

  return {
    isValid,
    violations,
    auditedEntries: audits.length
  };
};

immutableAuditSchema.statics.createAuditEntry = async function(auditData) {
  const audit = new this(auditData);
  return await audit.save();
};

immutableAuditSchema.statics.getAuditTrail = function(entityType, entityId, tenantId, options = {}) {
  const query = {
    'entityInfo.entityType': entityType,
    'entityInfo.entityId': entityId,
    'entityInfo.tenantId': tenantId
  };

  const { startDate, endDate, eventTypes, limit = 100, skip = 0 } = options;

  if (startDate || endDate) {
    query.immutableTimestamp = {};
    if (startDate) query.immutableTimestamp.$gte = startDate;
    if (endDate) query.immutableTimestamp.$lte = endDate;
  }

  if (eventTypes && eventTypes.length > 0) {
    query['eventInfo.eventType'] = { $in: eventTypes };
  }

  return this.find(query)
    .sort({ sequenceNumber: -1 })
    .limit(limit)
    .skip(skip);
};

immutableAuditSchema.statics.exportAuditTrail = async function(tenantId, format = 'JSON', options = {}) {
  const query = { 'entityInfo.tenantId': tenantId };
  
  if (options.startDate || options.endDate) {
    query.immutableTimestamp = {};
    if (options.startDate) query.immutableTimestamp.$gte = options.startDate;
    if (options.endDate) query.immutableTimestamp.$lte = options.endDate;
  }

  const audits = await this.find(query).sort({ sequenceNumber: 1 });

  switch (format.toUpperCase()) {
    case 'CSV':
      return this.convertToCSV(audits);
    case 'XML':
      return this.convertToXML(audits);
    default:
      return JSON.stringify(audits, null, 2);
  }
};

immutableAuditSchema.statics.convertToCSV = function(audits) {
  const headers = [
    'Audit ID', 'Sequence', 'Timestamp', 'Event Type', 'Action', 
    'Entity Type', 'Entity ID', 'User ID', 'IP Address', 'Outcome'
  ];

  const rows = audits.map(audit => [
    audit.auditId,
    audit.sequenceNumber,
    audit.immutableTimestamp.toISOString(),
    audit.eventInfo.eventType,
    audit.eventInfo.action,
    audit.entityInfo.entityType,
    audit.entityInfo.entityId,
    audit.entityInfo.userId || '',
    audit.contextInfo.ipAddress || '',
    audit.eventInfo.outcome
  ]);

  return [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
};

// Prevent modifications and deletions
immutableAuditSchema.pre('updateOne', function() {
  throw new Error('Immutable audit entries cannot be updated');
});

immutableAuditSchema.pre('findOneAndUpdate', function() {
  throw new Error('Immutable audit entries cannot be updated');
});

immutableAuditSchema.pre('deleteOne', function() {
  throw new Error('Immutable audit entries cannot be deleted');
});

immutableAuditSchema.pre('findOneAndDelete', function() {
  throw new Error('Immutable audit entries cannot be deleted');
});

module.exports = mongoose.model('ImmutableAudit', immutableAuditSchema);