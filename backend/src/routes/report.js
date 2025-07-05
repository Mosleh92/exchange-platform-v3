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

module.exports = router; 