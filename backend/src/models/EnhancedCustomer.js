const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const enhancedCustomerSchema = new mongoose.Schema({
  exchange_company_id: {
    type: ObjectId,
    ref: 'ExchangeCompany',
    required: true,
  },
  customer_code: {
    type: String,
    required: true,
    unique: true,
  },
  personal_info: {
    first_name: String,
    last_name: String,
    date_of_birth: Date,
    nationality: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    contact: {
      phone: String,
      email: String,
    },
  },
  kyc_status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'rejected'],
    default: 'not_started',
  },
  documents: [
    {
      type: {
        type: String,
      },
      url: String,
      status: String,
    },
  ],
  wallet_balances: {
    type: Object,
  },
  transaction_limits: {
    type: Object,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
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

enhancedCustomerSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('EnhancedCustomer', enhancedCustomerSchema);
