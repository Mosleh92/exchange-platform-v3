const ReportService = require('./ReportService');
const AccountService = require('./AccountService');
const UserService = require('./UserService');
const CustomerService = require('./CustomerService');
const TransactionService = require('./TransactionService');
const RemittanceService = require('./RemittanceService');
const PaymentService = require('./PaymentService');

const DashboardService = {
  /**
   * داده‌های داشبورد برای سوپرادمین (آمار کل سیستم)
   */
  async getSuperAdminDashboard() {
    // آمار کلی تراکنش‌ها، کاربران، مستأجرها و ...
    // اینجا می‌توانید متدهای آماری بیشتری اضافه کنید
    const tenantsCount = await UserService.getUsers({ role: 'tenant_admin' }).then(r => r.total);
    const usersCount = await UserService.getUsers({}).then(r => r.total);
    // آمار تراکنش‌ها و پرداخت‌ها
    const transactions = await ReportService.getFinancialReport({});
    return {
      tenantsCount,
      usersCount,
      ...transactions
    };
  },

  /**
   * داشبورد برای tenant_admin (مدیر صرافی)
   */
  async getTenantAdminDashboard(tenantId) {
    const users = await UserService.getUsers({ tenantId });
    const customers = await CustomerService.getCustomers ? await CustomerService.getCustomers(tenantId) : [];
    const accounts = await AccountService.getAccounts(tenantId);
    const report = await ReportService.getFinancialReport({ tenantId });
    return {
      usersCount: users.total,
      customersCount: customers.length,
      accountsCount: accounts.length,
      ...report
    };
  },

  /**
   * داشبورد برای branch_manager (مدیر شعبه)
   */
  async getBranchManagerDashboard(tenantId, branchId) {
    // فرض: متدهای لازم برای فیلتر بر اساس شعبه باید در سرویس‌های مربوطه اضافه شود
    // اینجا فقط نمونه ساده آورده شده است
    const users = await UserService.getUsers({ tenantId, branchId });
    const accounts = await AccountService.getAccounts(tenantId, { branch_id: branchId });
    const report = await ReportService.getFinancialReport({ tenantId }); // می‌توانید فیلتر شعبه اضافه کنید
    return {
      usersCount: users.total,
      accountsCount: accounts.length,
      ...report
    };
  },

  /**
   * داشبورد برای staff (کارمند)
   */
  async getStaffDashboard(tenantId, staffId) {
    // آمار تراکنش‌ها و پرداخت‌های ثبت‌شده توسط کارمند
    const transactions = await TransactionService.getTransactions(tenantId, { created_by: staffId });
    const payments = await PaymentService.getCustomerPayments({ userId: staffId, tenantId });
    return {
      transactionsCount: transactions.length,
      paymentsCount: payments.total,
    };
  },

  /**
   * داشبورد برای customer (مشتری)
   */
  async getCustomerDashboard(tenantId, customerId) {
    // آمار تراکنش‌ها و حواله‌های مشتری
    const transactions = await TransactionService.getTransactions(tenantId, { customer_id: customerId });
    const remittances = await RemittanceService.getCustomerRemittances({ userId: customerId, tenantId });
    return {
      transactionsCount: transactions.length,
      remittancesCount: remittances.total,
    };
  }
};

module.exports = DashboardService; 