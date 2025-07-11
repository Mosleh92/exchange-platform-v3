// Role-Based E2E Testing for Exchange Platform

describe('Role-Based Access Control E2E Tests', () => {
  const users = {
    superAdmin: {
      email: 'superadmin@test.com',
      password: 'SuperAdmin@123',
      role: 'super_admin'
    },
    tenantAdmin: {
      email: 'tenantadmin@test.com',
      password: 'TenantAdmin@123',
      role: 'tenant_admin'
    },
    branchAdmin: {
      email: 'branchadmin@test.com',
      password: 'BranchAdmin@123',
      role: 'branch_admin'
    },
    branchStaff: {
      email: 'branchstaff@test.com',
      password: 'BranchStaff@123',
      role: 'branch_staff'
    }
  };

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit('/');
  });

  describe('Super Admin Role Tests', () => {
    beforeEach(() => {
      cy.login(users.superAdmin.email, users.superAdmin.password);
    });

    it('should have access to all system management features', () => {
      cy.log('🔍 تست سوپر ادمین - دسترسی کامل سیستم');
      
      // دسترسی به مدیریت صرافی‌ها
      cy.get('[data-testid="tenants-management"]').should('be.visible');
      cy.get('[data-testid="tenants-management"]').click();
      
      cy.get('[data-testid="add-tenant-button"]').should('be.visible');
      cy.get('[data-testid="tenants-list"]').should('be.visible');
      
      // دسترسی به مدیریت پلن‌ها و اشتراک‌ها
      cy.get('[data-testid="plans-management"]').should('be.visible');
      cy.get('[data-testid="subscriptions-management"]').should('be.visible');
      
      // دسترسی به تنظیمات سیستم
      cy.get('[data-testid="system-settings"]').should('be.visible');
      cy.get('[data-testid="system-settings"]').click();
      
      cy.get('[data-testid="security-settings"]').should('be.visible');
      cy.get('[data-testid="global-settings"]').should('be.visible');
      
      // دسترسی به گزارشات سیستم
      cy.get('[data-testid="system-reports"]').should('be.visible');
      cy.get('[data-testid="system-reports"]').click();
      
      cy.get('[data-testid="all-tenants-report"]').should('be.visible');
      cy.get('[data-testid="system-overview-report"]').should('be.visible');
    });

    it('should be able to create and manage tenants', () => {
      cy.log('🔍 تست ایجاد و مدیریت صرافی');
      
      cy.get('[data-testid="tenants-management"]').click();
      cy.get('[data-testid="add-tenant-button"]').click();
      
      // پر کردن فرم صرافی جدید
      cy.get('[data-testid="tenant-name"]').type('صرافی نمونه تست');
      cy.get('[data-testid="tenant-code"]').type('TEST_EXCHANGE');
      cy.get('[data-testid="tenant-type"]').select('exchange');
      cy.get('[data-testid="tenant-status"]').select('active');
      
      // تنظیمات صرافی
      cy.get('[data-testid="max-daily-amount"]').type('100000');
      cy.get('[data-testid="allowed-currencies"]').select(['USD', 'EUR', 'IRR']);
      
      cy.get('[data-testid="create-tenant-button"]').click();
      cy.get('[data-testid="success-message"]').should('contain', 'صرافی ایجاد شد');
      
      // تایید نمایش در لیست
      cy.get('[data-testid="tenants-list"]').should('contain', 'صرافی نمونه تست');
    });

    it('should view cross-tenant analytics and reports', () => {
      cy.log('🔍 تست گزارشات فراصرافی');
      
      cy.get('[data-testid="system-reports"]').click();
      cy.get('[data-testid="all-tenants-report"]').click();
      
      // انتخاب بازه زمانی
      cy.get('[data-testid="date-range-picker"]').click();
      cy.get('[data-testid="last-30-days"]').click();
      
      cy.get('[data-testid="generate-report"]').click();
      cy.get('[data-testid="report-loading"]').should('be.visible');
      cy.get('[data-testid="report-content"]').should('be.visible');
      
      // بررسی محتویات گزارش
      cy.get('[data-testid="total-tenants"]').should('be.visible');
      cy.get('[data-testid="total-transactions"]').should('be.visible');
      cy.get('[data-testid="total-revenue"]').should('be.visible');
      cy.get('[data-testid="tenant-breakdown"]').should('be.visible');
    });
  });

  describe('Tenant Admin Role Tests', () => {
    beforeEach(() => {
      cy.login(users.tenantAdmin.email, users.tenantAdmin.password);
    });

    it('should manage branches and exchange rates', () => {
      cy.log('🔍 تست صرافی ادمین - مدیریت شعبات و نرخ‌ها');
      
      // مدیریت شعبات
      cy.get('[data-testid="branches-management"]').should('be.visible');
      cy.get('[data-testid="branches-management"]').click();
      
      cy.get('[data-testid="add-branch-button"]').should('be.visible');
      cy.get('[data-testid="add-branch-button"]').click();
      
      // ایجاد شعبه جدید
      cy.get('[data-testid="branch-name"]').type('شعبه مرکزی');
      cy.get('[data-testid="branch-code"]').type('CENTRAL');
      cy.get('[data-testid="branch-address"]').type('تهران، میدان آزادی');
      cy.get('[data-testid="branch-phone"]').type('02112345678');
      
      cy.get('[data-testid="create-branch-button"]').click();
      cy.get('[data-testid="success-message"]').should('contain', 'شعبه ایجاد شد');
      
      // مدیریت نرخ ارز
      cy.get('[data-testid="exchange-rates"]').click();
      cy.get('[data-testid="add-rate-button"]').click();
      
      cy.get('[data-testid="from-currency"]').select('USD');
      cy.get('[data-testid="to-currency"]').select('IRR');
      cy.get('[data-testid="buy-rate"]').type('42000');
      cy.get('[data-testid="sell-rate"]').type('42500');
      cy.get('[data-testid="commission"]').type('2.5');
      
      cy.get('[data-testid="save-rate-button"]').click();
      cy.get('[data-testid="success-message"]').should('contain', 'نرخ ثبت شد');
    });

    it('should access tenant financial reports', () => {
      cy.log('🔍 تست گزارشات مالی صرافی');
      
      cy.get('[data-testid="reports-menu"]').click();
      cy.get('[data-testid="financial-reports"]').click();
      
      // گزارش عملکرد شعبات
      cy.get('[data-testid="branch-performance"]').click();
      cy.get('[data-testid="date-range"]').type('2024-01-01');
      cy.get('[data-testid="date-range-end"]').type('2024-12-31');
      cy.get('[data-testid="generate-report"]').click();
      
      cy.get('[data-testid="branch-performance-chart"]').should('be.visible');
      cy.get('[data-testid="branch-comparison-table"]').should('be.visible');
      
      // گزارش روزانه
      cy.get('[data-testid="daily-summary"]').click();
      cy.get('[data-testid="today-summary"]').should('be.visible');
      cy.get('[data-testid="transaction-volume"]').should('be.visible');
      cy.get('[data-testid="commission-earned"]').should('be.visible');
    });

    it('should not access other tenant data', () => {
      cy.log('🔍 تست محدودیت دسترسی به سایر صرافی‌ها');
      
      // نباید دسترسی به مدیریت سیستم داشته باشد
      cy.get('[data-testid="system-settings"]').should('not.exist');
      cy.get('[data-testid="tenants-management"]').should('not.exist');
      
      // نباید به گزارشات سیستم دسترسی داشته باشد
      cy.get('[data-testid="system-reports"]').should('not.exist');
      
      // فقط داده‌های صرافی خودش را ببیند
      cy.get('[data-testid="customers-menu"]').click();
      cy.get('[data-testid="customers-list"] [data-tenant-indicator]')
        .should('have.attr', 'data-tenant-indicator', 'own-tenant');
    });
  });

  describe('Branch Admin Role Tests', () => {
    beforeEach(() => {
      cy.login(users.branchAdmin.email, users.branchAdmin.password);
    });

    it('should manage customers and transactions', () => {
      cy.log('🔍 تست مدیر شعبه - مدیریت مشتریان و معاملات');
      
      // مدیریت مشتریان
      cy.get('[data-testid="customers-menu"]').click();
      cy.get('[data-testid="customer-management-tools"]').should('be.visible');
      
      // جستجوی پیشرفته مشتری
      cy.get('[data-testid="advanced-search"]').click();
      cy.get('[data-testid="search-by-national-id"]').type('1234567890');
      cy.get('[data-testid="search-button"]').click();
      
      cy.get('[data-testid="search-results"]').should('be.visible');
      
      // مدیریت معاملات
      cy.get('[data-testid="transactions-menu"]').click();
      cy.get('[data-testid="transaction-approval-queue"]').should('be.visible');
      
      // تایید معاملات در انتظار
      cy.get('[data-testid="pending-transactions"]').first().click();
      cy.get('[data-testid="transaction-details"]').should('be.visible');
      cy.get('[data-testid="approve-transaction"]').click();
      
      cy.get('[data-testid="approval-notes"]').type('بررسی شد و تایید می‌شود');
      cy.get('[data-testid="confirm-approval"]').click();
      
      cy.get('[data-testid="success-message"]').should('contain', 'معامله تایید شد');
    });

    it('should create and manage remittances', () => {
      cy.log('🔍 تست حواله‌های بین‌المللی');
      
      cy.get('[data-testid="remittances-menu"]').click();
      cy.get('[data-testid="new-remittance-button"]').click();
      
      // اطلاعات فرستنده
      cy.get('[data-testid="sender-search"]').type('احمد رضایی');
      cy.get('[data-testid="sender-results"]').first().click();
      
      // اطلاعات گیرنده
      cy.get('[data-testid="recipient-name"]').type('John Smith');
      cy.get('[data-testid="recipient-country"]').select('USA');
      cy.get('[data-testid="recipient-city"]').type('New York');
      cy.get('[data-testid="recipient-phone"]').type('+1234567890');
      
      // اطلاعات بانکی
      cy.get('[data-testid="bank-name"]').type('Chase Bank');
      cy.get('[data-testid="account-number"]').type('US1234567890');
      cy.get('[data-testid="routing-number"]').type('021000021');
      
      // مبلغ و هدف
      cy.get('[data-testid="remittance-amount"]').type('1000');
      cy.get('[data-testid="remittance-currency"]').select('USD');
      cy.get('[data-testid="remittance-purpose"]').select('family_support');
      
      cy.get('[data-testid="create-remittance"]').click();
      cy.get('[data-testid="success-message"]').should('contain', 'حواله ایجاد شد');
      
      // دریافت کد پیگیری
      cy.get('[data-testid="tracking-code"]').should('be.visible');
      cy.get('[data-testid="print-receipt"]').should('be.visible');
    });

    it('should generate branch reports', () => {
      cy.log('🔍 تست گزارشات عملکرد شعبه');
      
      cy.get('[data-testid="reports-menu"]').click();
      cy.get('[data-testid="branch-reports"]').click();
      
      // گزارش روزانه شعبه
      cy.get('[data-testid="daily-branch-report"]').click();
      cy.get('[data-testid="report-date"]').type('2024-12-01');
      cy.get('[data-testid="generate-report"]').click();
      
      cy.get('[data-testid="daily-transaction-count"]').should('be.visible');
      cy.get('[data-testid="daily-volume"]').should('be.visible');
      cy.get('[data-testid="staff-performance"]').should('be.visible');
      
      // گزارش مشتریان جدید
      cy.get('[data-testid="new-customers-report"]').click();
      cy.get('[data-testid="customer-growth-chart"]').should('be.visible');
      cy.get('[data-testid="customer-demographics"]').should('be.visible');
    });
  });

  describe('Branch Staff Role Tests', () => {
    beforeEach(() => {
      cy.login(users.branchStaff.email, users.branchStaff.password);
    });

    it('should register customers and handle basic transactions', () => {
      cy.log('🔍 تست کارمند شعبه - ثبت مشتری و معاملات ساده');
      
      // ثبت مشتری جدید
      cy.get('[data-testid="customers-menu"]').click();
      cy.get('[data-testid="register-customer"]').click();
      
      cy.get('[data-testid="customer-first-name"]').type('زهرا');
      cy.get('[data-testid="customer-last-name"]').type('محمدی');
      cy.get('[data-testid="customer-email"]').type(`zahra.${Date.now()}@example.com`);
      cy.get('[data-testid="customer-phone"]').type('09987654321');
      cy.get('[data-testid="customer-national-id"]').type('9876543210');
      
      cy.get('[data-testid="save-customer"]').click();
      cy.get('[data-testid="success-message"]').should('contain', 'مشتری ثبت شد');
      
      // ثبت معامله ساده
      cy.get('[data-testid="transactions-menu"]').click();
      cy.get('[data-testid="simple-transaction"]').click();
      
      cy.get('[data-testid="transaction-amount"]').type('1000000'); // مبلغ کم
      cy.get('[data-testid="transaction-type"]').select('buy');
      cy.get('[data-testid="source-currency"]').select('IRR');
      cy.get('[data-testid="target-currency"]').select('USD');
      
      cy.get('[data-testid="create-transaction"]').click();
      cy.get('[data-testid="success-message"]').should('contain', 'معامله ثبت شد');
      cy.get('[data-testid="approval-required"]').should('be.visible');
    });

    it('should record payment receipts', () => {
      cy.log('🔍 تست ثبت رسیدهای پرداخت');
      
      cy.get('[data-testid="receipts-menu"]').click();
      cy.get('[data-testid="new-receipt"]').click();
      
      // رسید نقدی
      cy.get('[data-testid="payment-method"]').select('cash');
      cy.get('[data-testid="receipt-amount"]').type('500000');
      cy.get('[data-testid="receipt-currency"]').select('IRR');
      cy.get('[data-testid="customer-search"]').type('زهرا محمدی');
      cy.get('[data-testid="customer-results"]').first().click();
      
      cy.get('[data-testid="receipt-notes"]').type('دریافت نقدی');
      cy.get('[data-testid="save-receipt"]').click();
      
      cy.get('[data-testid="success-message"]').should('contain', 'رسید ثبت شد');
      cy.get('[data-testid="receipt-number"]').should('be.visible');
      
      // رسید حواله بانکی
      cy.get('[data-testid="new-receipt"]').click();
      cy.get('[data-testid="payment-method"]').select('bank_transfer');
      cy.get('[data-testid="bank-name"]').type('بانک پاسارگاد');
      cy.get('[data-testid="account-number"]').type('123456789');
      cy.get('[data-testid="transaction-ref"]').type('REF123456');
      
      // آپلود تصویر رسید
      cy.get('[data-testid="receipt-image"]').selectFile('cypress/fixtures/receipt.jpg');
      cy.get('[data-testid="save-receipt"]').click();
      
      cy.get('[data-testid="pending-verification"]').should('be.visible');
    });

    it('should have limited access to reports', () => {
      cy.log('🔍 تست دسترسی محدود به گزارشات');
      
      cy.get('[data-testid="reports-menu"]').click();
      
      // دسترسی به عملکرد شخصی
      cy.get('[data-testid="my-performance"]').should('be.visible');
      cy.get('[data-testid="my-performance"]').click();
      
      cy.get('[data-testid="personal-stats"]').should('be.visible');
      cy.get('[data-testid="transactions-handled"]').should('be.visible');
      cy.get('[data-testid="customers-served"]').should('be.visible');
      
      // عدم دسترسی به گزارشات مالی
      cy.get('[data-testid="financial-reports"]').should('not.exist');
      cy.get('[data-testid="branch-management"]').should('not.exist');
      cy.get('[data-testid="admin-reports"]').should('not.exist');
    });

    it('should not approve high-value transactions', () => {
      cy.log('🔍 تست محدودیت تایید معاملات پرارزش');
      
      // تلاش برای ایجاد معامله پرارزش
      cy.get('[data-testid="transactions-menu"]').click();
      cy.get('[data-testid="new-transaction"]').click();
      
      cy.get('[data-testid="transaction-amount"]').type('50000000'); // 50 میلیون
      cy.get('[data-testid="create-transaction"]').click();
      
      // باید خطا یا محدودیت نشان دهد
      cy.get('[data-testid="amount-limit-error"]').should('be.visible');
      cy.get('[data-testid="requires-approval"]').should('contain', 'نیاز به تایید مدیر');
      
      // عدم دسترسی به تایید معاملات
      cy.get('[data-testid="approve-transaction"]').should('not.exist');
      cy.get('[data-testid="reject-transaction"]').should('not.exist');
    });
  });

  describe('Cross-Role Security Tests', () => {
    it('should prevent privilege escalation', () => {
      cy.log('🔍 تست امنیتی - جلوگیری از ارتقاء دسترسی');
      
      // ورود به عنوان کارمند
      cy.login(users.branchStaff.email, users.branchStaff.password);
      
      // تلاش برای دسترسی مستقیم به URLهای مدیریتی
      cy.visit('/admin/tenants', { failOnStatusCode: false });
      cy.get('[data-testid="access-denied"]').should('be.visible');
      
      cy.visit('/admin/system-settings', { failOnStatusCode: false });
      cy.get('[data-testid="unauthorized"]').should('be.visible');
      
      // تلاش برای تغییر نقش از طریق developer tools
      cy.window().then((win) => {
        // شبیه‌سازی تغییر localStorage
        win.localStorage.setItem('userRole', 'super_admin');
        cy.reload();
        
        // باید همچنان محدود باشد
        cy.get('[data-testid="admin-panel"]').should('not.exist');
      });
    });

    it('should enforce session security', () => {
      cy.log('🔍 تست امنیت نشست');
      
      cy.login(users.branchAdmin.email, users.branchAdmin.password);
      
      // تست timeout نشست
      cy.get('[data-testid="session-timer"]').should('be.visible');
      
      // شبیه‌سازی غیرفعال بودن طولانی‌مدت
      cy.wait(5000);
      cy.get('[data-testid="activity-warning"]').should('be.visible');
      
      // تست logout خودکار
      cy.get('[data-testid="extend-session"]').click();
      cy.get('[data-testid="session-extended"]').should('be.visible');
    });
  });

  // Helper Commands
  Cypress.Commands.add('login', (email, password) => {
    cy.get('[data-testid="email-input"]').type(email);
    cy.get('[data-testid="password-input"]').type(password);
    cy.get('[data-testid="login-button"]').click();
    cy.url().should('include', '/dashboard');
  });
});