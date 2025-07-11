const mongoose = require('mongoose');
const Decimal = require('decimal.js');

/**
 * Enhanced Accounting Entry Model for robust double-entry bookkeeping
 * This model complements the existing JournalEntry and provides 
 * additional financial accuracy features
 */
const accountingEntrySchema = new mongoose.Schema({
  // Tenant isolation
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },

  // Transaction reference
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true,
    index: true
  },

  // Account information
  accountCode: {
    type: String,
    required: true,
    index: true
  },

  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },

  // Entry details
  description: {
    type: String,
    required: true,
    maxlength: 500
  },

  // Amounts with precision handling
  debit: {
    type: Number,
    default: 0,
    min: 0,
    get: v => Math.round(v * 100) / 100, // 2 decimal precision
    set: v => Math.round(v * 100) / 100
  },

  credit: {
    type: Number,
    default: 0,
    min: 0,
    get: v => Math.round(v * 100) / 100, // 2 decimal precision
    set: v => Math.round(v * 100) / 100
  },

  // Currency and exchange rate
  currency: {
    type: String,
    required: true,
    default: 'IRR',
    enum: ['IRR', 'USD', 'EUR', 'AED', 'GBP', 'TRY', 'BTC', 'ETH', 'USDT']
  },

  exchangeRate: {
    type: Number,
    default: 1,
    min: 0,
    get: v => Math.round(v * 10000) / 10000, // 4 decimal precision for rates
    set: v => Math.round(v * 10000) / 10000
  },

  // Entry type for categorization
  entryType: {
    type: String,
    enum: ['DEBIT', 'CREDIT'],
    required: true
  },

  // Reference to original entry for reversals
  originalEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccountingEntry'
  },

  // Reversal information
  reversalOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AccountingEntry'
  },

  reversalReason: String,

  // Entry status
  status: {
    type: String,
    enum: ['pending', 'posted', 'reversed', 'cancelled'],
    default: 'pending'
  },

  // Audit fields
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },

  // Financial integrity fields
  integrityHash: {
    type: String,
    index: true
  },

  verificationStatus: {
    type: String,
    enum: ['unverified', 'verified', 'failed'],
    default: 'unverified'
  },

  // Balance tracking
  runningBalance: {
    type: Number,
    default: 0
  },

  // Metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    sessionId: String,
    batchId: String // For grouped transactions
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Compound indexes for performance
accountingEntrySchema.index({ tenantId: 1, accountCode: 1, createdAt: -1 });
accountingEntrySchema.index({ tenantId: 1, transactionId: 1 });
accountingEntrySchema.index({ tenantId: 1, status: 1 });
accountingEntrySchema.index({ accountId: 1, createdAt: -1 });
accountingEntrySchema.index({ integrityHash: 1 });

// Pre-save validation and integrity hash generation
accountingEntrySchema.pre('save', function(next) {
  // Validate debit/credit exclusive rule
  if (this.debit > 0 && this.credit > 0) {
    return next(new Error('Entry cannot have both debit and credit amounts'));
  }

  if (this.debit === 0 && this.credit === 0) {
    return next(new Error('Entry must have either debit or credit amount'));
  }

  // Set entry type based on amounts
  if (this.debit > 0) {
    this.entryType = 'DEBIT';
  } else if (this.credit > 0) {
    this.entryType = 'CREDIT';
  }

  // Generate integrity hash
  this.integrityHash = this.generateIntegrityHash();

  next();
});

// Instance methods
accountingEntrySchema.methods.generateIntegrityHash = function() {
  const crypto = require('crypto');
  const data = [
    this.tenantId,
    this.transactionId,
    this.accountCode,
    this.debit,
    this.credit,
    this.currency,
    this.exchangeRate,
    this.description
  ].join('|');
  
  return crypto.createHash('sha256').update(data).digest('hex');
};

accountingEntrySchema.methods.verify = function() {
  const expectedHash = this.generateIntegrityHash();
  const isValid = this.integrityHash === expectedHash;
  
  this.verificationStatus = isValid ? 'verified' : 'failed';
  return isValid;
};

accountingEntrySchema.methods.getAmount = function() {
  return this.debit > 0 ? this.debit : this.credit;
};

accountingEntrySchema.methods.getSignedAmount = function() {
  return this.debit > 0 ? this.debit : -this.credit;
};

// Static methods for financial operations
accountingEntrySchema.statics.createDoubleEntry = async function(entryData) {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const {
        tenantId,
        transactionId,
        description,
        entries,
        userId,
        branchId,
        metadata
      } = entryData;

      // Validate entries balance
      const totalDebits = entries
        .filter(e => e.type === 'DEBIT')
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      
      const totalCredits = entries
        .filter(e => e.type === 'CREDIT')
        .reduce((sum, e) => sum + (e.amount || 0), 0);

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error('Debits must equal credits in double-entry system');
      }

      const createdEntries = [];
      
      for (const entry of entries) {
        const accountingEntry = new this({
          tenantId,
          transactionId,
          accountCode: entry.accountCode,
          accountId: entry.accountId,
          description: entry.description || description,
          debit: entry.type === 'DEBIT' ? entry.amount : 0,
          credit: entry.type === 'CREDIT' ? entry.amount : 0,
          currency: entry.currency || 'IRR',
          exchangeRate: entry.exchangeRate || 1,
          userId,
          branchId,
          metadata,
          status: 'posted'
        });

        await accountingEntry.save({ session });
        createdEntries.push(accountingEntry);
      }

      return createdEntries;
    });

    return true;
  } catch (error) {
    throw error;
  } finally {
    await session.endSession();
  }
};

accountingEntrySchema.statics.reverseEntry = async function(entryId, reversalReason, userId) {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const originalEntry = await this.findById(entryId).session(session);
      if (!originalEntry) {
        throw new Error('Original entry not found');
      }

      if (originalEntry.status === 'reversed') {
        throw new Error('Entry is already reversed');
      }

      // Create reversal entry
      const reversalEntry = new this({
        tenantId: originalEntry.tenantId,
        transactionId: originalEntry.transactionId,
        accountCode: originalEntry.accountCode,
        accountId: originalEntry.accountId,
        description: `REVERSAL: ${originalEntry.description}`,
        debit: originalEntry.credit, // Swap debit/credit
        credit: originalEntry.debit,
        currency: originalEntry.currency,
        exchangeRate: originalEntry.exchangeRate,
        userId,
        branchId: originalEntry.branchId,
        reversalOf: originalEntry._id,
        reversalReason,
        status: 'posted'
      });

      await reversalEntry.save({ session });

      // Mark original as reversed
      originalEntry.status = 'reversed';
      await originalEntry.save({ session });

      return reversalEntry;
    });
  } catch (error) {
    throw error;
  } finally {
    await session.endSession();
  }
};

accountingEntrySchema.statics.getAccountBalance = async function(accountId, asOfDate = new Date()) {
  const entries = await this.find({
    accountId,
    createdAt: { $lte: asOfDate },
    status: 'posted'
  }).sort({ createdAt: 1 });

  let balance = 0;
  for (const entry of entries) {
    balance += entry.getSignedAmount();
  }

  return balance;
};

accountingEntrySchema.statics.validateIntegrity = async function(tenantId) {
  const entries = await this.find({ tenantId, status: 'posted' });
  const results = {
    totalEntries: entries.length,
    validEntries: 0,
    invalidEntries: 0,
    errors: []
  };

  for (const entry of entries) {
    if (entry.verify()) {
      results.validEntries++;
    } else {
      results.invalidEntries++;
      results.errors.push({
        entryId: entry._id,
        error: 'Integrity hash mismatch'
      });
    }
  }

  return results;
};

// Virtual for balance effect
accountingEntrySchema.virtual('balanceEffect').get(function() {
  return this.debit - this.credit;
});

module.exports = mongoose.model('AccountingEntry', accountingEntrySchema);