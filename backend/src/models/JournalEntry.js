const mongoose = require("mongoose");
const JournalEntrySchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  description: String,
  entries: [
    {
      account: String,
      debit: Number,
      credit: Number,
    },
  ],
  reference: String,
});
module.exports = mongoose.model("JournalEntry", JournalEntrySchema);
