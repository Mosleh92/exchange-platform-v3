const mongoose = require("mongoose");

const debtSchema = new mongoose.Schema(
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
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
    },

    // Debt details
    originalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    remainingAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
    },

    // Interest and penalties
    interestRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    penaltyRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalInterest: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPenalty: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Due dates
    dueDate: {
      type: Date,
      required: true,
    },
    gracePeriod: {
      type: Number,
      default: 0, // days
      min: 0,
    },

    // Status
    status: {
      type: String,
      enum: ["active", "overdue", "settled", "written_off"],
      default: "active",
    },

    // Payment schedule
    paymentSchedule: [
      {
        dueDate: Date,
        amount: Number,
        status: {
          type: String,
          enum: ["pending", "paid", "overdue"],
          default: "pending",
        },
        paidAmount: {
          type: Number,
          default: 0,
        },
        paidAt: Date,
      },
    ],

    // Notifications
    notifications: [
      {
        type: {
          type: String,
          enum: ["reminder", "overdue", "final_notice", "legal_action"],
          required: true,
        },
        sentAt: {
          type: Date,
          default: Date.now,
        },
        sentBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        method: {
          type: String,
          enum: ["email", "sms", "push", "letter"],
          required: true,
        },
        content: String,
        status: {
          type: String,
          enum: ["sent", "delivered", "failed"],
          default: "sent",
        },
      },
    ],

    // Collection actions
    collectionActions: [
      {
        action: {
          type: String,
          enum: [
            "phone_call",
            "email",
            "sms",
            "legal_notice",
            "collection_agency",
          ],
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
        performedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        notes: String,
        result: String,
      },
    ],

    // Metadata
    metadata: {
      riskLevel: {
        type: String,
        enum: ["low", "medium", "high", "critical"],
        default: "low",
      },
      collectionPriority: {
        type: String,
        enum: ["low", "medium", "high", "urgent"],
        default: "low",
      },
      tags: [String],
      notes: String,
    },

    // Audit
    audit: {
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      settledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      settledAt: Date,
      writtenOffBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      writtenOffAt: Date,
      reason: String,
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
debtSchema.index({ tenantId: 1, customerId: 1 });
debtSchema.index({ tenantId: 1, status: 1 });
debtSchema.index({ tenantId: 1, dueDate: 1 });
debtSchema.index({ tenantId: 1, "metadata.riskLevel": 1 });

// Virtual for total debt amount
debtSchema.virtual("totalDebt").get(function () {
  return this.remainingAmount + this.totalInterest + this.totalPenalty;
});

// Virtual for days overdue
debtSchema.virtual("daysOverdue").get(function () {
  if (this.status === "overdue") {
    const now = new Date();
    const dueDate = new Date(this.dueDate);
    const diffTime = now - dueDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Static method to get overdue debts
debtSchema.statics.getOverdueDebts = function (tenantId, days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return this.find({
    tenantId,
    status: { $in: ["active", "overdue"] },
    dueDate: { $lt: cutoffDate },
  })
    .populate("customerId", "name email phone")
    .populate("transactionId", "amount currency")
    .sort({ dueDate: 1 });
};

// Static method to get debt statistics
debtSchema.statics.getDebtStats = function (tenantId) {
  return this.aggregate([
    {
      $match: { tenantId: mongoose.Types.ObjectId(tenantId) },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalAmount: { $sum: "$remainingAmount" },
        avgAmount: { $avg: "$remainingAmount" },
      },
    },
  ]);
};

// Method to update debt status
debtSchema.methods.updateStatus = function () {
  const now = new Date();
  const dueDate = new Date(this.dueDate);

  if (this.remainingAmount <= 0) {
    this.status = "settled";
    this.audit.settledAt = now;
  } else if (now > dueDate) {
    this.status = "overdue";
  } else {
    this.status = "active";
  }

  return this.save();
};

// Method to calculate interest
debtSchema.methods.calculateInterest = function () {
  if (this.interestRate <= 0) return 0;

  const now = new Date();
  const dueDate = new Date(this.dueDate);

  if (now <= dueDate) return 0;

  const daysOverdue = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
  const dailyRate = this.interestRate / 365;

  return this.remainingAmount * dailyRate * daysOverdue;
};

// Method to add payment
debtSchema.methods.addPayment = function (amount, paymentDate = new Date()) {
  this.remainingAmount = Math.max(0, this.remainingAmount - amount);

  // Update payment schedule
  for (let payment of this.paymentSchedule) {
    if (payment.status === "pending" && payment.amount > 0) {
      const paymentAmount = Math.min(
        amount,
        payment.amount - payment.paidAmount,
      );
      payment.paidAmount += paymentAmount;
      amount -= paymentAmount;

      if (payment.paidAmount >= payment.amount) {
        payment.status = "paid";
        payment.paidAt = paymentDate;
      }

      if (amount <= 0) break;
    }
  }

  return this.save();
};

// Method to send notification
debtSchema.methods.sendNotification = function (type, method, content, sentBy) {
  this.notifications.push({
    type,
    method,
    content,
    sentBy,
    sentAt: new Date(),
  });

  return this.save();
};

// Pre-save middleware to update status
debtSchema.pre("save", function (next) {
  this.updateStatus();
  next();
});

module.exports = mongoose.model("Debt", debtSchema);
