 copilot/fix-62378d25-cbd6-4e65-a205-dbd7675c9ecb
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const mongooseEncryption = require('mongoose-encryption');

// ایزولاسیون داده‌ها: tenantId و branchId برای جلوگیری از نشت داده بین صرافی‌ها و شعبه‌ها الزامی است.

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  national_id: { type: String, required: true, unique: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  kyc_status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  created_at: { type: Date, default: Date.now },
  phoneVerified: { type: Boolean, default: false },
  emailVerified: { type: Boolean, default: false },
  verificationCode: { type: String },
  verificationCodeExpires: { type: Date },
  // سایر فیلدهای مورد نیاز
});

// رمزنگاری فیلدهای حساس
const encryptionKey = process.env.CUSTOMER_ENCRYPTION_KEY;
if (!encryptionKey) throw new Error('CUSTOMER_ENCRYPTION_KEY is not set in environment variables!');
customerSchema.plugin(mongooseEncryption, {
  secret: encryptionKey,
  encryptedFields: ['phone', 'national_id']
});

// پلاگین برای فیلتر خودکار tenantId
function tenantScopePlugin(schema) {
  schema.pre(['find', 'findOne', 'findOneAndUpdate', 'count', 'countDocuments'], function(next) {
    if (this.getQuery().tenantId === undefined && this.options.tenantId) {
      this.where({ tenantId: this.options.tenantId });
    }
    next();
  });
}

customerSchema.plugin(tenantScopePlugin);

// Indexes for performance and tenant isolation
customerSchema.index({ tenantId: 1, branchId: 1 });
customerSchema.index({ tenantId: 1, phone: 1 });
customerSchema.index({ tenantId: 1, national_id: 1 });
customerSchema.index({ tenantId: 1, kyc_status: 1 });
customerSchema.index({ tenantId: 1, created_at: -1 });
customerSchema.index({ created_by: 1 });
customerSchema.index({ phoneVerified: 1 });

module.exports = mongoose.model('Customer', customerSchema);
=======
import { prisma } from '../config/database.js';

export const Customer = {
  create: (data) => prisma.customer.create({ data }),
  findById: (id) => prisma.customer.findUnique({ where: { id } }),
  updateBalance: (id, balance) =>
    prisma.customer.update({ where: { id }, data: { balance } }),
};
 main
