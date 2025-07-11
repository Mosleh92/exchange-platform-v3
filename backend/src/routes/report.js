const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authorize } = require('../middleware/roleAccess');
const auth = require('../middleware/auth');

router.get('/volume/daily', reportController.dailyVolume);
router.get('/profit-loss/daily', reportController.profitAndLoss);
router.get('/reconciliation', authorize(['super_admin', 'tenant_admin']), reportController.getReconciliationReport);
router.get('/financial', auth, reportController.financialReport);
router.get('/discrepancies', auth, reportController.discrepancyReport);
router.get('/financial/excel', auth, reportController.financialReportExcel);
router.get('/discrepancies/excel', auth, reportController.discrepancyReportExcel);
router.get('/transactions/summary', auth, reportController.transactionSummary);
router.get('/accounts/summary', auth, reportController.accountBalanceSummary);
router.get('/profit-loss', auth, reportController.profitAndLoss);
router.get('/transactions/trend', auth, reportController.transactionTrend);

/**
 * Business Intelligence Report Endpoints
 */

/**
 * @route POST /api/reports/generate
 * @desc Generate custom BI report
 * @access Private
 */
router.post('/generate', auth, async (req, res) => {
  try {
    const reportConfig = req.body;
    const tenantId = req.headers['tenant-id'] || req.user?.tenantId;

    // Mock report generation
    const reportId = `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const report = {
      id: reportId,
      name: reportConfig.name || 'گزارش بدون نام',
      type: reportConfig.type || 'custom',
      status: 'completed',
      createdAt: new Date().toISOString(),
      data: {
        // Mock data based on report configuration
        summary: {
          totalRecords: Math.floor(Math.random() * 1000) + 100,
          dateRange: reportConfig.dateRange,
          filters: reportConfig.filters?.length || 0
        },
        results: generateMockReportData(reportConfig)
      }
    };

    res.json({
      success: true,
      data: report,
      message: 'Report generated successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate report',
      details: error.message
    });
  }
});

/**
 * @route GET /api/reports/export/:id
 * @desc Export report in specified format
 * @access Private
 */
router.get('/export/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'pdf' } = req.query;

    // Mock export data
    const exportData = {
      reportId: id,
      format: format,
      downloadUrl: `/downloads/reports/${id}.${format}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };

    res.json({
      success: true,
      data: exportData,
      message: `Report exported as ${format.toUpperCase()} successfully`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to export report',
      details: error.message
    });
  }
});

/**
 * @route GET /api/reports/saved
 * @desc Get saved reports for tenant
 * @access Private
 */
router.get('/saved', auth, async (req, res) => {
  try {
    const { tenant_id } = req.query;
    const tenantId = tenant_id || req.headers['tenant-id'] || req.user?.tenantId;

    // Mock saved reports
    const savedReports = [
      {
        id: 1,
        name: 'گزارش درآمد ماهانه',
        type: 'revenue',
        lastGenerated: '۱۴۰۳/۰۹/۰۷',
        status: 'completed',
        format: 'pdf'
      },
      {
        id: 2,
        name: 'تحلیل رفتار مشتریان',
        type: 'customer',
        lastGenerated: '۱۴۰۳/۰۹/۰۶',
        status: 'scheduled',
        format: 'excel'
      },
      {
        id: 3,
        name: 'گزارش عملکرد سیستم',
        type: 'performance',
        lastGenerated: '۱۴۰۳/۰۹/۰۵',
        status: 'completed',
        format: 'csv'
      }
    ];

    res.json({
      success: true,
      data: savedReports,
      message: 'Saved reports retrieved successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve saved reports',
      details: error.message
    });
  }
});

/**
 * Helper function to generate mock report data
 */
function generateMockReportData(config) {
  const { dataSources = [], fields = [], visualizations = [] } = config;
  
  // Generate mock data based on configuration
  const mockData = [];
  const recordCount = Math.floor(Math.random() * 100) + 20;
  
  for (let i = 0; i < recordCount; i++) {
    const record = {};
    
    fields.forEach(field => {
      switch (field.type) {
        case 'number':
          record[field.id] = Math.floor(Math.random() * 1000000) + 1000;
          break;
        case 'date':
          record[field.id] = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case 'string':
        default:
          record[field.id] = `نمونه ${field.name} ${i + 1}`;
          break;
      }
    });
    
    mockData.push(record);
  }
  
  return mockData;
}

module.exports = router; 