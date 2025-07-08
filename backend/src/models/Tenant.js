// backend/src/models/Tenant.js
const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    type: {
      type: String,
      enum: ["exchange", "bank", "financial_institution"],
      default: "exchange",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended", "pending_approval"],
      default: "pending_approval",
    },
    subscription: {
      plan: {
        type: String,
        enum: ["basic", "premium", "enterprise", "custom"],
        default: "basic",
      },
      startDate: {
        type: Date,
        default: Date.now,
      },
      endDate: {
        type: Date,
        required: true,
      },
      autoRenew: {
        type: Boolean,
        default: true,
      },
      price: {
        type: Number,
        default: 0,
      },
      currency: {
        type: String,
        default: "USD",
      },
      features: [
        {
          name: String,
          enabled: { type: Boolean, default: true },
          limit: Number,
        },
      ],
    },
    contact: {
      name: String,
      email: String,
      phone: String,
      address: {
        country: String,
        city: String,
        street: String,
        postalCode: String,
      },
    },
    settings: {
      maxBranches: {
        type: Number,
        default: 1,
      },
      maxStaff: {
        type: Number,
        default: 10,
      },
      maxCustomers: {
        type: Number,
        default: 1000,
      },
      allowedCurrencies: [
        {
          type: String,
          default: ["IRR", "USD", "EUR"],
        },
      ],
      transactionLimits: {
        daily: { type: Number, default: 1000000000 },
        monthly: { type: Number, default: 10000000000 },
      },
      features: {
        multiBranch: { type: Boolean, default: false },
        internationalRemittance: { type: Boolean, default: false },
        cryptoSupport: { type: Boolean, default: false },
        advancedReporting: { type: Boolean, default: false },
        apiAccess: { type: Boolean, default: false },
        whiteLabel: { type: Boolean, default: false },
      },
    },
    branding: {
      logo: String,
      favicon: String,
      primaryColor: { type: String, default: "#3B82F6" },
      secondaryColor: { type: String, default: "#1F2937" },
      customDomain: String,
    },
    admin: {
      username: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
      phone: String,
      fullName: String,
    },
    metadata: {
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      approvedAt: Date,
      notes: String,
      documents: [
        {
          type: String,
          name: String,
          url: String,
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
tenantSchema.index({ tenantId: 1 });
tenantSchema.index({ code: 1 });
tenantSchema.index({ status: 1 });
tenantSchema.index({ "subscription.endDate": 1 });
tenantSchema.index({ "admin.email": 1 });

// Virtual for isActive
tenantSchema.virtual("isActive").get(function () {
  return this.status === "active" && this.subscription.endDate > new Date();
});

// Virtual for isExpired
tenantSchema.virtual("isExpired").get(function () {
  return this.subscription.endDate <= new Date();
});

// Virtual for daysUntilExpiry
tenantSchema.virtual("daysUntilExpiry").get(function () {
  const now = new Date();
  const expiry = new Date(this.subscription.endDate);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Static method to generate tenant ID
tenantSchema.statics.generateTenantId = function () {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `TEN${timestamp}${random}`;
};

// Static method to generate tenant code
tenantSchema.statics.generateTenantCode = function (name) {
  const nameCode = name.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  return `${nameCode}${timestamp}`;
};

// Method to activate tenant
tenantSchema.methods.activate = function (approvedBy) {
  this.status = "active";
  this.metadata.approvedBy = approvedBy;
  this.metadata.approvedAt = new Date();
  return this.save();
};

// Method to suspend tenant
tenantSchema.methods.suspend = function (reason) {
  this.status = "suspended";
  this.metadata.notes = reason;
  return this.save();
};

// Method to deactivate tenant
tenantSchema.methods.deactivate = function (reason) {
  this.status = "inactive";
  this.metadata.notes = reason;
  return this.save();
};

// Method to extend subscription
tenantSchema.methods.extendSubscription = function (months, plan = null) {
  const currentEndDate = new Date(this.subscription.endDate);
  currentEndDate.setMonth(currentEndDate.getMonth() + months);
  this.subscription.endDate = currentEndDate;

  if (plan) {
    this.subscription.plan = plan;
  }

  return this.save();
};

// Method to check feature access
tenantSchema.methods.hasFeature = function (featureName) {
  const feature = this.settings.features[featureName];
  return feature === true;
};

// Method to check limits
tenantSchema.methods.checkLimit = function (limitType, currentValue) {
  const limit = this.settings[limitType];
  return currentValue < limit;
};

// Static method to get active tenants
tenantSchema.statics.getActiveTenants = function () {
  return this.find({
    status: "active",
    "subscription.endDate": { $gt: new Date() },
  });
};

// Static method to get expiring tenants
tenantSchema.statics.getExpiringTenants = function (days = 30) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);

  return this.find({
    status: "active",
    "subscription.endDate": { $lte: expiryDate, $gt: new Date() },
  });
};

// Static method to get tenant statistics
tenantSchema.statics.getTenantStats = async function () {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalTenants: { $sum: 1 },
        activeTenants: {
          $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
        },
        pendingTenants: {
          $sum: { $cond: [{ $eq: ["$status", "pending_approval"] }, 1, 0] },
        },
        suspendedTenants: {
          $sum: { $cond: [{ $eq: ["$status", "suspended"] }, 1, 0] },
        },
        byType: {
          $push: {
            type: "$type",
            status: "$status",
          },
        },
        byPlan: {
          $push: {
            plan: "$subscription.plan",
            status: "$status",
          },
        },
      },
    },
  ]);
};

module.exports = mongoose.model("Tenant", tenantSchema);
