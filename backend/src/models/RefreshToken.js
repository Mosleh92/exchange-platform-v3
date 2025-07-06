const mongoose = require('mongoose');

const RefreshTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

RefreshTokenSchema.index({ userId: 1, tenantId: 1 });
RefreshTokenSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('RefreshToken', RefreshTokenSchema); 