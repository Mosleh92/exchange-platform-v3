const mongoose = require('mongoose');

const exchangeCompanySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  license_number: {
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
  contact_info: {
    phone: String,
    email: String,
    website: String,
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'inactive'],
    default: 'active',
  },
  settings: {
    type: Object,
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

exchangeCompanySchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('ExchangeCompany', exchangeCompanySchema);
