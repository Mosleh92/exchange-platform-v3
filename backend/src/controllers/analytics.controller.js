const profitLossAnalytics = require('../services/profitLossAnalytics.service');
const commissionAnalytics = require('../services/commissionAnalytics.service');
const checkPaymentAnalytics = require('../services/checkPaymentAnalytics.service');
const logger = require('../utils/logger');

/**
 * Comprehensive Analytics Controller
 * Integrates all advanced analytics services
 */
class AnalyticsController {
  /**
   * Generate comprehensive profit and loss analytics
   */
  async generateProfitLossAnalytics(req, res) {
    try {
      const {
        startDate,
        endDate,
        currency = 'USD',
        granularity = 'daily',
        includeMetrics = []
      } = req.body;

      const tenantId = req.headers['tenant-id'] || req.user?.tenantId;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      const report = await profitLossAnalytics.generateProfitLossReport({
        tenantId,
        startDate,
        endDate,
        currency,
        granularity,
        includeMetrics
      });

      logger.info('Profit & Loss analytics generated successfully', {
        tenantId,
        startDate,
        endDate,
        currency
      });

      res.json({
        success: true,
        data: report,
        message: 'Profit & Loss analytics generated successfully'
      });

    } catch (error) {
      logger.error('Failed to generate P&L analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate profit and loss analytics',
        details: error.message
      });
    }
  }

  /**
   * Generate comprehensive commission analytics
   */
  async generateCommissionAnalytics(req, res) {
    try {
      const {
        partnerId,
        startDate,
        endDate,
        currency = 'USD',
        granularity = 'daily'
      } = req.body;

      const tenantId = req.headers['tenant-id'] || req.user?.tenantId;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      const report = await commissionAnalytics.generateCommissionReport({
        tenantId,
        partnerId,
        startDate,
        endDate,
        currency,
        granularity
      });

      logger.info('Commission analytics generated successfully', {
        tenantId,
        partnerId,
        startDate,
        endDate,
        currency
      });

      res.json({
        success: true,
        data: report,
        message: 'Commission analytics generated successfully'
      });

    } catch (error) {
      logger.error('Failed to generate commission analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate commission analytics',
        details: error.message
      });
    }
  }

  /**
   * Generate comprehensive check payment analytics
   */
  async generateCheckPaymentAnalytics(req, res) {
    try {
      const {
        startDate,
        endDate,
        currency = 'USD',
        granularity = 'daily',
        includeMetrics = []
      } = req.body;

      const tenantId = req.headers['tenant-id'] || req.user?.tenantId;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      const report = await checkPaymentAnalytics.generateCheckPaymentReport({
        tenantId,
        startDate,
        endDate,
        currency,
        granularity,
        includeMetrics
      });

      logger.info('Check payment analytics generated successfully', {
        tenantId,
        startDate,
        endDate,
        currency
      });

      res.json({
        success: true,
        data: report,
        message: 'Check payment analytics generated successfully'
      });

    } catch (error) {
      logger.error('Failed to generate check payment analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate check payment analytics',
        details: error.message
      });
    }
  }

  /**
   * Generate comprehensive dashboard analytics
   */
  async generateDashboardAnalytics(req, res) {
    try {
      const {
        startDate,
        endDate,
        currency = 'USD'
      } = req.body;

      const tenantId = req.headers['tenant-id'] || req.user?.tenantId;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      // Generate all analytics in parallel
      const [plReport, commissionReport, checkReport] = await Promise.all([
        profitLossAnalytics.generateProfitLossReport({
          tenantId,
          startDate,
          endDate,
          currency,
          granularity: 'daily'
        }),
        commissionAnalytics.generateCommissionReport({
          tenantId,
          startDate,
          endDate,
          currency,
          granularity: 'daily'
        }),
        checkPaymentAnalytics.generateCheckPaymentReport({
          tenantId,
          startDate,
          endDate,
          currency,
          granularity: 'daily'
        })
      ]);

      // Combine analytics into dashboard
      const dashboard = {
        period: { startDate, endDate },
        currency,
        summary: {
          totalRevenue: plReport.summary.totalRevenue,
          totalExpenses: plReport.summary.totalExpenses,
          netProfit: plReport.summary.netProfit,
          totalCommission: commissionReport.summary.totalCommission,
          totalChecks: checkReport.summary.totalChecks,
          totalCheckAmount: checkReport.summary.totalAmount
        },
        keyMetrics: {
          profitMargin: plReport.summary.profitMargin,
          growthRate: plReport.summary.growthRate,
          roi: plReport.summary.roi,
          processingRate: checkReport.summary.processingRate,
          fraudRate: checkReport.summary.fraudRate,
          conversionRate: commissionReport.summary.conversionRate
        },
        trends: {
          profitLoss: plReport.analytics.trends,
          commission: commissionReport.analytics.trends,
          checkPayments: checkReport.analytics.trends
        },
        alerts: await this.generateAlerts(tenantId, startDate, endDate, currency),
        recommendations: await this.generateRecommendations(tenantId, startDate, endDate, currency)
      };

      logger.info('Dashboard analytics generated successfully', {
        tenantId,
        startDate,
        endDate,
        currency
      });

      res.json({
        success: true,
        data: dashboard,
        message: 'Dashboard analytics generated successfully'
      });

    } catch (error) {
      logger.error('Failed to generate dashboard analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate dashboard analytics',
        details: error.message
      });
    }
  }

  /**
   * Generate real-time analytics
   */
  async generateRealTimeAnalytics(req, res) {
    try {
      const { currency = 'USD' } = req.query;
      const tenantId = req.headers['tenant-id'] || req.user?.tenantId;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      // Get real-time data for last 24 hours
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

      const [plRealTime, commissionRealTime, checkRealTime] = await Promise.all([
        profitLossAnalytics.generateProfitLossReport({
          tenantId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          currency,
          granularity: 'hourly'
        }),
        commissionAnalytics.generateCommissionReport({
          tenantId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          currency,
          granularity: 'hourly'
        }),
        checkPaymentAnalytics.generateCheckPaymentReport({
          tenantId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          currency,
          granularity: 'hourly'
        })
      ]);

      const realTimeData = {
        timestamp: new Date().toISOString(),
        currency,
        profitLoss: {
          currentRevenue: plRealTime.summary.totalRevenue,
          currentExpenses: plRealTime.summary.totalExpenses,
          currentProfit: plRealTime.summary.netProfit
        },
        commission: {
          currentCommission: commissionRealTime.summary.totalCommission,
          activePartners: commissionRealTime.summary.topPerformers.length
        },
        checkPayments: {
          currentChecks: checkRealTime.summary.totalChecks,
          currentAmount: checkRealTime.summary.totalAmount,
          processingRate: checkRealTime.summary.processingRate
        }
      };

      res.json({
        success: true,
        data: realTimeData,
        message: 'Real-time analytics generated successfully'
      });

    } catch (error) {
      logger.error('Failed to generate real-time analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate real-time analytics',
        details: error.message
      });
    }
  }

  /**
   * Generate alerts based on analytics
   */
  async generateAlerts(tenantId, startDate, endDate, currency) {
    const alerts = [];

    try {
      // Check for negative profit trends
      const plReport = await profitLossAnalytics.generateProfitLossReport({
        tenantId,
        startDate,
        endDate,
        currency,
        granularity: 'daily'
      });

      if (plReport.summary.netProfit < 0) {
        alerts.push({
          type: 'WARNING',
          category: 'PROFIT_LOSS',
          message: 'Negative profit detected',
          severity: 'HIGH',
          recommendation: 'Review expenses and revenue streams'
        });
      }

      // Check for high fraud rates
      const checkReport = await checkPaymentAnalytics.generateCheckPaymentReport({
        tenantId,
        startDate,
        endDate,
        currency,
        granularity: 'daily'
      });

      if (checkReport.summary.fraudRate > 5) {
        alerts.push({
          type: 'ALERT',
          category: 'FRAUD',
          message: 'High fraud rate detected',
          severity: 'CRITICAL',
          recommendation: 'Review fraud detection mechanisms'
        });
      }

      // Check for low processing rates
      if (checkReport.summary.processingRate < 80) {
        alerts.push({
          type: 'WARNING',
          category: 'PROCESSING',
          message: 'Low check processing rate',
          severity: 'MEDIUM',
          recommendation: 'Review processing workflows'
        });
      }

      return alerts;

    } catch (error) {
      logger.error('Failed to generate alerts:', error);
      return [];
    }
  }

  /**
   * Generate recommendations based on analytics
   */
  async generateRecommendations(tenantId, startDate, endDate, currency) {
    const recommendations = [];

    try {
      // Analyze profit trends
      const plReport = await profitLossAnalytics.generateProfitLossReport({
        tenantId,
        startDate,
        endDate,
        currency,
        granularity: 'daily'
      });

      if (plReport.summary.profitMargin < 10) {
        recommendations.push({
          category: 'PROFIT_OPTIMIZATION',
          priority: 'HIGH',
          title: 'Optimize Profit Margins',
          description: 'Current profit margin is below industry average',
          actions: [
            'Review pricing strategies',
            'Identify cost reduction opportunities',
            'Analyze revenue streams'
          ]
        });
      }

      // Analyze commission performance
      const commissionReport = await commissionAnalytics.generateCommissionReport({
        tenantId,
        startDate,
        endDate,
        currency,
        granularity: 'daily'
      });

      if (commissionReport.summary.conversionRate < 50) {
        recommendations.push({
          category: 'COMMISSION_OPTIMIZATION',
          priority: 'MEDIUM',
          title: 'Improve Partner Conversion',
          description: 'Partner conversion rate needs improvement',
          actions: [
            'Review partner onboarding process',
            'Enhance partner incentives',
            'Improve partner support'
          ]
        });
      }

      // Analyze check payment efficiency
      const checkReport = await checkPaymentAnalytics.generateCheckPaymentReport({
        tenantId,
        startDate,
        endDate,
        currency,
        granularity: 'daily'
      });

      if (checkReport.summary.processingRate < 90) {
        recommendations.push({
          category: 'PROCESSING_OPTIMIZATION',
          priority: 'MEDIUM',
          title: 'Improve Check Processing',
          description: 'Check processing efficiency can be improved',
          actions: [
            'Review processing workflows',
            'Implement automation where possible',
            'Train processing staff'
          ]
        });
      }

      return recommendations;

    } catch (error) {
      logger.error('Failed to generate recommendations:', error);
      return [];
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalyticsData(req, res) {
    try {
      const {
        type, // 'profit-loss', 'commission', 'check-payment', 'dashboard'
        startDate,
        endDate,
        currency = 'USD',
        format = 'json' // 'json', 'csv', 'excel'
      } = req.body;

      const tenantId = req.headers['tenant-id'] || req.user?.tenantId;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      let data;
      switch (type) {
        case 'profit-loss':
          data = await profitLossAnalytics.generateProfitLossReport({
            tenantId,
            startDate,
            endDate,
            currency,
            granularity: 'daily'
          });
          break;
        case 'commission':
          data = await commissionAnalytics.generateCommissionReport({
            tenantId,
            startDate,
            endDate,
            currency,
            granularity: 'daily'
          });
          break;
        case 'check-payment':
          data = await checkPaymentAnalytics.generateCheckPaymentReport({
            tenantId,
            startDate,
            endDate,
            currency,
            granularity: 'daily'
          });
          break;
        case 'dashboard':
          data = await this.generateDashboardAnalytics(req, res);
          return; // Already sent response
        default:
          return res.status(400).json({ error: 'Invalid analytics type' });
      }

      // Handle different export formats
      if (format === 'csv') {
        const csv = this.convertToCSV(data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${type}-analytics-${startDate}-${endDate}.csv`);
        return res.send(csv);
      } else if (format === 'excel') {
        // Implementation for Excel export
        return res.status(501).json({ error: 'Excel export not implemented yet' });
      } else {
        // Default JSON response
        res.json({
          success: true,
          data,
          message: `${type} analytics exported successfully`
        });
      }

    } catch (error) {
      logger.error('Failed to export analytics data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export analytics data',
        details: error.message
      });
    }
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(data) {
    // Implementation for CSV conversion
    return JSON.stringify(data);
  }
}

module.exports = new AnalyticsController(); 