const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
    },
    duration: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },
    limits: {
      users: { type: Number, default: 10 },
      storageMB: { type: Number, default: 1000 },
      transactions: { type: Number, default: 10000 },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Plan", planSchema);
