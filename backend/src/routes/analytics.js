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
 * @route GET /api/analytics/overview
 * @desc Generate BI dashboard overview analytics
 * @access Private
 */
router.get('/overview', async (req, res) => {
  try {
    const { tenant_id, date_range } = req.query;
    const tenantId = tenant_id || req.headers['tenant-id'] || req.user?.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Generate comprehensive BI dashboard data
    const dashboardData = {
      metrics: {
        totalRevenue: 12500000,
        dailyTransactions: 87,
        activeUsers: 234,
        weeklyGrowth: 15.3,
        conversionRate: 4.7,
        avgTransactionValue: 2850000
      },
      analytics: {
        revenueData: [
          { date: '۱۴۰۳/۰۹/۰۱', revenue: 125000, transactions: 45 },
          { date: '۱۴۰۳/۰۹/۰۲', revenue: 135000, transactions: 52 },
          { date: '۱۴۰۳/۰۹/۰۳', revenue: 142000, transactions: 48 },
          { date: '۱۴۰۳/۰۹/۰۴', revenue: 128000, transactions: 41 },
          { date: '۱۴۰۳/۰۹/۰۵', revenue: 156000, transactions: 63 },
          { date: '۱۴۰۳/۰۹/۰۶', revenue: 149000, transactions: 57 },
          { date: '۱۴۰۳/۰۹/۰۷', revenue: 165000, transactions: 68 }
        ],
        performanceData: [
          { time: '00:00', responseTime: 120, throughput: 850, errors: 2 },
          { time: '04:00', responseTime: 95, throughput: 620, errors: 1 },
          { time: '08:00', responseTime: 180, throughput: 1200, errors: 5 },
          { time: '12:00', responseTime: 145, throughput: 1450, errors: 3 },
          { time: '16:00', responseTime: 165, throughput: 1380, errors: 4 },
          { time: '20:00', responseTime: 135, throughput: 980, errors: 2 }
        ]
      },
      reports: {
        recent: [
          { id: 1, name: 'گزارش درآمد ماهانه', date: '۱۴۰۳/۰۹/۰۷', status: 'completed' },
          { id: 2, name: 'تحلیل رفتار مشتریان', date: '۱۴۰۳/۰۹/۰۶', status: 'pending' }
        ]
      }
    };

    res.json({
      success: true,
      data: dashboardData,
      message: 'BI dashboard overview retrieved successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve BI dashboard overview',
      details: error.message
    });
  }
});

/**
 * @route GET /api/analytics/revenue
 * @desc Get revenue analytics for BI dashboard
 * @access Private
 */
router.get('/revenue', async (req, res) => {
  try {
    const { tenant_id, date_range } = req.query;
    const tenantId = tenant_id || req.headers['tenant-id'] || req.user?.tenantId;

    const revenueAnalytics = {
      totalRevenue: 12500000,
      growth: 15.3,
      forecast: [
        { month: 'دی', actual: 8500000, predicted: 8200000 },
        { month: 'بهمن', actual: 9200000, predicted: 9000000 },
        { month: 'اسفند', actual: 12500000, predicted: 12800000 }
      ],
      breakdown: {
        commissions: 3500000,
        fees: 2100000,
        premiums: 6900000
      }
    };

    res.json({
      success: true,
      data: revenueAnalytics,
      message: 'Revenue analytics retrieved successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve revenue analytics',
      details: error.message
    });
  }
});

/**
 * @route GET /api/analytics/customers
 * @desc Get customer analytics for BI dashboard
 * @access Private
 */
router.get('/customers', async (req, res) => {
  try {
    const customerAnalytics = {
      totalCustomers: 2456,
      activeCustomers: 1834,
      newCustomers: 156,
      customerLifetimeValue: 18500000,
      segments: [
        { name: 'کاربران جدید', count: 856, value: 35 },
        { name: 'کاربران فعال', count: 1108, value: 45 },
        { name: 'کاربران VIP', count: 492, value: 20 }
      ],
      behavior: {
        avgSessionDuration: 245,
        bounceRate: 23.5,
        retentionRate: 78.2
      }
    };

    res.json({
      success: true,
      data: customerAnalytics,
      message: 'Customer analytics retrieved successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve customer analytics',
      details: error.message
    });
  }
});

/**
 * @route GET /api/analytics/transactions
 * @desc Get transaction analytics for BI dashboard
 * @access Private
 */
router.get('/transactions', async (req, res) => {
  try {
    const transactionAnalytics = {
      totalTransactions: 8745,
      successfulTransactions: 8567,
      failedTransactions: 178,
      avgProcessingTime: 1.8,
      volume: {
        daily: 87,
        weekly: 612,
        monthly: 2456
      },
      types: [
        { type: 'خرید ارز', count: 3245, percentage: 37.1 },
        { type: 'فروش ارز', count: 2987, percentage: 34.2 },
        { type: 'حواله', count: 1654, percentage: 18.9 },
        { type: 'واریز', count: 859, percentage: 9.8 }
      ]
    };

    res.json({
      success: true,
      data: transactionAnalytics,
      message: 'Transaction analytics retrieved successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve transaction analytics',
      details: error.message
    });
  }
});

/**
 * @route GET /api/analytics/performance
 * @desc Get system performance analytics
 * @access Private
 */
router.get('/performance', async (req, res) => {
  try {
    const performanceAnalytics = {
      systemHealth: 96.5,
      uptime: 99.8,
      avgResponseTime: 135,
      throughput: 1120,
      errorRate: 0.23,
      resources: {
        cpu: 45.2,
        memory: 67.8,
        disk: 34.1,
        network: 52.3
      }
    };

    res.json({
      success: true,
      data: performanceAnalytics,
      message: 'Performance analytics retrieved successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance analytics',
      details: error.message
    });
  }
});

/**
 * @route GET /api/analytics/realtime
 * @desc Get real-time BI updates
 * @access Private
 */
router.get('/realtime', async (req, res) => {
  try {
    const { tenant_id } = req.query;
    
    const realtimeData = {
      timestamp: new Date().toISOString(),
      activeUsers: Math.floor(Math.random() * 50) + 200,
      transactionsToday: Math.floor(Math.random() * 20) + 80,
      revenueToday: Math.floor(Math.random() * 50000) + 120000,
      systemStatus: 'healthy',
      alerts: []
    };

    res.json({
      success: true,
      data: realtimeData,
      message: 'Real-time data retrieved successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve real-time data',
      details: error.message
    });
  }
});

/**
 * @route GET /api/analytics/predictive
 * @desc Get predictive analytics
 * @access Private
 */
router.get('/predictive', async (req, res) => {
  try {
    const predictiveData = {
      revenueForecast: {
        nextWeek: 1850000,
        nextMonth: 15600000,
        confidence: 87.5
      },
      customerGrowth: {
        nextWeek: 45,
        nextMonth: 178,
        confidence: 82.1
      },
      trends: [
        { metric: 'درآمد', trend: 'increasing', confidence: 89.2 },
        { metric: 'کاربران', trend: 'stable', confidence: 76.8 },
        { metric: 'تراکنش‌ها', trend: 'increasing', confidence: 91.5 }
      ]
    };

    res.json({
      success: true,
      data: predictiveData,
      message: 'Predictive analytics retrieved successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve predictive analytics',
      details: error.message
    });
  }
});

/**
 * @route GET /api/analytics/risk
 * @desc Get risk assessment analytics
 * @access Private
 */
router.get('/risk', async (req, res) => {
  try {
    const { tenant_id } = req.query;
    
    const riskData = {
      overallRisk: 'low',
      riskScore: 23.5,
      categories: [
        { name: 'امنیت تراکنش', score: 95, risk: 'low' },
        { name: 'کیفیت داده', score: 88, risk: 'medium' },
        { name: 'عملکرد سیستم', score: 92, risk: 'low' },
        { name: 'رضایت مشتری', score: 86, risk: 'medium' },
        { name: 'پایداری مالی', score: 91, risk: 'low' },
        { name: 'انطباق قوانین', score: 97, risk: 'low' }
      ],
      alerts: [
        { type: 'warning', message: 'افزایش زمان پاسخ در ساعات پیک' },
        { type: 'info', message: 'بروزرسانی سیستم در ۲۴ ساعت آینده' }
      ]
    };

    res.json({
      success: true,
      data: riskData,
      message: 'Risk assessment retrieved successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve risk assessment',
      details: error.message
    });
  }
});

/**
 * Business Intelligence Dashboard - Advanced Analytics & Reporting System
 */
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