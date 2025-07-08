const mongoose = require("mongoose");

const exchangeRateSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    currencyPair: {
      from: {
        type: String,
        required: true,
        uppercase: true,
      },
      to: {
        type: String,
        required: true,
        uppercase: true,
      },
    },
    rates: {
      buy: {
        type: Number,
        required: true,
        min: 0,
      },
      sell: {
        type: Number,
        required: true,
        min: 0,
      },
      spread: {
        type: Number,
        default: 0,
      },
    },
    vipRates: {
      buy: Number,
      sell: Number,
      discount: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
    },
    limits: {
      minAmount: {
        type: Number,
        default: 0,
      },
      maxAmount: {
        type: Number,
        default: 1000000000,
      },
      dailyLimit: {
        type: Number,
        default: 10000000000,
      },
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    source: {
      type: String,
      enum: ["manual", "api", "bank", "market"],
      default: "manual",
    },
    validity: {
      from: {
        type: Date,
        default: Date.now,
      },
      to: {
        type: Date,
        default: function () {
          const date = new Date();
          date.setHours(23, 59, 59, 999);
          return date;
        },
      },
    },
    history: [
      {
        buy: Number,
        sell: Number,
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        reason: String,
      },
    ],
    notes: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

// Indexes
exchangeRateSchema.index(
  { tenantId: 1, "currencyPair.from": 1, "currencyPair.to": 1 },
  { unique: true },
);
exchangeRateSchema.index({ tenantId: 1, status: 1 });
exchangeRateSchema.index({ "validity.from": 1, "validity.to": 1 });

// Pre-save middleware to calculate spread
exchangeRateSchema.pre("save", function (next) {
  if (this.rates.buy && this.rates.sell) {
    this.rates.spread = this.rates.sell - this.rates.buy;
  }
  next();
});

// Static method to get current rate
exchangeRateSchema.statics.getCurrentRate = function (
  tenantId,
  fromCurrency,
  toCurrency,
) {
  const now = new Date();
  return this.findOne({
    tenantId,
    "currencyPair.from": fromCurrency,
    "currencyPair.to": toCurrency,
    status: "active",
    "validity.from": { $lte: now },
    "validity.to": { $gte: now },
  }).sort({ "validity.from": -1 });
};

// Static method to get VIP rate
exchangeRateSchema.statics.getVIPRate = function (
  tenantId,
  fromCurrency,
  toCurrency,
  vipLevel,
) {
  return this.getCurrentRate(tenantId, fromCurrency, toCurrency).then(
    (rate) => {
      if (!rate || !rate.vipRates) return rate;

      const vipRate = { ...rate };
      if (vipLevel === "vip" || vipLevel === "premium") {
        if (rate.vipRates.buy) vipRate.rates.buy = rate.vipRates.buy;
        if (rate.vipRates.sell) vipRate.rates.sell = rate.vipRates.sell;
      }

      return vipRate;
    },
  );
};

// Method to add to history
exchangeRateSchema.methods.addToHistory = function (changedBy, reason = "") {
  this.history.push({
    buy: this.rates.buy,
    sell: this.rates.sell,
    changedBy,
    reason,
  });

  // Keep only last 100 entries
  if (this.history.length > 100) {
    this.history = this.history.slice(-100);
  }

  return this.save();
};

// Method to update rate
exchangeRateSchema.methods.updateRate = function (
  buy,
  sell,
  changedBy,
  reason = "",
) {
  const oldBuy = this.rates.buy;
  const oldSell = this.rates.sell;

  this.rates.buy = buy;
  this.rates.sell = sell;
  this.lastUpdated = new Date();

  this.addToHistory(changedBy, reason);

  return this.save();
};

module.exports = mongoose.model("ExchangeRate", exchangeRateSchema);
