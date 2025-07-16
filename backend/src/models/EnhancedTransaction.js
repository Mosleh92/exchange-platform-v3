const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const enhancedTransactionSchema = new mongoose.Schema({
  exchange_company_id: {
    type: ObjectId,
    ref: 'ExchangeCompany',
    required: true,
  },
  branch_id: {
    type: ObjectId,
    ref: 'EnhancedBranch',
    required: true,
  },
  transaction_code: {
    type: String,
    required: true,
    unique: true,
  },
  type: {
    type: String,
    enum: ['buy', 'sell', 'transfer', 'p2p'],
    required: true,
  },
  customer_id: {
    type: ObjectId,
    ref: 'EnhancedCustomer',
    required: true,
  },
  employee_id: {
    type: ObjectId,
    ref: 'EnhancedEmployee',
    required: true,
  },
  currency_from: {
    type: String,
    required: true,
  },
  currency_to: {
    type: String,
    required: true,
  },
  amount_from: {
    type: Number,
    required: true,
  },
  amount_to: {
    type: Number,
    required: true,
  },
  exchange_rate: {
    type: Number,
    required: true,
  },
  commission: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled', 'failed'],
    default: 'pending',
  },
  payment_method: {
    type: String,
  },
  notes: {
    type: String,
  },
  audit_trail: [Object],
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

enhancedTransactionSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('EnhancedTransaction', enhancedTransactionSchema);
