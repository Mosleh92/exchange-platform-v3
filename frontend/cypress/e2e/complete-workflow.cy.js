// Complete Exchange Workflow E2E Test
// سناریو کامل: ایجاد معامله → پرداخت → رسید → ثبت → حواله → گزارش

describe('Complete Exchange Workflow E2E', () => {
  beforeEach(() => {
    // Clear any existing session data
    cy.clearCookies();
    cy.clearLocalStorage();
    
    // Visit the application
    cy.visit('/');
  });

  it('should complete end-to-end transaction flow as branch admin', () => {
    // مرحله 1: ورود به سیستم
    cy.log('🔍 مرحله 1: ورود مدیر شعبه');
    cy.get('[data-testid="email-input"]').type('branchadmin@test.com');
    cy.get('[data-testid="password-input"]').type('BranchAdmin@123');
    cy.get('[data-testid="login-button"]').click();
    
    // بررسی ورود موفق
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="user-menu"]').should('be.visible');
    cy.get('[data-testid="user-role"]').should('contain', 'مدیر شعبه');

    // مرحله 2: ثبت مشتری جدید
    cy.log('🔍 مرحله 2: ثبت مشتری جدید');
    cy.get('[data-testid="customers-menu"]').click();
    cy.get('[data-testid="add-customer-button"]').click();
    
    // پر کردن فرم مشتری
    cy.get('[data-testid="customer-first-name"]').type('احمد');
    cy.get('[data-testid="customer-last-name"]').type('رضایی');
    cy.get('[data-testid="customer-email"]').type(`ahmad.rezaei.${Date.now()}@example.com`);
    cy.get('[data-testid="customer-phone"]').type('09123456789');
    cy.get('[data-testid="customer-national-id"]').type('1234567890');
    cy.get('[data-testid="customer-address"]').type('تهران، خیابان ولیعصر، پلاک 123');
    
    cy.get('[data-testid="save-customer-button"]').click();
    cy.get('[data-testid="success-message"]').should('contain', 'مشتری با موفقیت ثبت شد');
    
    // ذخیره اطلاعات مشتری
    cy.get('[data-testid="customer-id"]').invoke('text').as('customerId');

    // مرحله 3: تایید مشتری
    cy.log('🔍 مرحله 3: تایید مشتری');
    cy.get('[data-testid="verify-customer-button"]').click();
    cy.get('[data-testid="verification-level"]').select('level2');
    cy.get('[data-testid="verification-notes"]').type('مدارک بررسی و تایید شد');
    cy.get('[data-testid="confirm-verification"]').click();
    
    cy.get('[data-testid="customer-status"]').should('contain', 'تایید شده');

    // مرحله 4: ایجاد معامله
    cy.log('🔍 مرحله 4: ایجاد معامله ارزی');
    cy.get('[data-testid="transactions-menu"]').click();
    cy.get('[data-testid="new-transaction-button"]').click();
    
    cy.get('@customerId').then((customerId) => {
      cy.get('[data-testid="transaction-customer"]').select(customerId);
    });
    
    cy.get('[data-testid="transaction-type"]').select('buy');
    cy.get('[data-testid="source-currency"]').select('IRR');
    cy.get('[data-testid="target-currency"]').select('USD');
    cy.get('[data-testid="source-amount"]').type('4200000');
    cy.get('[data-testid="transaction-description"]').type('خرید دلار برای سفر');
    
    // محاسبه نرخ
    cy.get('[data-testid="calculate-rate-button"]').click();
    cy.get('[data-testid="calculated-amount"]').should('be.visible');
    cy.get('[data-testid="exchange-rate"]').should('be.visible');
    cy.get('[data-testid="commission-amount"]').should('be.visible');
    
    cy.get('[data-testid="create-transaction-button"]').click();
    cy.get('[data-testid="success-message"]').should('contain', 'معامله ایجاد شد');
    
    // ذخیره شناسه معامله
    cy.get('[data-testid="transaction-id"]').invoke('text').as('transactionId');

    // مرحله 5: ثبت رسید پرداخت
    cy.log('🔍 مرحله 5: ثبت رسید پرداخت');
    cy.get('[data-testid="add-receipt-button"]').click();
    
    cy.get('[data-testid="payment-method"]').select('bank_transfer');
    cy.get('[data-testid="payment-amount"]').type('4200000');
    cy.get('[data-testid="bank-name"]').type('بانک ملی ایران');
    cy.get('[data-testid="account-number"]').type('1234567890123456');
    cy.get('[data-testid="transaction-reference"]').type(`REF${Date.now()}`);
    
    // آپلود رسید (شبیه‌سازی)
    cy.get('[data-testid="receipt-image"]').selectFile('cypress/fixtures/sample-receipt.jpg', { force: true });
    cy.get('[data-testid="receipt-notes"]').type('رسید بانکی تایید شد');
    
    cy.get('[data-testid="save-receipt-button"]').click();
    cy.get('[data-testid="success-message"]').should('contain', 'رسید ثبت شد');

    // مرحله 6: تایید رسید
    cy.log('🔍 مرحله 6: تایید رسید');
    cy.get('[data-testid="verify-receipt-button"]').click();
    cy.get('[data-testid="verification-status"]').select('verified');
    cy.get('[data-testid="verification-notes"]').type('رسید بانکی بررسی و تایید شد');
    cy.get('[data-testid="confirm-receipt-verification"]').click();
    
    cy.get('[data-testid="receipt-status"]').should('contain', 'تایید شده');

    // مرحله 7: تایید معامله
    cy.log('🔍 مرحله 7: تایید نهایی معامله');
    cy.get('[data-testid="approve-transaction-button"]').click();
    cy.get('[data-testid="approval-notes"]').type('پرداخت تایید شد - معامله قابل تحویل');
    cy.get('[data-testid="confirm-approval"]').click();
    
    cy.get('[data-testid="transaction-status"]').should('contain', 'تایید شده');
    cy.get('[data-testid="success-message"]').should('contain', 'معامله تایید شد');

    // مرحله 8: صدور حواله
    cy.log('🔍 مرحله 8: صدور حواله بین‌المللی');
    cy.get('[data-testid="create-remittance-button"]').click();
    
    cy.get('[data-testid="recipient-name"]').type('John Smith');
    cy.get('[data-testid="recipient-phone"]').type('+1234567890');
    cy.get('[data-testid="recipient-country"]').select('USA');
    cy.get('[data-testid="recipient-city"]').type('New York');
    cy.get('[data-testid="recipient-address"]').type('123 Broadway, New York, NY 10001');
    
    // اطلاعات بانکی گیرنده
    cy.get('[data-testid="recipient-bank-name"]').type('Chase Bank');
    cy.get('[data-testid="recipient-account"]').type('US1234567890');
    cy.get('[data-testid="routing-number"]').type('021000021');
    cy.get('[data-testid="swift-code"]').type('CHASUS33');
    
    cy.get('[data-testid="transfer-purpose"]').select('personal_transfer');
    cy.get('[data-testid="create-remittance-confirm"]').click();
    
    cy.get('[data-testid="success-message"]').should('contain', 'حواله صادر شد');
    cy.get('[data-testid="tracking-code"]').should('be.visible');
    
    // ذخیره کد پیگیری
    cy.get('[data-testid="tracking-code"]').invoke('text').as('trackingCode');

    // مرحله 9: بروزرسانی وضعیت حواله
    cy.log('🔍 مرحله 9: بروزرسانی وضعیت حواله');
    cy.get('[data-testid="update-remittance-status"]').click();
    cy.get('[data-testid="remittance-status"]').select('in_transit');
    cy.get('[data-testid="status-message"]').type('حواله به بانک مقصد ارسال شد');
    cy.get('[data-testid="estimated-delivery"]').type('2025-01-15');
    cy.get('[data-testid="update-status-confirm"]').click();
    
    cy.get('[data-testid="remittance-current-status"]').should('contain', 'در حال انتقال');

    // مرحله 10: تولید گزارش
    cy.log('🔍 مرحله 10: تولید گزارش معامله');
    cy.get('[data-testid="reports-menu"]').click();
    cy.get('[data-testid="transaction-report-button"]').click();
    
    cy.get('@transactionId').then((transactionId) => {
      cy.get('[data-testid="report-transaction-id"]').type(transactionId);
    });
    
    cy.get('[data-testid="include-customer-details"]').check();
    cy.get('[data-testid="include-remittance-details"]').check();
    cy.get('[data-testid="include-receipts"]').check();
    cy.get('[data-testid="generate-report"]').click();
    
    cy.get('[data-testid="report-content"]').should('be.visible');
    cy.get('[data-testid="report-title"]').should('contain', 'گزارش معامله');

    // مرحله 11: بررسی نهایی
    cy.log('🔍 مرحله 11: بررسی کلی معامله');
    
    // بررسی dashboard برای بروزرسانی‌ها
    cy.get('[data-testid="dashboard-menu"]').click();
    cy.get('[data-testid="recent-transactions"]').should('contain', 'احمد رضایی');
    cy.get('[data-testid="daily-stats"]').should('be.visible');
    
    // تایید اتمام گردش کامل
    cy.log('🎉 گردش کامل عملیات با موفقیت تکمیل شد!');
  });

  it('should handle transaction cancellation workflow', () => {
    // ورود به سیستم
    cy.log('🔍 تست لغو معامله');
    cy.get('[data-testid="email-input"]').type('branchadmin@test.com');
    cy.get('[data-testid="password-input"]').type('BranchAdmin@123');
    cy.get('[data-testid="login-button"]').click();

    // ایجاد معامله
    cy.get('[data-testid="transactions-menu"]').click();
    cy.get('[data-testid="pending-transactions"]').first().click();
    
    // لغو معامله
    cy.get('[data-testid="cancel-transaction-button"]').click();
    cy.get('[data-testid="cancellation-reason"]').select('customer_request');
    cy.get('[data-testid="cancellation-notes"]').type('مشتری انصراف داد');
    cy.get('[data-testid="confirm-cancellation"]').click();
    
    cy.get('[data-testid="transaction-status"]').should('contain', 'لغو شده');
    cy.get('[data-testid="success-message"]').should('contain', 'معامله لغو شد');
  });

  it('should handle high-value transaction approval workflow', () => {
    // ورود به عنوان کارمند
    cy.log('🔍 تست معامله پرارزش - کارمند');
    cy.get('[data-testid="email-input"]').type('branchstaff@test.com');
    cy.get('[data-testid="password-input"]').type('BranchStaff@123');
    cy.get('[data-testid="login-button"]').click();

    // تلاش برای ایجاد معامله پرارزش
    cy.get('[data-testid="transactions-menu"]').click();
    cy.get('[data-testid="new-transaction-button"]').click();
    
    cy.get('[data-testid="source-amount"]').type('200000000'); // 200 میلیون تومان
    cy.get('[data-testid="create-transaction-button"]').click();
    
    // باید محدودیت نشان دهد
    cy.get('[data-testid="error-message"]').should('contain', 'مبلغ بیش از حد مجاز');
    
    // یا معامله نیاز به تایید داشته باشد
    cy.get('[data-testid="approval-required-message"]').should('be.visible');
  });

  it('should test role-based access control', () => {
    // تست دسترسی کارمند شعبه
    cy.log('🔍 تست کنترل دسترسی نقش‌محور');
    cy.get('[data-testid="email-input"]').type('branchstaff@test.com');
    cy.get('[data-testid="password-input"]').type('BranchStaff@123');
    cy.get('[data-testid="login-button"]').click();

    // کارمند نباید به تنظیمات دسترسی داشته باشد
    cy.get('[data-testid="settings-menu"]').should('not.exist');
    
    // کارمند نباید به گزارشات مالی دسترسی داشته باشد
    cy.get('[data-testid="reports-menu"]').click();
    cy.get('[data-testid="financial-reports"]').should('not.exist');
    
    // کارمند باید فقط به عملیات مجاز دسترسی داشته باشد
    cy.get('[data-testid="customers-menu"]').should('be.visible');
    cy.get('[data-testid="transactions-menu"]').should('be.visible');
  });

  it('should test real-time updates and notifications', () => {
    cy.log('🔍 تست بروزرسانی‌های زمان واقعی');
    
    // ورود به سیستم
    cy.get('[data-testid="email-input"]').type('branchadmin@test.com');
    cy.get('[data-testid="password-input"]').type('BranchAdmin@123');
    cy.get('[data-testid="login-button"]').click();

    // مشاهده نوتیفیکیشن‌ها
    cy.get('[data-testid="notifications-bell"]').click();
    cy.get('[data-testid="notifications-list"]').should('be.visible');
    
    // تست بروزرسانی خودکار آمار
    cy.get('[data-testid="dashboard-stats"]').should('be.visible');
    cy.get('[data-testid="auto-refresh-indicator"]').should('be.visible');
  });

  it('should test responsive design on mobile', () => {
    cy.log('🔍 تست طراحی واکنش‌گرا - موبایل');
    
    // تنظیم سایز موبایل
    cy.viewport(375, 667); // iPhone 6/7/8 size
    
    cy.get('[data-testid="email-input"]').type('branchadmin@test.com');
    cy.get('[data-testid="password-input"]').type('BranchAdmin@123');
    cy.get('[data-testid="login-button"]').click();

    // بررسی منوی موبایل
    cy.get('[data-testid="mobile-menu-toggle"]').click();
    cy.get('[data-testid="mobile-menu"]').should('be.visible');
    
    // بررسی کارکرد فرم‌ها در موبایل
    cy.get('[data-testid="customers-menu"]').click();
    cy.get('[data-testid="add-customer-button"]').click();
    cy.get('[data-testid="customer-form"]').should('be.visible');
  });

  it('should test data persistence and recovery', () => {
    cy.log('🔍 تست پایداری و بازیابی داده‌ها');
    
    cy.get('[data-testid="email-input"]').type('branchadmin@test.com');
    cy.get('[data-testid="password-input"]').type('BranchAdmin@123');
    cy.get('[data-testid="login-button"]').click();

    // شروع پر کردن فرم
    cy.get('[data-testid="customers-menu"]').click();
    cy.get('[data-testid="add-customer-button"]').click();
    
    cy.get('[data-testid="customer-first-name"]').type('نیما');
    cy.get('[data-testid="customer-last-name"]').type('احمدی');
    
    // شبیه‌سازی قطع اتصال و بازگشت
    cy.reload();
    
    // ورود مجدد
    cy.get('[data-testid="email-input"]').type('branchadmin@test.com');
    cy.get('[data-testid="password-input"]').type('BranchAdmin@123');
    cy.get('[data-testid="login-button"]').click();
    
    // بررسی بازیابی draft (اگر پیاده‌سازی شده باشد)
    cy.get('[data-testid="customers-menu"]').click();
    cy.get('[data-testid="draft-forms"]').should('be.visible');
  });
});