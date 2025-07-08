const mongoose = require("mongoose");

const P2POrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["buy", "sell"], required: true },
  amount: { type: Number, required: true },
  price: { type: Number, required: true },
  currency: { type: String, required: true },
  status: {
    type: String,
    enum: ["open", "matched", "completed", "cancelled"],
    default: "open",
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("P2POrder", P2POrderSchema);
