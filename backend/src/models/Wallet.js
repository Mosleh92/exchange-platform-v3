const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const walletSchema = new mongoose.Schema({
  customer_id: {
    type: ObjectId,
    ref: 'EnhancedCustomer',
    required: true,
  },
  exchange_company_id: {
    type: ObjectId,
    ref: 'ExchangeCompany',
    required: true,
  },
  currency: {
    type: String,
    required: true,
  },
  balance: {
    type: Number,
    default: 0,
  },
  frozen_balance: {
    type: Number,
    default: 0,
  },
  last_transaction_id: {
    type: ObjectId,
    ref: 'EnhancedTransaction',
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

walletSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('Wallet', walletSchema);
