const mongoose = require('mongoose');

const currencySchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['fiat', 'crypto'],
    required: true,
  },
});

module.exports = mongoose.model('Currency', currencySchema);
