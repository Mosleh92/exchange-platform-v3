const HoldManager = require("./HoldManager");

const HoldingService = {
  /**
   * Create a hold transaction (business logic only)
   * @param {Object} req - Express request object
   * @returns {Promise<Object>} - Created hold transaction
   */
  async handleHold(req) {
    const { accountId, currency, amount, reason, holdUntil, notes } = req.body;
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const userName = req.user.name || req.user.username || "User";
    // Call HoldManager to create hold
    return await HoldManager.createHold(
      tenantId,
      accountId,
      currency,
      amount,
      reason,
      {
        holdUntil,
        notes,
        userId,
        userName,
      },
    );
  },

  /**
   * Release a hold transaction
   */
  async releaseHold({ tenantId, holdTransactionId, releasedBy, notes }) {
    return await HoldManager.releaseHold(tenantId, holdTransactionId, {
      releasedBy,
      notes,
    });
  },

  /**
   * Get all active holds for an account (optionally filtered by currency)
   */
  async getActiveHolds({ tenantId, accountId, currency }) {
    return await HoldManager.getActiveHolds(tenantId, accountId, currency);
  },
};

module.exports = HoldingService;
