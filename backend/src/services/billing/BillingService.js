// backend/src/services/billing/BillingService.js
const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const TenantPlan = require('../../models/TenantPlan');
const Subscription = require('../../models/Subscription');
const Invoice = require('../../models/Invoice');

/**
 * Comprehensive Billing Service for SaaS Multi-tenancy
 * Handles subscriptions, usage tracking, billing cycles, and payments
 */
class BillingService {
  constructor() {
    this.usageCache = new Map(); // tenantId -> usage data
    this.billingCycles = {
      MONTHLY: 'monthly',
      QUARTERLY: 'quarterly',
      ANNUALLY: 'annually'
    };
    this.planTypes = {
      BASIC: 'basic',
      PROFESSIONAL: 'professional',
      ENTERPRISE: 'enterprise',
      CUSTOM: 'custom'
    };
  }

  /**
   * Initialize billing service
   */
  async initialize() {
    try {
      // Setup billing schemas if not exists
      await this.setupBillingSchemas();
      
      // Initialize default plans
      await this.initializeDefaultPlans();
      
      // Start usage tracking
      this.startUsageTracking();
      
      logger.info('Billing service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize billing service:', error);
      throw error;
    }
  }

  /**
   * Setup billing database schemas
   */
  async setupBillingSchemas() {
    // Usage tracking schema
    const usageTrackingSchema = new mongoose.Schema({
      tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
      metric: { type: String, required: true }, // users, transactions, storage, api_calls
      value: { type: Number, required: true },
      timestamp: { type: Date, default: Date.now },
      period: { type: String, required: true }, // daily, monthly
      metadata: { type: mongoose.Schema.Types.Mixed }
    });

    // Billing event schema
    const billingEventSchema = new mongoose.Schema({
      tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
      eventType: { type: String, required: true }, // subscription_created, usage_recorded, payment_processed
      data: { type: mongoose.Schema.Types.Mixed },
      timestamp: { type: Date, default: Date.now },
      processed: { type: Boolean, default: false }
    });

    // Payment method schema
    const paymentMethodSchema = new mongoose.Schema({
      tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
      type: { type: String, enum: ['credit_card', 'bank_transfer', 'paypal'], required: true },
      provider: { type: String, required: true }, // stripe, paypal, etc.
      providerCustomerId: { type: String, required: true },
      providerPaymentMethodId: { type: String, required: true },
      isDefault: { type: Boolean, default: false },
      isActive: { type: Boolean, default: true },
      metadata: { type: mongoose.Schema.Types.Mixed },
      createdAt: { type: Date, default: Date.now }
    });

    // Register models if not already registered
    if (!mongoose.models.UsageTracking) {
      mongoose.model('UsageTracking', usageTrackingSchema);
    }
    if (!mongoose.models.BillingEvent) {
      mongoose.model('BillingEvent', billingEventSchema);
    }
    if (!mongoose.models.PaymentMethod) {
      mongoose.model('PaymentMethod', paymentMethodSchema);
    }
  }

  /**
   * Initialize default billing plans
   */
  async initializeDefaultPlans() {
    const defaultPlans = [
      {
        name: 'Basic Plan',
        type: this.planTypes.BASIC,
        price: 29.99,
        currency: 'USD',
        billingCycle: this.billingCycles.MONTHLY,
        features: {
          maxUsers: 10,
          maxTransactions: 1000,
          maxStorage: 1024 * 1024 * 1024, // 1GB
          maxApiCalls: 10000,
          supportLevel: 'basic',
          features: ['p2p_trading', 'basic_reporting']
        },
        isActive: true
      },
      {
        name: 'Professional Plan',
        type: this.planTypes.PROFESSIONAL,
        price: 99.99,
        currency: 'USD',
        billingCycle: this.billingCycles.MONTHLY,
        features: {
          maxUsers: 100,
          maxTransactions: 10000,
          maxStorage: 10 * 1024 * 1024 * 1024, // 10GB
          maxApiCalls: 100000,
          supportLevel: 'priority',
          features: ['p2p_trading', 'advanced_reporting', 'api_access', 'multi_currency']
        },
        isActive: true
      },
      {
        name: 'Enterprise Plan',
        type: this.planTypes.ENTERPRISE,
        price: 299.99,
        currency: 'USD',
        billingCycle: this.billingCycles.MONTHLY,
        features: {
          maxUsers: -1, // unlimited
          maxTransactions: -1, // unlimited
          maxStorage: -1, // unlimited
          maxApiCalls: -1, // unlimited
          supportLevel: 'premium',
          features: ['all_features']
        },
        isActive: true
      }
    ];

    for (const planData of defaultPlans) {
      try {
        const existingPlan = await TenantPlan.findOne({ type: planData.type });
        if (!existingPlan) {
          await TenantPlan.create(planData);
          logger.info(`Created default plan: ${planData.name}`);
        }
      } catch (error) {
        logger.error(`Failed to create default plan ${planData.name}:`, error);
      }
    }
  }

  /**
   * Create subscription for tenant
   */
  async createSubscription(tenantId, planId, paymentMethodId = null) {
    try {
      // Get plan details
      const plan = await TenantPlan.findById(planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      // Calculate billing period
      const now = new Date();
      const billingStart = now;
      const billingEnd = this.calculateBillingEnd(billingStart, plan.billingCycle);

      // Create subscription
      const subscription = await Subscription.create({
        tenantId,
        planId,
        status: 'active',
        billingCycle: plan.billingCycle,
        currentPeriodStart: billingStart,
        currentPeriodEnd: billingEnd,
        amount: plan.price,
        currency: plan.currency,
        paymentMethodId,
        metadata: {
          planName: plan.name,
          planFeatures: plan.features
        }
      });

      // Record billing event
      await this.recordBillingEvent(tenantId, 'subscription_created', {
        subscriptionId: subscription._id,
        planId,
        amount: plan.price
      });

      // Generate first invoice
      await this.generateInvoice(subscription._id);

      logger.info(`Created subscription for tenant ${tenantId}`);
      return subscription;

    } catch (error) {
      logger.error(`Failed to create subscription for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Track usage for tenant
   */
  async trackUsage(tenantId, metric, value, metadata = {}) {
    try {
      const UsageTracking = mongoose.model('UsageTracking');
      
      // Record usage
      await UsageTracking.create({
        tenantId,
        metric,
        value,
        period: 'daily',
        metadata
      });

      // Update cache
      if (!this.usageCache.has(tenantId)) {
        this.usageCache.set(tenantId, {});
      }
      
      const tenantUsage = this.usageCache.get(tenantId);
      tenantUsage[metric] = (tenantUsage[metric] || 0) + value;

      // Check usage limits
      await this.checkUsageLimits(tenantId);

      logger.debug(`Tracked usage: ${metric}=${value} for tenant ${tenantId}`);

    } catch (error) {
      logger.error(`Failed to track usage for tenant ${tenantId}:`, error);
    }
  }

  /**
   * Check if tenant has exceeded usage limits
   */
  async checkUsageLimits(tenantId) {
    try {
      // Get current subscription
      const subscription = await Subscription.findOne({ 
        tenantId, 
        status: 'active' 
      }).populate('planId');

      if (!subscription) {
        return { withinLimits: false, reason: 'No active subscription' };
      }

      const plan = subscription.planId;
      const usage = this.usageCache.get(tenantId) || {};

      const limits = {
        users: plan.features.maxUsers,
        transactions: plan.features.maxTransactions,
        storage: plan.features.maxStorage,
        api_calls: plan.features.maxApiCalls
      };

      const violations = [];

      for (const [metric, limit] of Object.entries(limits)) {
        if (limit !== -1 && (usage[metric] || 0) > limit) {
          violations.push({
            metric,
            usage: usage[metric],
            limit,
            percentage: ((usage[metric] / limit) * 100).toFixed(2)
          });
        }
      }

      if (violations.length > 0) {
        // Record billing event for limit violation
        await this.recordBillingEvent(tenantId, 'usage_limit_exceeded', {
          violations,
          timestamp: new Date()
        });

        logger.warn(`Usage limits exceeded for tenant ${tenantId}:`, violations);
      }

      return {
        withinLimits: violations.length === 0,
        violations,
        usage,
        limits
      };

    } catch (error) {
      logger.error(`Failed to check usage limits for tenant ${tenantId}:`, error);
      return { withinLimits: false, reason: 'Error checking limits' };
    }
  }

  /**
   * Generate invoice for subscription
   */
  async generateInvoice(subscriptionId) {
    try {
      const subscription = await Subscription.findById(subscriptionId).populate('planId');
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Calculate invoice amount (base plan + usage overages)
      const baseAmount = subscription.amount;
      const usageCharges = await this.calculateUsageCharges(subscription.tenantId, subscription.planId);
      const totalAmount = baseAmount + usageCharges.total;

      // Create invoice
      const invoice = await Invoice.create({
        tenantId: subscription.tenantId,
        subscriptionId,
        amount: totalAmount,
        currency: subscription.currency,
        status: 'pending',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        lineItems: [
          {
            description: `${subscription.planId.name} - ${subscription.billingCycle}`,
            amount: baseAmount,
            quantity: 1,
            type: 'subscription'
          },
          ...usageCharges.items
        ],
        metadata: {
          billingPeriod: {
            start: subscription.currentPeriodStart,
            end: subscription.currentPeriodEnd
          }
        }
      });

      // Record billing event
      await this.recordBillingEvent(subscription.tenantId, 'invoice_generated', {
        invoiceId: invoice._id,
        amount: totalAmount
      });

      logger.info(`Generated invoice ${invoice._id} for subscription ${subscriptionId}`);
      return invoice;

    } catch (error) {
      logger.error(`Failed to generate invoice for subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate usage charges for overage
   */
  async calculateUsageCharges(tenantId, plan) {
    try {
      const usage = this.usageCache.get(tenantId) || {};
      const charges = {
        items: [],
        total: 0
      };

      // Define overage rates
      const overageRates = {
        users: 5.00, // $5 per additional user
        transactions: 0.01, // $0.01 per additional transaction
        storage: 0.10, // $0.10 per additional GB
        api_calls: 0.001 // $0.001 per additional API call
      };

      const limits = {
        users: plan.features.maxUsers,
        transactions: plan.features.maxTransactions,
        storage: plan.features.maxStorage / (1024 * 1024 * 1024), // Convert to GB
        api_calls: plan.features.maxApiCalls
      };

      for (const [metric, limit] of Object.entries(limits)) {
        if (limit !== -1 && (usage[metric] || 0) > limit) {
          const overage = usage[metric] - limit;
          const chargeAmount = overage * overageRates[metric];
          
          charges.items.push({
            description: `${metric.replace('_', ' ')} overage (${overage} units)`,
            amount: chargeAmount,
            quantity: overage,
            type: 'overage'
          });
          
          charges.total += chargeAmount;
        }
      }

      return charges;

    } catch (error) {
      logger.error(`Failed to calculate usage charges for tenant ${tenantId}:`, error);
      return { items: [], total: 0 };
    }
  }

  /**
   * Process payment for invoice
   */
  async processPayment(invoiceId, paymentMethodId = null) {
    try {
      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Get payment method
      const PaymentMethod = mongoose.model('PaymentMethod');
      const paymentMethod = paymentMethodId 
        ? await PaymentMethod.findById(paymentMethodId)
        : await PaymentMethod.findOne({ tenantId: invoice.tenantId, isDefault: true });

      if (!paymentMethod) {
        throw new Error('No payment method available');
      }

      // Process payment based on provider
      let paymentResult;
      switch (paymentMethod.provider) {
        case 'stripe':
          paymentResult = await this.processStripePayment(invoice, paymentMethod);
          break;
        case 'paypal':
          paymentResult = await this.processPayPalPayment(invoice, paymentMethod);
          break;
        default:
          throw new Error(`Unsupported payment provider: ${paymentMethod.provider}`);
      }

      if (paymentResult.success) {
        // Update invoice status
        invoice.status = 'paid';
        invoice.paidAt = new Date();
        invoice.paymentId = paymentResult.paymentId;
        await invoice.save();

        // Record billing event
        await this.recordBillingEvent(invoice.tenantId, 'payment_processed', {
          invoiceId,
          amount: invoice.amount,
          paymentId: paymentResult.paymentId
        });

        logger.info(`Payment processed for invoice ${invoiceId}`);
      } else {
        // Update invoice status
        invoice.status = 'failed';
        invoice.metadata.paymentError = paymentResult.error;
        await invoice.save();

        // Record billing event
        await this.recordBillingEvent(invoice.tenantId, 'payment_failed', {
          invoiceId,
          error: paymentResult.error
        });

        logger.error(`Payment failed for invoice ${invoiceId}:`, paymentResult.error);
      }

      return paymentResult;

    } catch (error) {
      logger.error(`Failed to process payment for invoice ${invoiceId}:`, error);
      throw error;
    }
  }

  /**
   * Process Stripe payment
   */
  async processStripePayment(invoice, paymentMethod) {
    try {
      // Mock Stripe payment processing
      // In real implementation, use Stripe SDK
      const success = Math.random() > 0.1; // 90% success rate for demo
      
      if (success) {
        return {
          success: true,
          paymentId: `stripe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          transactionId: `txn_${Date.now()}`
        };
      } else {
        return {
          success: false,
          error: 'Insufficient funds'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process PayPal payment
   */
  async processPayPalPayment(invoice, paymentMethod) {
    try {
      // Mock PayPal payment processing
      // In real implementation, use PayPal SDK
      const success = Math.random() > 0.15; // 85% success rate for demo
      
      if (success) {
        return {
          success: true,
          paymentId: `paypal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          transactionId: `pp_${Date.now()}`
        };
      } else {
        return {
          success: false,
          error: 'PayPal payment declined'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Record billing event
   */
  async recordBillingEvent(tenantId, eventType, data) {
    try {
      const BillingEvent = mongoose.model('BillingEvent');
      await BillingEvent.create({
        tenantId,
        eventType,
        data,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error(`Failed to record billing event:`, error);
    }
  }

  /**
   * Start usage tracking background process
   */
  startUsageTracking() {
    // Reset usage cache daily
    setInterval(() => {
      this.usageCache.clear();
      logger.info('Usage cache reset');
    }, 24 * 60 * 60 * 1000); // Daily

    // Process billing events every hour
    setInterval(() => {
      this.processPendingBillingEvents();
    }, 60 * 60 * 1000); // Hourly
  }

  /**
   * Process pending billing events
   */
  async processPendingBillingEvents() {
    try {
      const BillingEvent = mongoose.model('BillingEvent');
      const pendingEvents = await BillingEvent.find({ processed: false }).limit(100);

      for (const event of pendingEvents) {
        try {
          await this.processBillingEvent(event);
          event.processed = true;
          await event.save();
        } catch (error) {
          logger.error(`Failed to process billing event ${event._id}:`, error);
        }
      }

      if (pendingEvents.length > 0) {
        logger.info(`Processed ${pendingEvents.length} billing events`);
      }

    } catch (error) {
      logger.error('Failed to process pending billing events:', error);
    }
  }

  /**
   * Process individual billing event
   */
  async processBillingEvent(event) {
    switch (event.eventType) {
      case 'usage_limit_exceeded':
        await this.handleUsageLimitExceeded(event);
        break;
      case 'subscription_expiring':
        await this.handleSubscriptionExpiring(event);
        break;
      case 'payment_failed':
        await this.handlePaymentFailed(event);
        break;
      default:
        // No action needed for other events
        break;
    }
  }

  /**
   * Handle usage limit exceeded
   */
  async handleUsageLimitExceeded(event) {
    // Send notification to tenant admin
    // Potentially upgrade plan automatically
    logger.info(`Handling usage limit exceeded for tenant ${event.tenantId}`);
  }

  /**
   * Handle subscription expiring
   */
  async handleSubscriptionExpiring(event) {
    // Send renewal reminders
    // Auto-renew if enabled
    logger.info(`Handling subscription expiring for tenant ${event.tenantId}`);
  }

  /**
   * Handle payment failed
   */
  async handlePaymentFailed(event) {
    // Retry payment
    // Send notifications
    // Potentially suspend service
    logger.info(`Handling payment failed for tenant ${event.tenantId}`);
  }

  /**
   * Calculate billing period end date
   */
  calculateBillingEnd(startDate, cycle) {
    const end = new Date(startDate);
    
    switch (cycle) {
      case this.billingCycles.MONTHLY:
        end.setMonth(end.getMonth() + 1);
        break;
      case this.billingCycles.QUARTERLY:
        end.setMonth(end.getMonth() + 3);
        break;
      case this.billingCycles.ANNUALLY:
        end.setFullYear(end.getFullYear() + 1);
        break;
    }
    
    return end;
  }

  /**
   * Get billing summary for tenant
   */
  async getBillingSummary(tenantId) {
    try {
      // Get current subscription
      const subscription = await Subscription.findOne({ 
        tenantId, 
        status: 'active' 
      }).populate('planId');

      // Get recent invoices
      const invoices = await Invoice.find({ tenantId })
        .sort({ createdAt: -1 })
        .limit(12);

      // Get usage for current period
      const usage = this.usageCache.get(tenantId) || {};

      // Calculate usage limits status
      const limitsStatus = await this.checkUsageLimits(tenantId);

      return {
        subscription: subscription ? {
          plan: subscription.planId.name,
          status: subscription.status,
          amount: subscription.amount,
          currency: subscription.currency,
          currentPeriod: {
            start: subscription.currentPeriodStart,
            end: subscription.currentPeriodEnd
          }
        } : null,
        usage: {
          current: usage,
          limits: limitsStatus.limits,
          violations: limitsStatus.violations
        },
        invoices: invoices.map(inv => ({
          id: inv._id,
          amount: inv.amount,
          status: inv.status,
          dueDate: inv.dueDate,
          createdAt: inv.createdAt
        })),
        summary: {
          totalInvoices: invoices.length,
          totalAmount: invoices.reduce((sum, inv) => sum + inv.amount, 0),
          paidInvoices: invoices.filter(inv => inv.status === 'paid').length,
          pendingInvoices: invoices.filter(inv => inv.status === 'pending').length
        }
      };

    } catch (error) {
      logger.error(`Failed to get billing summary for tenant ${tenantId}:`, error);
      throw error;
    }
  }
}

module.exports = new BillingService();