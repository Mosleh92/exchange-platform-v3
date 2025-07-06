const JournalEntry = require('../models/JournalEntry');

async function recordTransaction({ description, debitAccount, creditAccount, amount, reference }) {
  await JournalEntry.create({
    description,
    entries: [
      { account: debitAccount, debit: amount, credit: 0 },
      { account: creditAccount, debit: 0, credit: amount }
    ],
    reference
  });
}

function calculateProfit(sellAmount, buyAmount, fee) {
  return sellAmount - buyAmount - fee;
}

module.exports = { recordTransaction, calculateProfit }; 