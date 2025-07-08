const mongoose = require("mongoose");

const customerWalletSchema = new mongoose.Schema({
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  currency: {
    type: String,
    required: true,
    enum: ["IRR", "AED", "USD", "EUR", "USDT", "BTC", "ETH", "BNB", "XRP"],
  },
  balance: { type: Number, default: 0 },
  locked_amount: { type: Number, default: 0 },
  last_updated: { type: Date, default: Date.now },
  is_active: { type: Boolean, default: true },
});

customerWalletSchema.index({ customer_id: 1, currency: 1 }, { unique: true });

module.exports = mongoose.model("CustomerWallet", customerWalletSchema);
