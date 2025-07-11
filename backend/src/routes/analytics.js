const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const authMiddleware = require('../middleware/auth');
const auditMiddleware = require('../middleware/auditMiddleware');

/**
 * Analytics Routes
 * Comprehensive analytics endpoints for all modules
 */

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Apply audit middleware for analytics access
router.use(auditMiddleware.createRouteAuditMiddleware('ANALYTICS_ACCESS', 'ANALYTICS'));

/**
 * @route POST /api/analytics/profit-loss
 * @desc Generate comprehensive profit and loss analytics
 * @access Private
 */
router.post('/profit-loss', async (req, res) => {
  try {
    await analyticsController.generateProfitLossAnalytics(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate profit and loss analytics',
      details: error.message
    });
  }
});

/**
 * @route POST /api/analytics/commission
 * @desc Generate comprehensive commission analytics
 * @access Private
 */
router.post('/commission', async (req, res) => {
  try {
    await analyticsController.generateCommissionAnalytics(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate commission analytics',
      details: error.message
    });
  }
});

/**
 * @route POST /api/analytics/check-payment
 * @desc Generate comprehensive check payment analytics
 * @access Private
 */
router.post('/check-payment', async (req, res) => {
  try {
    await analyticsController.generateCheckPaymentAnalytics(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate check payment analytics',
      details: error.message
    });
  }
});

/**
 * @route POST /api/analytics/dashboard
 * @desc Generate comprehensive dashboard analytics
 * @access Private
 */
router.post('/dashboard', async (req, res) => {
  try {
    await analyticsController.generateDashboardAnalytics(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate dashboard analytics',
      details: error.message
    });
  }
});

/**
 * @route GET /api/analytics/real-time
 * @desc Generate real-time analytics
 * @access Private
 */
router.get('/real-time', async (req, res) => {
  try {
    await analyticsController.generateRealTimeAnalytics(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate real-time analytics',
      details: error.message
    });
  }
});

/**
 * @route POST /api/analytics/export
 * @desc Export analytics data in various formats
 * @access Private
 */
router.post('/export', async (req, res) => {
  try {
    await analyticsController.exportAnalyticsData(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to export analytics data',
      details: error.message
    });
  }
});

/**
 * @route GET /api/analytics/profit-loss/trends
 * @desc Get profit and loss trends
 * @access Private
 */
router.get('/profit-loss/trends', async (req, res) => {
  try {
    const { startDate, endDate, currency = 'USD', granularity = 'daily' } = req.query;
    const tenantId = req.headers['tenant-id'] || req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const profitLossAnalytics = require('../services/profitLossAnalytics.service');
    const report = await profitLossAnalytics.generateProfitLossReport({
      tenantId,
      startDate,
      endDate,
      currency,
      granularity
    });

    res.json({
      success: true,
      data: report.analytics.trends,
      message: 'Profit and loss trends retrieved successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve profit and loss trends',
      details: error.message
    });
  }
});

/**
 * @route GET /api/analytics/commission/partners
 * @desc Get commission partner analytics
 * @access Private
 */
router.get('/commission/partners', async (req, res) => {
  try {
    const { startDate, endDate, currency = 'USD' } = req.query;
    const tenantId = req.headers['tenant-id'] || req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const commissionAnalytics = require('../services/commissionAnalytics.service');
    const report = await commissionAnalytics.generateCommissionReport({
      tenantId,
      startDate,
      endDate,
      currency,
      granularity: 'daily'
    });

    res.json({
      success: true,
      data: report.analytics.partnerAnalytics,
      message: 'Commission partner analytics retrieved successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve commission partner analytics',
      details: error.message
    });
  }
});

/**
 * @route GET /api/analytics/check-payment/processing
 * @desc Get check payment processing analytics
 * @access Private
 */
router.get('/check-payment/processing', async (req, res) => {
  try {
    const { startDate, endDate, currency = 'USD' } = req.query;
    const tenantId = req.headers['tenant-id'] || req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const checkPaymentAnalytics = require('../services/checkPaymentAnalytics.service');
    const report = await checkPaymentAnalytics.generateCheckPaymentReport({
      tenantId,
      startDate,
      endDate,
      currency,
      granularity: 'daily'
    });

    res.json({
      success: true,
      data: report.analytics.processingAnalytics,
      message: 'Check payment processing analytics retrieved successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve check payment processing analytics',
      details: error.message
    });
  }
});

/**
 * @route GET /api/analytics/kpis
 * @desc Get key performance indicators
 * @access Private
 */
router.get('/kpis', async (req, res) => {
  try {
    const { startDate, endDate, currency = 'USD' } = req.query;
    const tenantId = req.headers['tenant-id'] || req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Get KPIs from all analytics services
    const [
      profitLossAnalytics,
      commissionAnalytics,
      checkPaymentAnalytics
    ] = require('../services');

    const [plKPIs, commissionKPIs, checkKPIs] = await Promise.all([
      profitLossAnalytics.calculateKPIs(tenantId, startDate, endDate, currency),
      commissionAnalytics.calculateCommissionKPIs(tenantId, null, startDate, endDate, currency),
      checkPaymentAnalytics.calculateCheckKPIs(tenantId, startDate, endDate, currency)
    ]);

    const kpis = {
      profitLoss: plKPIs,
      commission: commissionKPIs,
      checkPayments: checkKPIs,
      summary: {
        totalRevenue: plKPIs.totalRevenue,
        totalCommission: commissionKPIs.totalCommission,
        totalCheckAmount: checkKPIs.totalAmount,
        overallPerformance: this.calculateOverallPerformance(plKPIs, commissionKPIs, checkKPIs)
      }
    };

    res.json({
      success: true,
      data: kpis,
      message: 'Key performance indicators retrieved successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve key performance indicators',
      details: error.message
    });
  }
});

/**
 * @route GET /api/analytics/alerts
 * @desc Get analytics alerts
 * @access Private
 */
router.get('/alerts', async (req, res) => {
  try {
    const { startDate, endDate, currency = 'USD' } = req.query;
    const tenantId = req.headers['tenant-id'] || req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const alerts = await analyticsController.generateAlerts(tenantId, startDate, endDate, currency);

    res.json({
      success: true,
      data: alerts,
      message: 'Analytics alerts retrieved successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analytics alerts',
      details: error.message
    });
  }
});

/**
 * @route GET /api/analytics/recommendations
 * @desc Get analytics recommendations
 * @access Private
 */
router.get('/recommendations', async (req, res) => {
  try {
    const { startDate, endDate, currency = 'USD' } = req.query;
    const tenantId = req.headers['tenant-id'] || req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const recommendations = await analyticsController.generateRecommendations(tenantId, startDate, endDate, currency);

    res.json({
      success: true,
      data: recommendations,
      message: 'Analytics recommendations retrieved successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve analytics recommendations',
      details: error.message
    });
  }
});

/**
 * @route GET /api/analytics/cache/clear
 * @desc Clear analytics cache
 * @access Private (Admin only)
 */
router.get('/cache/clear', async (req, res) => {
  try {
    // Check if user has admin privileges
    if (!req.user?.role || !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    const [
      profitLossAnalytics,
      commissionAnalytics,
      checkPaymentAnalytics
    ] = require('../services');

    // Clear all analytics caches
    profitLossAnalytics.analyticsCache.clear();
    commissionAnalytics.commissionCache.clear();
    checkPaymentAnalytics.checkAnalyticsCache.clear();

    res.json({
      success: true,
      message: 'Analytics cache cleared successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear analytics cache',
      details: error.message
    });
  }
});

/**
 * Helper method to calculate overall performance
 */
calculateOverallPerformance(plKPIs, commissionKPIs, checkKPIs) {
  // Calculate weighted performance score
  const profitScore = plKPIs.profitMargin / 100;
  const commissionScore = commissionKPIs.conversionRate / 100;
  const processingScore = checkKPIs.processingRate / 100;

  const overallScore = (profitScore + commissionScore + processingScore) / 3 * 100;

  return {
    score: Math.round(overallScore * 100) / 100,
    grade: overallScore >= 90 ? 'A' : 
           overallScore >= 80 ? 'B' : 
           overallScore >= 70 ? 'C' : 
           overallScore >= 60 ? 'D' : 'F',
    status: overallScore >= 80 ? 'EXCELLENT' : 
            overallScore >= 70 ? 'GOOD' : 
            overallScore >= 60 ? 'FAIR' : 'NEEDS_IMPROVEMENT'
  };
}

module.exports = router; 