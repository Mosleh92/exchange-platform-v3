// backend/src/models/accounting/Account.js
const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  accountCode: {
    type: String,
    required: true,
    unique: true
  },
  accountName: {
    type: String,
    required: true
  },
  accountType: {
    type: String,
    enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
    required: true
  },
  subType: {
    type: String,
    enum: [
      'current_asset', 'fixed_asset', 'current_liability', 'long_term_liability',
      'owner_equity', 'operating_revenue', 'non_operating_revenue',
      'operating_expense', 'non_operating_expense'
    ]
  },
  parentAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  currency: {
    type: String,
    default: 'IRR'
  },
  balance: {
    type: Number,
    default: 0
  },
  description: String
}, {
  timestamps: true
});

// ایجاد index برای جستجوی سریع
accountSchema.index({ tenantId: 1, accountCode: 1 });
accountSchema.index({ tenantId: 1, accountType: 1 });

module.exports = mongoose.model('Account', accountSchema);

// backend/src/models/accounting/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  subTenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubTenant'
  },
  transactionNumber: {
    type: String,
    required: true,
    unique: true
  },
  transactionDate: {
    type: Date,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  referenceNumber: String,
  totalAmount: {
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
  transactionType: {
    type: String,
    enum: ['cash_receipt', 'cash_payment', 'bank_deposit', 'bank_withdrawal', 
           'currency_exchange', 'remittance', 'p2p_trade', 'commission', 'other'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String
  }]
}, {
  timestamps: true
});

// Auto-increment transaction number
transactionSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await this.
