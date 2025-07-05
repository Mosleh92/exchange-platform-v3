const Subscription = require('../models/Subscription');
// const Plan = require('../models/Plan'); // Unused

const SubscriptionService = {
  async createSubscription({ tenantId, planId, startDate, endDate, autoRenew = false }) {
    const subscription = new Subscription({
      tenantId,
      planId,
      startDate,
      endDate,
      status: 'active',
      nextRenewalDate: autoRenew ? endDate : null,
      autoRenew
    });
    await subscription.save();
    return subscription;
  },

  async renewSubscription({ subscriptionId, newEndDate }) {
    const subscription = await Subscription.findByIdAndUpdate(
      subscriptionId,
      { endDate: newEndDate, status: 'active', nextRenewalDate: newEndDate },
      { new: true }
    );
    if (!subscription) throw new Error('اشتراک یافت نشد');
    return subscription;
  },

  async getActiveSubscription(tenantId) {
    return Subscription.findOne({ tenantId, status: 'active' }).populate('planId');
  },

  async getSubscriptionHistory(tenantId) {
    return Subscription.find({ tenantId }).sort({ startDate: -1 }).populate('planId');
  }
};

module.exports = SubscriptionService; 