const mongoose = require("mongoose");

const tenantPlanSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant",
    required: true,
  },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  status: {
    type: String,
    enum: ["active", "expired", "suspended"],
    default: "active",
  },
});

module.exports = mongoose.model("TenantPlan", tenantPlanSchema);
