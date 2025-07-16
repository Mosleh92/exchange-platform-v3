const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');

const SubscriptionService = {
  async createSubscription({ tenantId, planId, plan, startDate, endDate, autoRenew = false }) {
    const subscription = new Subscription({
      tenantId,
      planId,
      plan,
      features: this.getPlanFeatures(plan),
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
  },

  getPlanFeatures(plan) {
    const features = {
      basic: [
        { name: 'users', enabled: true, limit: 5 },
        { name: 'transactions', enabled: true, limit: 1000 },
        { name: 'currencies', enabled: true, limit: 3 }
      ],
      professional: [
        { name: 'users', enabled: true, limit: 20 },
        { name: 'transactions', enabled: true, limit: 10000 },
        { name: 'currencies', enabled: true, limit: 10 }
      ],
      enterprise: [
        { name: 'users', enabled: true, limit: -1 },
        { name: 'transactions', enabled: true, limit: -1 },
        { name: 'currencies', enabled: true, limit: -1 }
      ]
    };
    return features[plan] || features.basic;
  },

  calculateEndDate(plan) {
    const startDate = new Date();
    const endDate = new Date(startDate);
    
    switch (plan) {
      case 'basic':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'professional':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'enterprise':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1);
    }
    
    return endDate;
  }
};

module.exports = SubscriptionService; 