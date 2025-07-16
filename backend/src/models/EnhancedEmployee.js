const mongoose = require('mongoose');
const { ObjectId } = mongoose.Schema.Types;

const enhancedEmployeeSchema = new mongoose.Schema({
  branch_id: {
    type: ObjectId,
    ref: 'EnhancedBranch',
    required: true,
  },
  user_id: {
    type: ObjectId,
    ref: 'User',
    required: true,
  },
  employee_code: {
    type: String,
    required: true,
    unique: true,
  },
  role: {
    type: String,
    required: true,
  },
  permissions: [String],
  daily_limits: {
    type: Object,
  },
  commission_rate: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'on_leave'],
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

enhancedEmployeeSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('EnhancedEmployee', enhancedEmployeeSchema);
