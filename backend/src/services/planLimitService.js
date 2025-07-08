const TenantPlan = require('../models/TenantPlan');
const Plan = require('../models/Plan');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const cache = require('../utils/cache');
const mongoose = require('mongoose');

class PlanLimitService {
  /**
   * Check if tenant has reached the limit for a specific feature
   * @param {string} tenantId - Tenant ID
   * @param {string} type - Type of limit to check
   * @param {Object} options - Additional options
   * @returns {Object} Limit check result
   */
  static async checkPlanLimit(tenantId, type, options = {}) {
    try {
      // Try to get from cache first
      const cacheKey = `plan_limit:${tenantId}:${type}`;
      const cached = await cache.get(cacheKey);
      
      if (cached && !options.bypassCache) {
        return cached;
      }

      // Get active subscription
      const subscription = await Subscription.findOne({ 
        tenantId, 
        status: 'active' 
      }).populate('planId');

      if (!subscription) {
        const result = { allowed: false, reason: 'اشتراک فعال یافت نشد' };
        await cache.set(cacheKey, result, 300); // Cache for 5 minutes
        return result;
      }

      const result = await this.checkSpecificLimit(tenantId, type, subscription, options);
      
      // Cache the result for 1 minute to reduce database load
      await cache.set(cacheKey, result, 60);
      
      return result;
    } catch (error) {
      console.error('Error checking plan limit:', error);
      return { allowed: false, reason: 'خطا در بررسی محدودیت پلن' };
    }
  }

  /**
   * Check specific limit type
   */
  static async checkSpecificLimit(tenantId, type, subscription, options) {
    const features = subscription.features || [];
    const feature = features.find(f => f.name === type);

    if (!feature || !feature.enabled) {
      return { allowed: false, reason: `ویژگی ${type} در پلن شما فعال نیست` };
    }

    // -1 means unlimited
    if (feature.limit === -1) {
      return { allowed: true, remaining: 'unlimited' };
    }

    let currentUsage = 0;

    switch (type) {
      case 'users':
        currentUsage = await User.countDocuments({ tenantId });
        break;

      case 'branches':
        const Branch = mongoose.models.Branch || require('../models/Branch');
        currentUsage = await Branch.countDocuments({ tenantId });
        break;

      case 'transactions':
        // Check transactions for current month
        const Transaction = mongoose.models.Transaction || require('../models/Transaction');
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        currentUsage = await Transaction.countDocuments({
          tenantId,
          createdAt: { $gte: startOfMonth }
        });
        break;

      case 'currencies':
        // Get unique currencies used in transactions
        const TransactionModel = mongoose.models.Transaction || require('../models/Transaction');
        const currencies = await TransactionModel.distinct('fromCurrency', { tenantId });
        const toCurrencies = await TransactionModel.distinct('toCurrency', { tenantId });
        const allCurrencies = [...new Set([...currencies, ...toCurrencies])];
        currentUsage = allCurrencies.length;
        break;

      case 'monthly_volume':
        // Check transaction volume for current month
        const TransactionVol = mongoose.models.Transaction || require('../models/Transaction');
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        
        const volumeResult = await TransactionVol.aggregate([
          {
            $match: {
              tenantId: tenantId,
              createdAt: { $gte: monthStart },
              status: 'completed'
            }
          },
          {
            $group: {
              _id: null,
              totalVolume: { $sum: '$amount' }
            }
          }
        ]);
        
        currentUsage = volumeResult.length > 0 ? volumeResult[0].totalVolume : 0;
        break;

      default:
        return { allowed: false, reason: 'نوع محدودیت نامعتبر است' };
    }

    const remaining = Math.max(0, feature.limit - currentUsage);
    const allowed = currentUsage < feature.limit;

    return {
      allowed,
      current: currentUsage,
      limit: feature.limit,
      remaining,
      reason: allowed ? null : `حداکثر ${feature.limit} ${type} مجاز است`
    };
  }

  /**
   * Get all plan limits and usage for a tenant
   */
  static async getPlanUsageSummary(tenantId) {
    try {
      const subscription = await Subscription.findOne({ 
        tenantId, 
        status: 'active' 
      });

      if (!subscription) {
        return { error: 'اشتراک فعال یافت نشد' };
      }

      const summary = {
        plan: subscription.plan,
        features: {},
        expiresAt: subscription.endDate
      };

      for (const feature of subscription.features || []) {
        const limitCheck = await this.checkSpecificLimit(
          tenantId, 
          feature.name, 
          subscription,
          { bypassCache: true }
        );
        
        summary.features[feature.name] = {
          enabled: feature.enabled,
          limit: feature.limit,
          current: limitCheck.current || 0,
          remaining: limitCheck.remaining,
          allowed: limitCheck.allowed
        };
      }

      return summary;
    } catch (error) {
      console.error('Error getting plan usage summary:', error);
      return { error: 'خطا در دریافت خلاصه استفاده از پلن' };
    }
  }

  /**
   * Clear cache for a tenant's plan limits
   */
  static async clearCache(tenantId) {
    const types = ['users', 'branches', 'transactions', 'currencies', 'monthly_volume'];
    
    for (const type of types) {
      const cacheKey = `plan_limit:${tenantId}:${type}`;
      await cache.del(cacheKey);
    }
  }
}

// Legacy export for backward compatibility
exports.checkPlanLimit = PlanLimitService.checkPlanLimit.bind(PlanLimitService);

module.exports = PlanLimitService; 