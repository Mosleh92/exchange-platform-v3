const mongoose = require("mongoose");

const transferRequestSchema = new mongoose.Schema(
  {
    // شناسه یکتا درخواست
    requestId: {
      type: String,
      required: true,
      unique: true,
    },

    // شناسه مستأجر (صرافی)
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },

    // شناسه مشتری درخواست کننده
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // شماره حساب مبدا
    fromAccount: {
      type: String,
      required: true,
    },

    // نوع انتقال
    transferType: {
      type: String,
      enum: [
        "internal", // انتقال داخلی (همان صرافی)
        "external", // انتقال خارجی (صرافی دیگر)
        "bank", // انتقال بانکی
        "cash", // نقدی
        "crypto", // ارز دیجیتال
      ],
      required: true,
    },

    // اطلاعات مقصد
    destination: {
      // برای انتقال داخلی
      toAccount: String,
      toCustomerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      // برای انتقال خارجی
      toTenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tenant",
      },
      toTenantName: String,

      // برای انتقال بانکی
      bankName: String,
      bankAccountNumber: String,
      bankAccountHolder: String,
      bankIban: String,
      bankSwiftCode: String,

      // برای انتقال نقدی
      recipientName: String,
      recipientPhone: String,
      recipientIdNumber: String,
      pickupLocation: {
        address: String,
        city: String,
        country: String,
      },

      // برای ارز دیجیتال
      cryptoAddress: String,
      cryptoNetwork: String,
    },

    // ارز و مبلغ
    currency: {
      type: String,
      required: true,
      uppercase: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // کارمزد
    fees: {
      amount: {
        type: Number,
        default: 0,
      },
      currency: {
        type: String,
        default: "IRR",
      },
      description: String,
    },

    // نرخ تبدیل (در صورت نیاز)
    exchangeRate: Number,

    // توضیحات
    description: {
      type: String,
      maxlength: 500,
    },

    // اولویت
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },

    // وضعیت درخواست
    status: {
      type: String,
      enum: [
        "pending", // در انتظار بررسی
        "approved", // تأیید شده
        "processing", // در حال پردازش
        "completed", // تکمیل شده
        "rejected", // رد شده
        "cancelled", // لغو شده
        "failed", // ناموفق
      ],
      default: "pending",
    },

    // تأیید مدیر
    approval: {
      required: {
        type: Boolean,
        default: false,
      },
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      approvedAt: Date,
      notes: String,
    },

    // پردازش
    processing: {
      processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      processedAt: Date,
      processingNotes: String,
      receipt: {
        filePath: String,
        fileName: String,
        uploadedAt: Date,
      },
    },

    // اطلاعات امنیتی
    security: {
      verificationCode: String,
      twoFactorVerified: {
        type: Boolean,
        default: false,
      },
      ipAddress: String,
      deviceInfo: String,
    },

    // تاریخچه
    history: [
      {
        action: String,
        details: String,
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        performedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // یادداشت‌ها
    notes: {
      customer: String,
      staff: String,
      system: String,
    },

    // اطلاعات ثبت کننده
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // تاریخچه وضعیت
    statusHistory: [
      {
        status: String,
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        reason: String,
        notes: String,
      },
    ],
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

// Indexes
transferRequestSchema.index({ tenantId: 1, requestId: 1 });
transferRequestSchema.index({ tenantId: 1, customerId: 1 });
transferRequestSchema.index({ tenantId: 1, status: 1 });
transferRequestSchema.index({ tenantId: 1, transferType: 1 });
transferRequestSchema.index({ created_at: -1 });

// Static method to generate request ID
transferRequestSchema.statics.generateRequestId = function (tenantCode) {
  const timestamp = Date.now().toString().slice(-10);
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `TRF${tenantCode}${timestamp}${random}`;
};

// Method to add to history
transferRequestSchema.methods.addToHistory = function (
  action,
  details,
  performedBy,
) {
  this.history.push({
    action,
    details,
    performedBy,
  });

  // Keep only last 50 entries
  if (this.history.length > 50) {
    this.history = this.history.slice(-50);
  }

  return this.save();
};

// Method to add status to history
transferRequestSchema.methods.addStatusHistory = function (
  status,
  changedBy,
  reason = "",
  notes = "",
) {
  this.statusHistory.push({
    status,
    changedBy,
    reason,
    notes,
  });
  return this.save();
};

// Method to approve request
transferRequestSchema.methods.approve = function (approvedBy, notes = "") {
  this.status = "approved";
  this.approval.approvedBy = approvedBy;
  this.approval.approvedAt = new Date();
  this.approval.notes = notes;

  this.addStatusHistory("approved", approvedBy, "Request approved", notes);

  return this.save();
};

// Method to reject request
transferRequestSchema.methods.reject = function (rejectedBy, reason = "") {
  this.status = "rejected";

  this.addStatusHistory("rejected", rejectedBy, reason);

  return this.save();
};

// Method to complete request
transferRequestSchema.methods.complete = function (
  processedBy,
  processingNotes = "",
) {
  this.status = "completed";
  this.processing.processedBy = processedBy;
  this.processing.processedAt = new Date();
  this.processing.processingNotes = processingNotes;

  this.addStatusHistory(
    "completed",
    processedBy,
    "Transfer completed",
    processingNotes,
  );

  return this.save();
};

// Pre-save middleware
transferRequestSchema.pre("save", function (next) {
  if (this.isNew) {
    if (!this.requestId) {
      this.requestId = this.constructor.generateRequestId("REQ");
    }
  }
  next();
});

module.exports = mongoose.model("TransferRequest", transferRequestSchema);
