const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['superadmin', 'tenant', 'branch', 'customer'], 
    required: true 
  },
  tenant: { type: mongoose.Types.ObjectId, ref: 'Tenant' },
  branch: { type: mongoose.Types.ObjectId, ref: 'Branch' },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
