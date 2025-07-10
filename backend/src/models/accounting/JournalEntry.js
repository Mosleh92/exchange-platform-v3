const mongoose = require('mongoose');
const Decimal = require('decimal.js');

/**
 * Double-Entry Accounting Journal Entry Model
 * Implements proper accounting principles with debit/credit entries
 */
const journalEntrySchema = new mongoose.Schema({
  // Tenant isolation
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true
  },

  // Journal entry identification
  entryNumber: {
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

  // Entry date and period
  entryDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },

  // Accounting period
  accountingPeriod: {
    year: { type: Number, required: true },
    month: { type: Number, required: true }
  },

  // Entry description
  description: {
    type: String,
    required: true,
    maxlength: 500
  },

  // Entry type
  entryType: {
    type: String,
    enum: [
      'currency_exchange',    // تبادل ارز
      'commission',           // کارمزد
      'fee',                  // هزینه
      'transfer',             // انتقال
      'adjustment',           // تعدیل
      'reversal',             // برگشت
      'opening_balance',      // مانده اولیه
      'closing_balance'       // مانده نهایی
    ],
    required: true
  },

  // Debit and Credit entries
  entries: [{
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true
    },
    accountCode: {
      type: String,
      required: true
    },
    accountName: {
      type: String,
      required: true
    },
    debit: {
      type: Number,
      default: 0,
      min: 0
    },
    credit: {
      type: Number,
      default: 0,
      min: 0
    },
    currency: {
      type: String,
      required: true,
      default: 'IRR'
    },
    exchangeRate: {
      type: Number,
      default: 1
    },
    description: String
  }],

  // Total amounts for validation
  totalDebit: {
    type: Number,
    required: true,
    min: 0
  },
  totalCredit: {
    type: Number,
    required: true,
    min: 0
  },

  // Entry status
  status: {
    type: String,
    enum: ['draft', 'posted', 'reversed', 'cancelled'],
    default: 'draft'
  },

  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  postedAt: Date,
  reversedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reversedAt: Date,

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
journalEntrySchema.index({ tenantId: 1, entryDate: -1 });
journalEntrySchema.index({ tenantId: 1, accountingPeriod: 1 });
journalEntrySchema.index({ tenantId: 1, status: 1 });
journalEntrySchema.index({ transactionId: 1 });

// Pre-save validation
journalEntrySchema.pre('save', function(next) {
  // Validate double-entry principle
  if (this.entries && this.entries.length > 0) {
    const totalDebit = this.entries.reduce((sum, entry) => 
      sum + new Decimal(entry.debit || 0), new Decimal(0)
    );
    const totalCredit = this.entries.reduce((sum, entry) => 
      sum + new Decimal(entry.credit || 0), new Decimal(0)
    );

    // Check if debits equal credits
    if (!totalDebit.equals(totalCredit)) {
      return next(new Error('Debits must equal credits in double-entry accounting'));
    }

    this.totalDebit = totalDebit.toNumber();
    this.totalCredit = totalCredit.toNumber();
  }

  // Generate entry number if not provided
  if (!this.entryNumber) {
    this.entryNumber = this.generateEntryNumber();
  }

  next();
});

// Instance methods
journalEntrySchema.methods.generateEntryNumber = function() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  return `JE-${year}${month}${day}-${timestamp}`;
};

journalEntrySchema.methods.post = async function(userId) {
  if (this.status !== 'draft') {
    throw new Error('Only draft entries can be posted');
  }

  this.status = 'posted';
  this.postedBy = userId;
  this.postedAt = new Date();
  
  // Update account balances
  await this.updateAccountBalances();
  
  return this.save();
};

journalEntrySchema.methods.reverse = async function(userId, reason) {
  if (this.status !== 'posted') {
    throw new Error('Only posted entries can be reversed');
  }

  // Create reversal entry
  const reversalEntry = new this.constructor({
    tenantId: this.tenantId,
    transactionId: this.transactionId,
    entryDate: new Date(),
    accountingPeriod: this.accountingPeriod,
    description: `Reversal: ${this.description}`,
    entryType: 'reversal',
    entries: this.entries.map(entry => ({
      accountId: entry.accountId,
      accountCode: entry.accountCode,
      accountName: entry.accountName,
      debit: entry.credit, // Reverse debit/credit
      credit: entry.debit,
      currency: entry.currency,
      exchangeRate: entry.exchangeRate,
      description: `Reversal: ${entry.description || ''}`
    })),
    createdBy: userId,
    status: 'posted'
  });

  await reversalEntry.save();
  
  this.status = 'reversed';
  this.reversedBy = userId;
  this.reversedAt = new Date();
  
  return this.save();
};

journalEntrySchema.methods.updateAccountBalances = async function() {
  const Account = mongoose.model('Account');
  
  for (const entry of this.entries) {
    await Account.findByIdAndUpdate(
      entry.accountId,
      {
        $inc: {
          balance: entry.debit - entry.credit,
          totalDebits: entry.debit,
          totalCredits: entry.credit
        },
        $set: { lastUpdated: new Date() }
      }
    );
  }
};

// Static methods
journalEntrySchema.statics.findByPeriod = function(tenantId, year, month) {
  return this.find({
    tenantId,
    'accountingPeriod.year': year,
    'accountingPeriod.month': month,
    status: 'posted'
  }).sort({ entryDate: 1 });
};

journalEntrySchema.statics.getTrialBalance = async function(tenantId, asOfDate) {
  const Account = mongoose.model('Account');
  
  const accounts = await Account.find({ tenantId }).lean();
  const trialBalance = accounts.map(account => ({
    accountCode: account.accountCode,
    accountName: account.accountName,
    accountType: account.accountType,
    balance: account.balance || 0,
    totalDebits: account.totalDebits || 0,
    totalCredits: account.totalCredits || 0
  }));

  return trialBalance;
};

module.exports = mongoose.model('JournalEntry', journalEntrySchema); 