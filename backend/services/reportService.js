// backend/src/services/reportService.js
const Account = require('../models/accounting/Account');
const Transaction = require('../models/accounting/Transaction');
const GeneralLedger = require('../models/accounting/GeneralLedger');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

class ReportService {
  // Trial Balance Report
  async generateTrialBalance(tenantId, asOfDate = new Date()) {
    try {
      const accounts = await Account.find({ tenantId, isActive: true })
        .sort({ accountCode: 1 });

      const trialBalance = [];
      let totalDebits = 0;
      let totalCredits = 0;

      for (const account of accounts) {
        const balance = await this.getAccountBalance(account._id, asOfDate);
        
        if (balance !== 0) {
          const entry = {
            accountCode: account.accountCode,
            accountName: account.accountName,
            accountType: account.accountType,
            debitBalance: ['asset', 'expense'].includes(account.accountType) && balance > 0 ? balance : 0,
            creditBalance: ['liability', 'equity', 'revenue'].includes(account.accountType) && balance > 0 ? balance : 0
          };

          trialBalance.push(entry);
          totalDebits += entry.debitBalance;
          totalCredits += entry.creditBalance;
        }
      }

      return {
        trialBalance,
        totalDebits,
        totalCredits,
        isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
        asOfDate,
        generatedAt: new Date()
      };

    } catch (error) {
      throw new Error(`Error generating trial balance: ${error.message}`);
    }
  }

  // Cash Flow Statement
  async generateCashFlowStatement(tenantId, startDate, endDate) {
    try {
      const operatingActivities = await this.getOperatingCashFlow(tenantId, startDate, endDate);
      const investingActivities = await this.getInvestingCashFlow(tenantId, startDate, endDate);
      const financingActivities = await this.getFinancingCashFlow(tenantId, startDate, endDate);

      const netCashFlow = operatingActivities.net + investingActivities.net + financingActivities.net;
      const beginningCash = await this.getCashBalance(tenantId, startDate);
      const endingCash = beginningCash + netCashFlow;

      return {
        period: { startDate, endDate },
        operatingActivities,
        investingActivities,
        financingActivities,
        netCashFlow,
        beginningCash,
        endingCash,
        generatedAt: new Date()
      };

    } catch (error) {
      throw new Error(`Error generating cash flow statement: ${error.message}`);
    }
  }

  // Tenant Performance Comparison
  async generateTenantComparison(superAdminId, period = 'monthly') {
    try {
      const tenants = await Tenant.find({ superAdminId }).populate('tenantId');
      const comparison = [];

      for (const tenant of tenants) {
        const metrics = await this.getTenantMetrics(tenant._id, period);
        comparison.push({
          tenantName: tenant.name,
          tenantType: tenant.type,
          metrics
        });
      }

      // Sort by revenue descending
      comparison.sort((a, b) => b.metrics.totalRevenue - a.metrics.totalRevenue);

      return {
        period,
        comparison,
        summary: {
          totalTenants: comparison.length,
          totalRevenue: comparison.reduce((sum, t) => sum + t.metrics.totalRevenue, 0),
          averageRevenue: comparison.reduce((sum, t) => sum + t.metrics.totalRevenue, 0) / comparison.length,
          topPerformer: comparison[0]?.tenantName
        },
        generatedAt: new Date()
      };

    } catch (error) {
      throw new Error(`Error generating tenant comparison: ${error.message}`);
    }
  }

  // Export to Excel
  async exportToExcel(reportData, reportType) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(reportType);

    // Add headers and styling based on report type
    switch (reportType) {
      case 'trial_balance':
        this.formatTrialBalanceExcel(worksheet, reportData);
        break;
      case 'cash_flow':
        this.formatCashFlowExcel(worksheet, reportData);
        break;
      case 'tenant_comparison':
        this.formatTenantComparisonExcel(worksheet, reportData);
        break;
    }

    return workbook;
  }

  // Export to PDF
  async exportToPDF(reportData, reportType) {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Add header
    doc.fontSize(16).text('Exchange Platform Report', { align: 'center' });
    doc.fontSize(12).text(`Report Type: ${reportType}`, { align: 'center' });
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString('fa-IR')}`, { align: 'center' });
    doc.moveDown();

    // Add content based on report type
    switch (reportType) {
      case 'trial_balance':
        this.formatTrialBalancePDF(doc, reportData);
        break;
      case 'cash_flow':
        this.formatCashFlowPDF(doc, reportData);
        break;
    }

    doc.end();
    return doc;
  }

  // Helper methods
  async getAccountBalance(accountId, asOfDate) {
    const lastEntry = await GeneralLedger.findOne({
      accountId,
      transactionDate: { $lte: asOfDate }
    }).sort({ transactionDate: -1, createdAt: -1 });

    return lastEntry ? lastEntry.balance : 0;
  }

  async getTenantMetrics(tenantId, period) {
    const startDate = this.getPeriodStartDate(period);
    const endDate = new Date();

    const [revenue, expenses, transactions, customers] = await Promise.all([
      this.getTotalRevenue(tenantId, startDate, endDate),
      this.getTotalExpenses(tenantId, startDate, endDate),
      this.getTransactionCount(tenantId, startDate, endDate),
      this.getCustomerCount(tenantId)
    ]);

    return {
      totalRevenue: revenue,
      totalExpenses: expenses,
      netProfit: revenue - expenses,
      transactionCount: transactions,
      customerCount: customers,
      avgRevenuePerCustomer: customers > 0 ? revenue / customers : 0
    };
  }
}

module.exports = new ReportService();
