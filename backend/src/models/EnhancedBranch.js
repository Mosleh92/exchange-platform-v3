const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const enhancedBranchSchema = new mongoose.Schema({
  exchange_company_id: {
    type: ObjectId,
    ref: 'ExchangeCompany',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  },
  manager_id: {
    type: ObjectId,
    ref: 'User',
  },
  daily_limits: {
    type: Object,
  },
  operating_hours: {
    type: Object,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
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

enhancedBranchSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('EnhancedBranch', enhancedBranchSchema);
