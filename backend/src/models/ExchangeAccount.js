const mongoose = require("mongoose");

// ایزولاسیون داده‌ها: tenantId و branchId برای جلوگیری از نشت داده بین صرافی‌ها و شعبه‌ها الزامی است.

const exchangeAccountSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
    },

    // Account details
    accountNumber: {
      type: String,
      required: true,
      unique: true,
    },
    accountType: {
      type: String,
      enum: ["savings", "current", "investment", "holding"],
      default: "holding",
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
    },

    // Balance information
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    availableBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    frozenBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Interest and fees
    interestRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    monthlyFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastInterestCalculation: {
      type: Date,
      default: Date.now,
    },

    // Account status
    status: {
      type: String,
      enum: ["active", "inactive", "frozen", "closed"],
      default: "active",
    },

    // Limits
    limits: {
      dailyWithdrawal: {
        type: Number,
        default: 0,
      },
      monthlyWithdrawal: {
        type: Number,
        default: 0,
      },
      dailyTransaction: {
        type: Number,
        default: 0,
      },
      monthlyTransaction: {
        type: Number,
        default: 0,
      },
    },

    // Usage tracking
    usage: {
      dailyWithdrawalUsed: {
        type: Number,
        default: 0,
      },
      monthlyWithdrawalUsed: {
        type: Number,
        default: 0,
      },
      dailyTransactionUsed: {
        type: Number,
        default: 0,
      },
      monthlyTransactionUsed: {
        type: Number,
        default: 0,
      },
      lastResetDate: {
        type: Date,
        default: Date.now,
      },
    },

    // Account settings
    settings: {
      autoInterest: {
        type: Boolean,
        default: true,
      },
      notifications: {
        balance: { type: Boolean, default: true },
        transactions: { type: Boolean, default: true },
        limits: { type: Boolean, default: true },
      },
      withdrawalMethods: [
        {
          type: String,
          enum: ["cash", "bank_transfer", "digital_wallet", "card"],
        },
      ],
    },

    // Transaction history summary
    transactionSummary: {
      totalDeposits: { type: Number, default: 0 },
      totalWithdrawals: { type: Number, default: 0 },
      totalExchanges: { type: Number, default: 0 },
      lastTransactionDate: Date,
      transactionCount: { type: Number, default: 0 },
    },

    // Metadata
    metadata: {
      openedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      closedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      closedAt: Date,
      reason: String,
      notes: String,
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
exchangeAccountSchema.index({ tenantId: 1, customerId: 1 });
exchangeAccountSchema.index(
  { tenantId: 1, accountNumber: 1 },
  { unique: true },
);
exchangeAccountSchema.index({ tenantId: 1, currency: 1 });
exchangeAccountSchema.index({ tenantId: 1, status: 1 });

// Virtual for total balance
exchangeAccountSchema.virtual("totalBalance").get(function () {
  return this.balance + this.frozenBalance;
});

// Static method to generate account number
exchangeAccountSchema.statics.generateAccountNumber = function (
  tenantId,
  currency,
) {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `${currency}${timestamp}${random}`;
};

// Static method to get customer accounts
exchangeAccountSchema.statics.getCustomerAccounts = function (
  tenantId,
  customerId,
) {
  return this.find({
    tenantId,
    customerId,
    status: { $ne: "closed" },
  })
    .populate("branchId", "name code")
    .sort({ currency: 1, created_at: -1 });
};

// Static method to get account by number
exchangeAccountSchema.statics.getByAccountNumber = function (
  tenantId,
  accountNumber,
) {
  return this.findOne({
    tenantId,
    accountNumber,
  })
    .populate("customerId", "name email phone")
    .populate("branchId", "name code");
};

// Method to update balance
exchangeAccountSchema.methods.updateBalance = function (
  amount,
  type = "deposit",
) {
  if (type === "deposit") {
    this.balance += amount;
    this.availableBalance += amount;
  } else if (type === "withdrawal") {
    this.balance = Math.max(0, this.balance - amount);
    this.availableBalance = Math.max(0, this.availableBalance - amount);
  } else if (type === "freeze") {
    this.frozenBalance += amount;
    this.availableBalance = Math.max(0, this.availableBalance - amount);
  } else if (type === "unfreeze") {
    this.frozenBalance = Math.max(0, this.frozenBalance - amount);
    this.availableBalance += amount;
  }

  return this.save();
};

// Method to check withdrawal limits
exchangeAccountSchema.methods.canWithdraw = function (amount) {
  // Check if account is active
  if (this.status !== "active") return false;

  // Check available balance
  if (this.availableBalance < amount) return false;

  // Check daily withdrawal limit
  if (
    this.limits.dailyWithdrawal > 0 &&
    this.usage.dailyWithdrawalUsed + amount > this.limits.dailyWithdrawal
  ) {
    return false;
  }

  // Check monthly withdrawal limit
  if (
    this.limits.monthlyWithdrawal > 0 &&
    this.usage.monthlyWithdrawalUsed + amount > this.limits.monthlyWithdrawal
  ) {
    return false;
  }

  return true;
};

// Method to calculate interest
exchangeAccountSchema.methods.calculateInterest = function () {
  if (this.interestRate <= 0 || this.balance <= 0) return 0;

  const now = new Date();
  const lastCalc = new Date(this.lastInterestCalculation);
  const daysDiff = Math.ceil((now - lastCalc) / (1000 * 60 * 60 * 24));

  if (daysDiff < 30) return 0; // Monthly interest calculation

  const monthlyRate = this.interestRate / 12;
  const interest = this.balance * monthlyRate;

  this.balance += interest;
  this.availableBalance += interest;
  this.lastInterestCalculation = now;

  return interest;
};

// Method to reset usage limits
exchangeAccountSchema.methods.resetUsageLimits = function () {
  const now = new Date();
  const lastReset = new Date(this.usage.lastResetDate);

  // Reset daily limits
  if (now.getDate() !== lastReset.getDate()) {
    this.usage.dailyWithdrawalUsed = 0;
    this.usage.dailyTransactionUsed = 0;
  }

  // Reset monthly limits
  if (
    now.getMonth() !== lastReset.getMonth() ||
    now.getFullYear() !== lastReset.getFullYear()
  ) {
    this.usage.monthlyWithdrawalUsed = 0;
    this.usage.monthlyTransactionUsed = 0;
  }

  this.usage.lastResetDate = now;
  return this.save();
};

// Method to close account
exchangeAccountSchema.methods.closeAccount = function (closedBy, reason) {
  if (this.balance > 0) {
    throw new Error("Cannot close account with positive balance");
  }

  this.status = "closed";
  this.metadata.closedBy = closedBy;
  this.metadata.closedAt = new Date();
  this.metadata.reason = reason;

  return this.save();
};

// Pre-save middleware to reset usage limits
exchangeAccountSchema.pre("save", function (next) {
  this.resetUsageLimits();
  next();
});

module.exports = mongoose.model("ExchangeAccount", exchangeAccountSchema);
