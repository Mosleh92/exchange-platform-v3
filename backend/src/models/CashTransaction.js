const mongoose = require("mongoose");

const cashTransactionSchema = new mongoose.Schema(
  {
    // شناسه تراکنش
    transactionNumber: {
      type: String,
      required: true,
      unique: true,
    },

    // ارتباط با Tenant
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },

    // نوع تراکنش
    type: {
      type: String,
      enum: ["cash_in", "cash_out", "transfer"],
      required: true,
    },

    // مبلغ و ارز
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      enum: ["IRR", "USD", "EUR", "AED", "GBP", "TRY"],
    },

    // حساب‌های مرتبط
    fromAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
    },
    toAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
    },

    // اطلاعات تراکنش
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },

    // وضعیت تراکنش
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending",
    },

    // اطلاعات کاربر
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // تاریخ‌ها
    transactionDate: {
      type: Date,
      default: Date.now,
    },

    // اطلاعات اضافی
    reference: {
      type: String,
      maxlength: 100,
    },

    notes: {
      type: String,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
cashTransactionSchema.index({ tenantId: 1, transactionDate: -1 });
cashTransactionSchema.index({ tenantId: 1, status: 1 });
cashTransactionSchema.index({ transactionNumber: 1 }, { unique: true });

module.exports = mongoose.model("CashTransaction", cashTransactionSchema);
