/**
 * Generates a unique transaction code.
 * @returns {string} A unique code.
 */
function generateTransactionCode() {
  // Simple example: a timestamp-based code
  return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

/**
 * Calculates commission for a transaction.
 * @param {number} amount - The transaction amount.
 * @param {object} rules - The commission rules.
 * @returns {number} The calculated commission.
 */
function calculateCommission(amount, rules = {}) {
  // This is a placeholder. Real logic would be more complex.
  const { rate = 0.01, min = 1, max = 100 } = rules;
  let commission = amount * rate;
  if (commission < min) commission = min;
  if (commission > max) commission = max;
  return commission;
}

/**
 * Generates a 6-digit verification code for SMS/email verification.
 * @returns {string} A 6-digit code as string.
 */
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = {
  generateTransactionCode,
  calculateCommission,
  generateVerificationCode,
}; 