const mongoose = require("mongoose");

const featuresSchema = new mongoose.Schema(
  {
    maxUsers: { type: Number, required: true, default: 5 },
    maxBranches: { type: Number, required: true, default: 1 },
    transactionFeePercent: { type: Number, required: true, default: 1 },
    supportLevel: {
      type: String,
      enum: ["basic", "premium", "enterprise"],
      default: "basic",
    },
    analyticsAccess: { type: Boolean, default: false },
    p2pTrading: { type: Boolean, default: false },
  },
  { _id: false },
);

const salesPlanSchema = new mongoose.Schema(
  {
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    price: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      default: "USD",
    },
    duration: {
      type: String,
      enum: ["monthly", "yearly", "custom"],
      required: true,
    },
    features: {
      type: featuresSchema,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

salesPlanSchema.index({ tenant_id: 1 });
salesPlanSchema.index({ tenant_id: 1, isActive: 1 });
salesPlanSchema.index({ tenant_id: 1, isDefault: 1 });
salesPlanSchema.index({ name: 1, tenant_id: 1 }, { unique: true });

const SalesPlan = mongoose.model("SalesPlan", salesPlanSchema);

module.exports = SalesPlan;
