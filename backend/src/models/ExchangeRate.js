const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const exchangeRateSchema = new mongoose.Schema({
  exchange_company_id: {
    type: ObjectId,
    ref: 'ExchangeCompany',
    required: true,
  },
  branch_id: {
    type: ObjectId,
    ref: 'EnhancedBranch',
  },
  currency_from: {
    type: String,
    required: true,
  },
  currency_to: {
    type: String,
    required: true,
  },
  buy_rate: {
    type: Number,
    required: true,
  },
  sell_rate: {
    type: Number,
    required: true,
  },
  effective_date: {
    type: Date,
    required: true,
  },
  created_by: {
    type: ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired'],
    default: 'active',
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

exchangeRateSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('ExchangeRate', exchangeRateSchema);
