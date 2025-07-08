const mongoose = require("mongoose");

const cryptoOrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: { type: String, enum: ["buy", "sell"], required: true },
    currency: {
      type: String,
      enum: ["USDT", "BTC", "ETH", "BNB", "XRP"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0.0001 },
    rate: { type: Number, required: true }, // نرخ لحظه‌ای
    fiatCurrency: { type: String, enum: ["IRR", "AED", "USD"], required: true },
    fiatAmount: { type: Number, required: true }, // مبلغ معادل نقدی
    paymentMethod: {
      type: String,
      enum: ["bank_card", "bank_transfer", "cash", "internal_wallet"],
      required: true,
    },
    receiveMethod: {
      type: String,
      enum: ["wallet", "bank_card", "cash"],
      required: true,
    },
    walletAddress: { type: String }, // آدرس کیف پول مقصد یا مبدا
    status: {
      type: String,
      enum: [
        "pending_payment",
        "paid",
        "under_review",
        "confirmed",
        "cancelled",
        "rejected",
      ],
      default: "pending_payment",
    },
    receipt: {
      fileUrl: String,
      txHash: String, // هش بلاک‌چین
    },
    trackingCode: { type: String, unique: true },
    adminNotes: String,
    operatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // اپراتور رسیدگی‌کننده
    fee: { type: Number, default: 0 }, // کارمزد ثابت
    networkFee: { type: Number, default: 0 }, // کارمزد شبکه
    profit: { type: Number, default: 0 }, // سود صرافی از نرخ تبدیل
    loss: { type: Number, default: 0 }, // ضرر احتمالی
    statusHistory: [
      {
        status: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        changedAt: { type: Date, default: Date.now },
        notes: String,
      },
    ],
    isInternalWallet: { type: Boolean, default: false }, // آیا ارز در کیف پول داخلی نگهداری شود؟
    confirmations: { type: Number, default: 0 }, // تعداد تاییدیه بلاک‌چین
    meta: mongoose.Schema.Types.Mixed, // اطلاعات اضافی
  },
  {
    timestamps: true,
  },
);

cryptoOrderSchema.index({ trackingCode: 1 });
cryptoOrderSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("CryptoOrder", cryptoOrderSchema);
