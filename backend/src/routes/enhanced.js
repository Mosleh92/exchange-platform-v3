// backend/src/routes/enhanced.js
const express = require('express');
const router = express.Router();

// Import services
const DatabaseManager = require('../core/database/DatabaseManager');
const BillingService = require('../services/billing/BillingService');
const SystemMonitoringService = require('../services/monitoring/SystemMonitoringService');
const FraudDetectionService = require('../services/intelligence/FraudDetectionService');
const BehavioralAnalyticsService = require('../services/intelligence/BehavioralAnalyticsService');
const AutoScalingService = require('../services/scaling/AutoScalingService');
const CachingService = require('../services/caching/CachingService');
const PerformanceOptimizationService = require('../services/performance/PerformanceOptimizationService');

// Import models
const Platform = require('../models/enhanced/Platform');
const EnhancedTenant = require('../models/enhanced/EnhancedTenant');
const EnhancedBranch = require('../models/enhanced/EnhancedBranch');
const EnhancedCustomer = require('../models/enhanced/EnhancedCustomer');

// Middleware
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const tenantMiddleware = require('../middleware/tenantIsolation');

/**
 * Enhanced Platform Management Routes
 * Provides comprehensive SaaS management capabilities
 */

// ===== PLATFORM MANAGEMENT =====

// Get platform overview
router.get('/platform/overview', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const platforms = await Platform.find().populate('createdBy', 'name email');
    
    const overview = await Promise.all(platforms.map(async (platform) => {
      const resourceUsage = await platform.getResourceUsage();
      return {
        ...platform.toObject(),
        resourceUsage
      };
    }));
    
    res.json({
      success: true,
      data: overview,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create new platform
router.post('/platform', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const platform = new Platform({
      ...req.body,
      createdBy: req.user.id
    });
    
    await platform.save();
    
    res.status(201).json({
      success: true,
      data: platform,
      message: 'Platform created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// ===== TENANT MANAGEMENT =====

// Get tenants with enhanced filtering and analytics
router.get('/tenants', authMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      tier,
      search
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (tier) filter.tier = tier;
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { subdomain: { $regex: search, $options: 'i' } }
      ];
    }

    const result = await EnhancedTenant.paginate(filter, {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: [
        { path: 'platformId', select: 'name code' },
        { path: 'subscription.planId', select: 'name price' }
      ],
      sort: { createdAt: -1 }
    });

    // Add dashboard stats for each tenant
    const tenantsWithStats = await Promise.all(
      result.docs.map(async (tenant) => {
        const stats = await tenant.getDashboardStats();
        return {
          ...tenant.toObject(),
          stats
        };
      })
    );

    res.json({
      success: true,
      data: {
        ...result,
        docs: tenantsWithStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create new tenant
router.post('/tenants', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const tenant = new EnhancedTenant({
      ...req.body,
      createdBy: req.user.id
    });
    
    await tenant.save();
    
    // Track billing usage
    await BillingService.trackUsage(tenant._id, 'tenants', 1);
    
    res.status(201).json({
      success: true,
      data: tenant,
      message: 'Tenant created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get tenant dashboard
router.get('/tenants/:tenantId/dashboard', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const tenant = await EnhancedTenant.findById(req.params.tenantId)
      .populate('platformId', 'name')
      .populate('subscription.planId', 'name features');
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found'
      });
    }

    const [
      stats,
      billingInfo,
      fraudDashboard,
      analyticsData,
      performanceData
    ] = await Promise.all([
      tenant.getDashboardStats(),
      BillingService.getBillingSummary(tenant._id),
      FraudDetectionService.getFraudDashboard(tenant._id),
      BehavioralAnalyticsService.getAnalyticsDashboard(tenant._id),
      PerformanceOptimizationService.getPerformanceReport()
    ]);

    res.json({
      success: true,
      data: {
        tenant: tenant.toObject(),
        stats,
        billing: billingInfo,
        fraud: fraudDashboard,
        analytics: analyticsData,
        performance: performanceData,
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== BRANCH MANAGEMENT =====

// Get branches with filtering
router.get('/tenants/:tenantId/branches', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      search
    } = req.query;

    const filter = { tenantId: req.params.tenantId };
    if (status) filter.status = status;
    if (type) filter.type = type;
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    const result = await EnhancedBranch.paginate(filter, {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: [
        { path: 'staff.userId', select: 'name email' }
      ],
      sort: { createdAt: -1 }
    });

    // Add dashboard stats for each branch
    const branchesWithStats = await Promise.all(
      result.docs.map(async (branch) => {
        const stats = await branch.getDashboardStats();
        return {
          ...branch.toObject(),
          stats
        };
      })
    );

    res.json({
      success: true,
      data: {
        ...result,
        docs: branchesWithStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create new branch
router.post('/tenants/:tenantId/branches', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const tenant = await EnhancedTenant.findById(req.params.tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found'
      });
    }

    // Check branch limits
    if (tenant.hasReachedLimit('branches')) {
      return res.status(400).json({
        success: false,
        error: 'Branch limit exceeded for this tenant'
      });
    }

    const branch = new EnhancedBranch({
      ...req.body,
      platformId: tenant.platformId,
      tenantId: req.params.tenantId,
      createdBy: req.user.id
    });
    
    await branch.save();
    
    // Update tenant usage
    await tenant.updateUsage('currentBranches', tenant.usage.currentBranches + 1);
    
    res.status(201).json({
      success: true,
      data: branch,
      message: 'Branch created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// ===== CUSTOMER MANAGEMENT =====

// Get customers with advanced filtering and analytics
router.get('/tenants/:tenantId/customers', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      kycStatus,
      riskLevel,
      search,
      branchId
    } = req.query;

    const filter = { tenantId: req.params.tenantId };
    if (status) filter['status.account'] = status;
    if (kycStatus) filter['kyc.status'] = kycStatus;
    if (riskLevel) filter['kyc.riskRating'] = riskLevel;
    if (branchId) filter.branchId = branchId;
    
    if (search) {
      const customers = await EnhancedCustomer.searchCustomers(
        search,
        req.params.tenantId,
        {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      );
      
      res.json({
        success: true,
        data: customers
      });
      return;
    }

    const result = await EnhancedCustomer.paginate(filter, {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: [
        { path: 'branchId', select: 'name code' }
      ],
      sort: { createdAt: -1 }
    });

    // Add summaries for each customer
    const customersWithSummaries = await Promise.all(
      result.docs.map(async (customer) => {
        const summary = await customer.getCustomerSummary();
        return {
          ...customer.toObject(),
          summary
        };
      })
    );

    res.json({
      success: true,
      data: {
        ...result,
        docs: customersWithSummaries
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create new customer
router.post('/tenants/:tenantId/customers', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const tenant = await EnhancedTenant.findById(req.params.tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found'
      });
    }

    // Check user limits
    if (tenant.hasReachedLimit('users')) {
      return res.status(400).json({
        success: false,
        error: 'User limit exceeded for this tenant'
      });
    }

    const customer = new EnhancedCustomer({
      ...req.body,
      platformId: tenant.platformId,
      tenantId: req.params.tenantId,
      createdBy: req.user.id
    });
    
    await customer.save();
    
    // Update tenant usage
    await tenant.updateUsage('currentUsers', tenant.usage.currentUsers + 1);
    
    // Track billing usage
    await BillingService.trackUsage(tenant._id, 'users', 1);
    
    res.status(201).json({
      success: true,
      data: customer,
      message: 'Customer created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get customer profile with analytics
router.get('/tenants/:tenantId/customers/:customerId', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const customer = await EnhancedCustomer.findOne({
      _id: req.params.customerId,
      tenantId: req.params.tenantId
    }).populate([
      { path: 'branchId', select: 'name code location' },
      { path: 'relationships.customerId', select: 'personalInfo.firstName personalInfo.lastName customerNumber' }
    ]);

    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    const [
      summary,
      transactionHistory,
      behaviorAnalysis
    ] = await Promise.all([
      customer.getCustomerSummary(),
      customer.getTransactionHistory(10),
      BehavioralAnalyticsService.analyzeTransactionPatterns(customer._id)
    ]);

    res.json({
      success: true,
      data: {
        customer: customer.toObject(),
        summary,
        transactionHistory,
        behaviorAnalysis,
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== SYSTEM HEALTH AND MONITORING =====

// Get comprehensive system health
router.get('/health/comprehensive', authMiddleware, async (req, res) => {
  try {
    const [
      dbHealth,
      monitoringHealth,
      performanceReport,
      cacheStats,
      scalingStatus
    ] = await Promise.all([
      DatabaseManager.getHealthMetrics(),
      SystemMonitoringService.getHealthDashboard(),
      PerformanceOptimizationService.getPerformanceReport(),
      CachingService.getCacheStats(),
      AutoScalingService.getScalingStatus()
    ]);

    res.json({
      success: true,
      data: {
        database: dbHealth,
        monitoring: monitoringHealth,
        performance: performanceReport,
        cache: cacheStats,
        scaling: scalingStatus,
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Performance optimization actions
router.post('/performance/optimize', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const fixes = await PerformanceOptimizationService.fixPerformanceIssues();
    
    res.json({
      success: true,
      data: {
        fixes,
        message: 'Performance optimization completed'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== BILLING AND SUBSCRIPTION MANAGEMENT =====

// Get billing overview for tenant
router.get('/tenants/:tenantId/billing', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const billingData = await BillingService.getBillingSummary(req.params.tenantId);
    
    res.json({
      success: true,
      data: billingData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Track usage
router.post('/tenants/:tenantId/billing/usage', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const { metric, value, metadata } = req.body;
    
    await BillingService.trackUsage(req.params.tenantId, metric, value, metadata);
    
    res.json({
      success: true,
      message: 'Usage tracked successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== ANALYTICS AND REPORTING =====

// Get tenant analytics overview
router.get('/tenants/:tenantId/analytics', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const [
      behaviorAnalytics,
      fraudDashboard,
      performanceMetrics
    ] = await Promise.all([
      BehavioralAnalyticsService.getAnalyticsDashboard(req.params.tenantId),
      FraudDetectionService.getFraudDashboard(req.params.tenantId),
      PerformanceOptimizationService.getPerformanceReport()
    ]);

    res.json({
      success: true,
      data: {
        behavior: behaviorAnalytics,
        fraud: fraudDashboard,
        performance: performanceMetrics,
        timestamp: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Track user session for behavioral analytics
router.post('/analytics/track-session', authMiddleware, async (req, res) => {
  try {
    const sessionData = {
      ...req.body,
      tenantId: req.tenantId,
      userId: req.user.id
    };
    
    const session = await BehavioralAnalyticsService.trackSession(sessionData);
    
    res.json({
      success: true,
      data: { sessionId: session.sessionId }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== CACHE MANAGEMENT =====

// Get cache statistics
router.get('/cache/stats', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const stats = CachingService.getCacheStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear cache
router.delete('/cache/clear', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { pattern } = req.query;
    
    let cleared;
    if (pattern) {
      cleared = await CachingService.invalidatePattern(pattern);
    } else {
      cleared = await CachingService.clearAll();
    }
    
    res.json({
      success: true,
      data: { cleared },
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;