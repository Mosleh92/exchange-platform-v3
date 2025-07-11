const SubscriptionModel = require('../models/Subscription');

class SubscriptionService {
  static async createSubscription(tenantId, plan) {
    return await SubscriptionModel.create({
      tenantId,
      plan,
      features: this.getPlanFeatures(plan),
      startDate: new Date(),
      endDate: this.calculateEndDate(plan),
      status: 'active'
    });
  }

  static getPlanFeatures(plan) {
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
    return features[plan];
  }

  static calculateEndDate(plan) {
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
}

module.exports = SubscriptionService;