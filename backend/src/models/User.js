// backend/src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['super_admin', 'tenant_admin', 'manager', 'staff', 'customer'],
    default: 'customer'
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant'
  },
  profile: {
    firstName: String,
    lastName: String,
    phone: String,
    avatar: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
