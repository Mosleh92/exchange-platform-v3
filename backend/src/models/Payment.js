const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  payment_id: { type: String, unique: true, required: true },
  deal_id: { type: String, required: true },
  paid_amount: { type: Number, required: true },
  payment_date: { type: Date, required: true },
  bank_account: { type: String, required: true },
  receipt_image: { type: String }, // آدرس فایل آپلودی
  verified: { type: Boolean, default: false },
  recorded_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  description: { type: String },
  created_at: { type: Date, default: Date.now },
});

paymentSchema.index({ payment_id: 1 });
paymentSchema.index({ deal_id: 1 });
paymentSchema.index({ verified: 1 });

module.exports = mongoose.model("Payment", paymentSchema);
