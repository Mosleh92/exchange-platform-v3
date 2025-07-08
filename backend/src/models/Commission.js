const mongoose = require("mongoose");

const commissionSchema = new mongoose.Schema(
  {
    // شناسه کمیسیون
    commissionNumber: {
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

    // نوع کمیسیون
    type: {
      type: String,
      enum: ["exchange", "transfer", "p2p", "remittance", "other"],
      required: true,
    },

    // تراکنش مرتبط
    relatedTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
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

    // درصد کمیسیون
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    // وضعیت کمیسیون
    status: {
      type: String,
      enum: ["pending", "collected", "waived", "refunded"],
      default: "pending",
    },

    // اطلاعات کاربر
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // تاریخ‌ها
    commissionDate: {
      type: Date,
      default: Date.now,
    },

    // اطلاعات اضافی
    description: {
      type: String,
      maxlength: 500,
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
commissionSchema.index({ tenantId: 1, commissionDate: -1 });
commissionSchema.index({ tenantId: 1, status: 1 });
commissionSchema.index({ commissionNumber: 1 }, { unique: true });
commissionSchema.index({ relatedTransaction: 1 });

module.exports = mongoose.model("Commission", commissionSchema);
