const translations = {
  fa: {
    // Common
    common: {
      loading: 'در حال بارگذاری...',
      error: 'خطا',
      success: 'موفقیت',
      save: 'ذخیره',
      cancel: 'لغو',
      edit: 'ویرایش',
      delete: 'حذف',
      confirm: 'تأیید',
      back: 'بازگشت',
      next: 'بعدی',
      previous: 'قبلی',
      search: 'جستجو',
      filter: 'فیلتر',
      export: 'خروجی',
      import: 'ورودی',
      refresh: 'تازه‌سازی',
      close: 'بستن',
      open: 'باز کردن',
      yes: 'بله',
      no: 'خیر',
      ok: 'تأیید',
      select: 'انتخاب کنید',
      all: 'همه',
      none: 'هیچ‌کدام',
      actions: 'عملیات',
      status: 'وضعیت',
      date: 'تاریخ',
      time: 'زمان',
      amount: 'مبلغ',
      currency: 'ارز',
      description: 'توضیحات',
      notes: 'یادداشت‌ها',
      created_at: 'تاریخ ایجاد',
      updated_at: 'تاریخ به‌روزرسانی'
    },

    // Auth
    auth: {
      login: 'ورود',
      logout: 'خروج',
      register: 'ثبت‌نام',
      forgot_password: 'فراموشی رمز عبور',
      reset_password: 'بازنشانی رمز عبور',
      email: 'ایمیل',
      password: 'رمز عبور',
      confirm_password: 'تأیید رمز عبور',
      username: 'نام کاربری',
      full_name: 'نام کامل',
      phone: 'شماره تلفن',
      national_id: 'کد ملی',
      remember_me: 'مرا به خاطر بسپار',
      login_success: 'ورود موفقیت‌آمیز بود',
      login_failed: 'ورود ناموفق بود',
      logout_success: 'خروج موفقیت‌آمیز بود',
      password_reset_sent: 'ایمیل بازنشانی رمز عبور ارسال شد',
      password_reset_success: 'رمز عبور با موفقیت بازنشانی شد',
      invalid_credentials: 'ایمیل یا رمز عبور اشتباه است',
      account_locked: 'حساب کاربری قفل شده است',
      session_expired: 'جلسه منقضی شده است'
    },

    // Roles
    roles: {
      super_admin: 'سوپر ادمین',
      tenant_admin: 'مدیر صرافی',
      manager: 'مدیر شعبه',
      staff: 'کارمند',
      customer: 'مشتری'
    },

    // Dashboard
    dashboard: {
      title: 'داشبورد',
      welcome: 'خوش آمدید',
      overview: 'نمای کلی',
      statistics: 'آمار',
      recent_activity: 'فعالیت‌های اخیر',
      quick_actions: 'عملیات سریع',
      total_transactions: 'کل تراکنش‌ها',
      total_remittances: 'کل حواله‌ها',
      pending_approvals: 'در انتظار تأیید',
      total_balance: 'موجودی کل',
      today_transactions: 'تراکنش‌های امروز',
      today_remittances: 'حواله‌های امروز',
      monthly_revenue: 'درآمد ماهانه',
      active_customers: 'مشتریان فعال',
      exchange_rates: 'نرخ ارز',
      system_status: 'وضعیت سیستم'
    },

    // Exchange
    exchange: {
      title: 'خرید و فروش ارز',
      buy_currency: 'خرید ارز',
      sell_currency: 'فروش ارز',
      currency_pair: 'جفت ارز',
      amount: 'مبلغ',
      exchange_rate: 'نرخ ارز',
      commission: 'کارمزد',
      total_amount: 'مبلغ کل',
      converted_amount: 'مبلغ تبدیل شده',
      payment_method: 'روش پرداخت',
      delivery_method: 'روش تحویل',
      cash: 'نقدی',
      bank_transfer: 'انتقال بانکی',
      card: 'کارت',
      crypto: 'ارز دیجیتال',
      physical: 'فیزیکی',
      account_credit: 'اعتبار به حساب',
      crypto_wallet: 'کیف پول ارز دیجیتال',
      transaction_success: 'تراکنش با موفقیت انجام شد',
      insufficient_balance: 'موجودی کافی نیست',
      invalid_amount: 'مبلغ نامعتبر است',
      rate_not_found: 'نرخ ارز یافت نشد'
    },

    // Payment
    payment: {
      title: 'پرداخت',
      create_payment: 'ایجاد پرداخت',
      payment_method: 'روش پرداخت',
      payment_status: 'وضعیت پرداخت',
      payment_date: 'تاریخ پرداخت',
      reference_number: 'شماره مرجع',
      sender_info: 'اطلاعات فرستنده',
      sender_name: 'نام فرستنده',
      sender_phone: 'شماره تلفن فرستنده',
      sender_national_id: 'کد ملی فرستنده',
      sender_email: 'ایمیل فرستنده',
      bank_details: 'جزئیات بانکی',
      bank_name: 'نام بانک',
      account_number: 'شماره حساب',
      account_holder: 'صاحب حساب',
      iban: 'شماره شبا',
      swift_code: 'کد SWIFT',
      destination_account: 'حساب مقصد',
      receipts: 'رسیدها',
      receipt_description: 'توضیحات رسید',
      uploaded_receipts: 'رسیدهای آپلود شده',
      receipts_help: 'فایل‌های تصویری یا PDF حداکثر 5 مگابایت',
      payment_created: 'پرداخت با موفقیت ایجاد شد',
      payment_verified: 'پرداخت تأیید شد',
      payment_rejected: 'پرداخت رد شد',
      payment_amount_exceeds: 'مبلغ پرداخت از مبلغ باقی‌مانده بیشتر است',
      no_file_uploaded: 'هیچ فایلی آپلود نشده است',
      receipt_uploaded: 'رسید با موفقیت آپلود شد',
      receipts_uploaded: 'رسیدها با موفقیت آپلود شدند',
      method: {
        bank_transfer: 'انتقال بانکی',
        cash: 'نقدی',
        card: 'کارت',
        digital_wallet: 'کیف پول دیجیتال',
        crypto: 'ارز دیجیتال'
      },
      status: {
        pending: 'در انتظار',
        verified: 'تأیید شده',
        rejected: 'رد شده',
        cancelled: 'لغو شده'
      }
    },

    // Remittance
    remittance: {
      title: 'حواله',
      create_remittance: 'ایجاد حواله',
      inter_branch: 'بین شعبه‌ای',
      international: 'بین‌المللی',
      domestic: 'داخلی',
      receiver_info: 'اطلاعات گیرنده',
      sender_info: 'اطلاعات فرستنده',
      delivery_info: 'اطلاعات تحویل',
      security_info: 'اطلاعات امنیتی',
      receiver_name: 'نام گیرنده',
      receiver_phone: 'شماره تلفن گیرنده',
      receiver_email: 'ایمیل گیرنده',
      receiver_address: 'آدرس گیرنده',
      bank_info: 'اطلاعات بانکی',
      bank_name: 'نام بانک',
      account_number: 'شماره حساب',
      iban: 'شماره شبا',
      swift_code: 'کد SWIFT',
      pin_code: 'رمز عبور',
      secret_question: 'سوال امنیتی',
      secret_answer: 'پاسخ سوال امنیتی',
      remittance_success: 'حواله با موفقیت ایجاد شد',
      remittance_cancelled: 'حواله لغو شد',
      approval_required: 'تأیید مورد نیاز است'
    },

    // Transactions
    transactions: {
      title: 'تراکنش‌ها',
      transaction_id: 'شناسه تراکنش',
      transaction_type: 'نوع تراکنش',
      transaction_status: 'وضعیت تراکنش',
      from_currency: 'ارز مبدا',
      to_currency: 'ارز مقصد',
      from_amount: 'مبلغ مبدا',
      to_amount: 'مبلغ مقصد',
      rate: 'نرخ',
      commission: 'کارمزد',
      total_cost: 'هزینه کل',
      payment_status: 'وضعیت پرداخت',
      delivery_status: 'وضعیت تحویل',
      created_by: 'ایجاد شده توسط',
      created_at: 'تاریخ ایجاد',
      completed: 'تکمیل شده',
      pending: 'در انتظار',
      cancelled: 'لغو شده',
      failed: 'ناموفق',
      processing: 'در حال پردازش',
      approved: 'تأیید شده',
      rejected: 'رد شده'
    },

    // Accounts
    accounts: {
      title: 'حساب‌ها',
      account_number: 'شماره حساب',
      account_type: 'نوع حساب',
      balance: 'موجودی',
      available_balance: 'موجودی قابل استفاده',
      frozen_balance: 'موجودی فریز شده',
      currency: 'ارز',
      status: 'وضعیت',
      interest_rate: 'نرخ سود',
      daily_limit: 'محدودیت روزانه',
      monthly_limit: 'محدودیت ماهانه',
      savings: 'پس‌انداز',
      current: 'جاری',
      investment: 'سرمایه‌گذاری',
      crypto: 'ارز دیجیتال',
      active: 'فعال',
      suspended: 'معلق',
      closed: 'بسته',
      pending: 'در انتظار'
    },

    // Exchange Rates
    rates: {
      title: 'نرخ ارز',
      currency_pair: 'جفت ارز',
      buy_rate: 'نرخ خرید',
      sell_rate: 'نرخ فروش',
      last_updated: 'آخرین به‌روزرسانی',
      update_rate: 'به‌روزرسانی نرخ',
      rate_history: 'تاریخچه نرخ',
      spread: 'اسپرد',
      commission_rate: 'نرخ کارمزد',
      margin: 'حاشیه سود'
    },

    // Debt Management
    debt: {
      title: 'مدیریت بدهی',
      management: {
        title: 'مدیریت بدهی'
      },
      create: 'ایجاد بدهی',
      customer: 'مشتری',
      amount: 'مبلغ',
      remaining: 'باقی‌مانده',
      due_date: 'تاریخ سررسید',
      status: 'وضعیت',
      risk_level: 'سطح ریسک',
      add_payment: 'افزودن پرداخت',
      send_notification: 'ارسال اعلان',
      settle: 'تسویه',
      write_off: 'حذف از دفاتر',
      payment_amount: 'مبلغ پرداخت',
      payment_method: 'روش پرداخت',
      reference_number: 'شماره مرجع',
      days_overdue: 'روز تأخیر',
      status: {
        active: 'فعال',
        overdue: 'معوق',
        settled: 'تسویه شده',
        written_off: 'حذف شده'
      },
      riskLevel: {
        low: 'کم',
        medium: 'متوسط',
        high: 'زیاد',
        critical: 'بحرانی'
      },
      created: 'بدهی با موفقیت ایجاد شد',
      payment_added: 'پرداخت با موفقیت اضافه شد',
      settled: 'بدهی تسویه شد',
      written_off: 'بدهی حذف شد'
    },

    // Error messages
    error: {
      serverError: 'خطای سرور',
      validationError: 'خطای اعتبارسنجی',
      notFound: 'مورد یافت نشد',
      unauthorized: 'غیرمجاز',
      forbidden: 'ممنوع',
      badRequest: 'درخواست نامعتبر',
      transactionNotFound: 'تراکنش یافت نشد',
      debtNotFound: 'بدهی یافت نشد',
      paymentNotFound: 'پرداخت یافت نشد',
      customerNotFound: 'مشتری یافت نشد',
      debtAlreadyExists: 'بدهی قبلاً برای این تراکنش وجود دارد',
      paymentAmountExceeds: 'مبلغ پرداخت از مبلغ باقی‌مانده بیشتر است',
      noFileUploaded: 'هیچ فایلی آپلود نشده است',
      invalidFileType: 'نوع فایل نامعتبر است',
      fileTooLarge: 'حجم فایل بیش از حد مجاز است'
    },

    // Super Admin
    super_admin: {
      title: 'سوپر ادمین',
      tenant_management: 'مدیریت صرافی‌ها',
      create_tenant: 'ایجاد صرافی جدید',
      tenant_info: 'اطلاعات صرافی',
      tenant_name: 'نام صرافی',
      tenant_code: 'کد صرافی',
      subscription_plan: 'طرح اشتراک',
      branch_count: 'تعداد شعبات',
      status: 'وضعیت',
      created_at: 'تاریخ ایجاد',
      subscription_expires: 'تاریخ انقضای اشتراک',
      activate_tenant: 'فعال‌سازی صرافی',
      deactivate_tenant: 'غیرفعال‌سازی صرافی',
      reset_password: 'بازنشانی رمز عبور',
      tenant_created: 'صرافی با موفقیت ایجاد شد',
      tenant_updated: 'صرافی با موفقیت به‌روزرسانی شد',
      tenant_deleted: 'صرافی با موفقیت حذف شد'
    },

    // Tenant Admin
    tenant_admin: {
      title: 'مدیر صرافی',
      branch_management: 'مدیریت شعبات',
      staff_management: 'مدیریت کارمندان',
      customer_management: 'مدیریت مشتریان',
      rate_management: 'مدیریت نرخ ارز',
      transaction_management: 'مدیریت تراکنش‌ها',
      remittance_management: 'مدیریت حواله‌ها',
      reporting: 'گزارش‌گیری',
      settings: 'تنظیمات',
      profile: 'پروفایل',
      security: 'امنیت',
      notifications: 'اعلان‌ها'
    },

    // Messages
    messages: {
      operation_success: 'عملیات با موفقیت انجام شد',
      operation_failed: 'عملیات ناموفق بود',
      data_saved: 'اطلاعات ذخیره شد',
      data_deleted: 'اطلاعات حذف شد',
      data_updated: 'اطلاعات به‌روزرسانی شد',
      confirmation_required: 'تأیید مورد نیاز است',
      are_you_sure: 'آیا مطمئن هستید؟',
      cannot_be_undone: 'این عملیات قابل بازگشت نیست',
      access_denied: 'دسترسی رد شد',
      not_found: 'مورد یافت نشد',
      validation_error: 'خطای اعتبارسنجی',
      server_error: 'خطای سرور',
      network_error: 'خطای شبکه',
      try_again: 'دوباره تلاش کنید'
    }
  },

  en: {
    // Common
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      confirm: 'Confirm',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      search: 'Search',
      filter: 'Filter',
      export: 'Export',
      import: 'Import',
      refresh: 'Refresh',
      close: 'Close',
      open: 'Open',
      yes: 'Yes',
      no: 'No',
      ok: 'OK',
      select: 'Select',
      all: 'All',
      none: 'None',
      actions: 'Actions',
      status: 'Status',
      date: 'Date',
      time: 'Time',
      amount: 'Amount',
      currency: 'Currency',
      description: 'Description',
      notes: 'Notes',
      created_at: 'Created At',
      updated_at: 'Updated At'
    },

    // Auth
    auth: {
      login: 'Login',
      logout: 'Logout',
      register: 'Register',
      forgot_password: 'Forgot Password',
      reset_password: 'Reset Password',
      email: 'Email',
      password: 'Password',
      confirm_password: 'Confirm Password',
      username: 'Username',
      full_name: 'Full Name',
      phone: 'Phone',
      national_id: 'National ID',
      remember_me: 'Remember Me',
      login_success: 'Login successful',
      login_failed: 'Login failed',
      logout_success: 'Logout successful',
      password_reset_sent: 'Password reset email sent',
      password_reset_success: 'Password reset successful',
      invalid_credentials: 'Invalid email or password',
      account_locked: 'Account is locked',
      session_expired: 'Session expired'
    },

    // Roles
    roles: {
      super_admin: 'Super Admin',
      tenant_admin: 'Exchange Admin',
      manager: 'Branch Manager',
      staff: 'Staff',
      customer: 'Customer'
    },

    // Dashboard
    dashboard: {
      title: 'Dashboard',
      welcome: 'Welcome',
      overview: 'Overview',
      statistics: 'Statistics',
      recent_activity: 'Recent Activity',
      quick_actions: 'Quick Actions',
      total_transactions: 'Total Transactions',
      total_remittances: 'Total Remittances',
      pending_approvals: 'Pending Approvals',
      total_balance: 'Total Balance',
      today_transactions: 'Today\'s Transactions',
      today_remittances: 'Today\'s Remittances',
      monthly_revenue: 'Monthly Revenue',
      active_customers: 'Active Customers',
      exchange_rates: 'Exchange Rates',
      system_status: 'System Status'
    },

    // Exchange
    exchange: {
      title: 'Currency Exchange',
      buy_currency: 'Buy Currency',
      sell_currency: 'Sell Currency',
      currency_pair: 'Currency Pair',
      amount: 'Amount',
      exchange_rate: 'Exchange Rate',
      commission: 'Commission',
      total_amount: 'Total Amount',
      converted_amount: 'Converted Amount',
      payment_method: 'Payment Method',
      delivery_method: 'Delivery Method',
      cash: 'Cash',
      bank_transfer: 'Bank Transfer',
      card: 'Card',
      crypto: 'Cryptocurrency',
      physical: 'Physical',
      account_credit: 'Account Credit',
      crypto_wallet: 'Crypto Wallet',
      transaction_success: 'Transaction completed successfully',
      insufficient_balance: 'Insufficient balance',
      invalid_amount: 'Invalid amount',
      rate_not_found: 'Exchange rate not found'
    },

    // Payment
    payment: {
      title: 'Payment',
      create_payment: 'Create Payment',
      payment_method: 'Payment Method',
      payment_status: 'Payment Status',
      payment_date: 'Payment Date',
      reference_number: 'Reference Number',
      sender_info: 'Sender Information',
      sender_name: 'Sender Name',
      sender_phone: 'Sender Phone',
      sender_national_id: 'Sender National ID',
      sender_email: 'Sender Email',
      bank_details: 'Bank Details',
      bank_name: 'Bank Name',
      account_number: 'Account Number',
      account_holder: 'Account Holder',
      iban: 'IBAN',
      swift_code: 'SWIFT Code',
      destination_account: 'Destination Account',
      receipts: 'Receipts',
      receipt_description: 'Receipt Description',
      uploaded_receipts: 'Uploaded Receipts',
      receipts_help: 'Image or PDF files up to 5MB',
      payment_created: 'Payment created successfully',
      payment_verified: 'Payment verified',
      payment_rejected: 'Payment rejected',
      payment_amount_exceeds: 'Payment amount exceeds remaining balance',
      no_file_uploaded: 'No file uploaded',
      receipt_uploaded: 'Receipt uploaded successfully',
      receipts_uploaded: 'Receipts uploaded successfully',
      method: {
        bank_transfer: 'Bank Transfer',
        cash: 'Cash',
        card: 'Card',
        digital_wallet: 'Digital Wallet',
        crypto: 'Cryptocurrency'
      },
      status: {
        pending: 'Pending',
        verified: 'Verified',
        rejected: 'Rejected',
        cancelled: 'Cancelled'
      }
    },

    // Remittance
    remittance: {
      title: 'Remittance',
      create_remittance: 'Create Remittance',
      inter_branch: 'Inter-branch',
      international: 'International',
      domestic: 'Domestic',
      receiver_info: 'Receiver Information',
      sender_info: 'Sender Information',
      delivery_info: 'Delivery Information',
      security_info: 'Security Information',
      receiver_name: 'Receiver Name',
      receiver_phone: 'Receiver Phone',
      receiver_email: 'Receiver Email',
      receiver_address: 'Receiver Address',
      bank_info: 'Bank Information',
      bank_name: 'Bank Name',
      account_number: 'Account Number',
      iban: 'IBAN',
      swift_code: 'SWIFT Code',
      pin_code: 'PIN Code',
      secret_question: 'Secret Question',
      secret_answer: 'Secret Answer',
      remittance_success: 'Remittance created successfully',
      remittance_cancelled: 'Remittance cancelled',
      approval_required: 'Approval required'
    },

    // Transactions
    transactions: {
      title: 'Transactions',
      transaction_id: 'Transaction ID',
      transaction_type: 'Transaction Type',
      transaction_status: 'Transaction Status',
      from_currency: 'From Currency',
      to_currency: 'To Currency',
      from_amount: 'From Amount',
      to_amount: 'To Amount',
      rate: 'Rate',
      commission: 'Commission',
      total_cost: 'Total Cost',
      payment_status: 'Payment Status',
      delivery_status: 'Delivery Status',
      created_by: 'Created By',
      created_at: 'Created At',
      completed: 'Completed',
      pending: 'Pending',
      cancelled: 'Cancelled',
      failed: 'Failed',
      processing: 'Processing',
      approved: 'Approved',
      rejected: 'Rejected'
    },

    // Accounts
    accounts: {
      title: 'Accounts',
      account_number: 'Account Number',
      account_type: 'Account Type',
      balance: 'Balance',
      available_balance: 'Available Balance',
      frozen_balance: 'Frozen Balance',
      currency: 'Currency',
      status: 'Status',
      interest_rate: 'Interest Rate',
      daily_limit: 'Daily Limit',
      monthly_limit: 'Monthly Limit',
      savings: 'Savings',
      current: 'Current',
      investment: 'Investment',
      crypto: 'Cryptocurrency',
      active: 'Active',
      suspended: 'Suspended',
      closed: 'Closed',
      pending: 'Pending'
    },

    // Exchange Rates
    rates: {
      title: 'Exchange Rates',
      current_rates: 'Current Rates',
      rate_history: 'Rate History',
      buy_rate: 'Buy Rate',
      sell_rate: 'Sell Rate',
      spread: 'Spread',
      commission: 'Commission',
      min_amount: 'Minimum Amount',
      max_amount: 'Maximum Amount',
      last_updated: 'Last Updated',
      source: 'Source',
      manual: 'Manual',
      api: 'API',
      market: 'Market',
      bank: 'Bank',
      rate_updated: 'Exchange rate updated',
      invalid_rate: 'Invalid rate'
    },

    // Debt Management
    debt: {
      title: 'Debt Management',
      management: {
        title: 'Debt Management'
      },
      create: 'Create Debt',
      customer: 'Customer',
      amount: 'Amount',
      remaining: 'Remaining',
      due_date: 'Due Date',
      status: 'Status',
      risk_level: 'Risk Level',
      add_payment: 'Add Payment',
      send_notification: 'Send Notification',
      settle: 'Settle',
      write_off: 'Write Off',
      payment_amount: 'Payment Amount',
      payment_method: 'Payment Method',
      reference_number: 'Reference Number',
      days_overdue: 'Days Overdue',
      status: {
        active: 'Active',
        overdue: 'Overdue',
        settled: 'Settled',
        written_off: 'Written Off'
      },
      riskLevel: {
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        critical: 'Critical'
      },
      created: 'Debt created successfully',
      payment_added: 'Payment added successfully',
      settled: 'Debt settled',
      written_off: 'Debt written off'
    },

    // Super Admin
    super_admin: {
      title: 'Super Admin',
      tenant_management: 'Exchange Management',
      create_tenant: 'Create New Exchange',
      tenant_info: 'Exchange Information',
      tenant_name: 'Exchange Name',
      tenant_code: 'Exchange Code',
      subscription_plan: 'Subscription Plan',
      branch_count: 'Branch Count',
      status: 'Status',
      created_at: 'Created At',
      subscription_expires: 'Subscription Expires',
      activate_tenant: 'Activate Exchange',
      deactivate_tenant: 'Deactivate Exchange',
      reset_password: 'Reset Password',
      tenant_created: 'Exchange created successfully',
      tenant_updated: 'Exchange updated successfully',
      tenant_deleted: 'Exchange deleted successfully'
    },

    // Tenant Admin
    tenant_admin: {
      title: 'Exchange Admin',
      branch_management: 'Branch Management',
      staff_management: 'Staff Management',
      customer_management: 'Customer Management',
      rate_management: 'Rate Management',
      transaction_management: 'Transaction Management',
      remittance_management: 'Remittance Management',
      reporting: 'Reporting',
      settings: 'Settings',
      profile: 'Profile',
      security: 'Security',
      notifications: 'Notifications'
    },

    // Messages
    messages: {
      operation_success: 'Operation completed successfully',
      operation_failed: 'Operation failed',
      data_saved: 'Data saved successfully',
      data_deleted: 'Data deleted successfully',
      data_updated: 'Data updated successfully',
      confirmation_required: 'Confirmation required',
      are_you_sure: 'Are you sure?',
      cannot_be_undone: 'This action cannot be undone',
      access_denied: 'Access denied',
      not_found: 'Not found',
      validation_error: 'Validation error',
      server_error: 'Server error',
      network_error: 'Network error',
      try_again: 'Please try again'
    }
  }
};

class I18n {
  constructor() {
    this.currentLanguage = 'fa'; // Default to Persian
  }

  setLanguage(language) {
    if (translations[language]) {
      this.currentLanguage = language;
      return true;
    }
    return false;
  }

  getLanguage() {
    return this.currentLanguage;
  }

  t(key, defaultValue = '') {
    const keys = key.split('.');
    let value = translations[this.currentLanguage];

    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        return defaultValue || key;
      }
    }

    return value;
  }

  formatCurrency(amount, currency = 'IRR') {
    const formatter = new Intl.NumberFormat(this.currentLanguage === 'fa' ? 'fa-IR' : 'en-US', {
      style: 'currency',
      currency: currency
    });
    return formatter.format(amount);
  }

  formatNumber(number) {
    const formatter = new Intl.NumberFormat(this.currentLanguage === 'fa' ? 'fa-IR' : 'en-US');
    return formatter.format(number);
  }

  formatDate(date) {
    const formatter = new Intl.DateTimeFormat(this.currentLanguage === 'fa' ? 'fa-IR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return formatter.format(new Date(date));
  }

  formatDateTime(date) {
    const formatter = new Intl.DateTimeFormat(this.currentLanguage === 'fa' ? 'fa-IR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    return formatter.format(new Date(date));
  }

  getAvailableLanguages() {
    return Object.keys(translations);
  }
}

module.exports = new I18n(); 