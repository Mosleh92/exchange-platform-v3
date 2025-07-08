const mongoose = require("mongoose");

const checkSchema = new mongoose.Schema(
  {
    checkNumber: {
      type: String,
      required: true,
      unique: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
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
    issueDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "cleared", "bounced", "cancelled"],
      default: "pending",
    },
    payee: {
      name: String,
      accountNumber: String,
      bankName: String,
    },
    drawer: {
      name: String,
      accountNumber: String,
      bankName: String,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    processedAt: {
      type: Date,
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
checkSchema.index({ tenantId: 1, status: 1 });
checkSchema.index({ tenantId: 1, dueDate: 1 });
checkSchema.index({ checkNumber: 1 }, { unique: true });
checkSchema.index({ accountId: 1 });

module.exports = mongoose.model("Check", checkSchema);
