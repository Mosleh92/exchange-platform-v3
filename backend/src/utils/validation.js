const { body } = require("express-validator");

class ValidationRules {
  static loginValidation() {
    return [
      body("tenantId")
        .notEmpty()
        .withMessage("شناسه صرافی الزامی است")
        .isLength({ min: 3, max: 20 })
        .withMessage("شناسه صرافی باید بین 3 تا 20 کاراکتر باشد"),

      body("username")
        .notEmpty()
        .withMessage("نام کاربری الزامی است")
        .isLength({ min: 3, max: 50 })
        .withMessage("نام کاربری باید بین 3 تا 50 کاراکتر باشد"),

      body("password")
        .notEmpty()
        .withMessage("رمز عبور الزامی است")
        .isLength({ min: 6 })
        .withMessage("رمز عبور باید حداقل 6 کاراکتر باشد"),
    ];
  }

  static registerValidation() {
    return [
      body("tenantId").notEmpty().withMessage("شناسه صرافی الزامی است"),

      body("username")
        .notEmpty()
        .withMessage("نام کاربری الزامی است")
        .isLength({ min: 3, max: 50 })
        .withMessage("نام کاربری باید بین 3 تا 50 کاراکتر باشد"),

      body("email").isEmail().withMessage("ایمیل معتبر وارد کنید"),

      body("password")
        .notEmpty()
        .withMessage("رمز عبور الزامی است")
        .isLength({ min: 6 })
        .withMessage("رمز عبور باید حداقل 6 کاراکتر باشد"),

      body("role")
        .isIn([
          "customer",
          "staff",
          "branchManager",
          "tenantAdmin",
          "superAdmin",
        ])
        .withMessage("نقش کاربر معتبر نیست"),
    ];
  }

  static partnerValidation() {
    return [
      body("name").notEmpty().withMessage("نام همکار الزامی است"),

      body("email").isEmail().withMessage("ایمیل معتبر وارد کنید"),

      body("commissionRate")
        .isFloat({ min: 0, max: 10 })
        .withMessage("نرخ کمیسیون باید بین 0 تا 10 درصد باشد"),

      body("discountRate")
        .isFloat({ min: 0, max: 10 })
        .withMessage("نرخ تخفیف باید بین 0 تا 10 درصد باشد"),

      body("maxLimit")
        .isInt({ min: 100 })
        .withMessage("حد مجاز معامله باید حداقل 100 باشد"),
    ];
  }

  static tenantValidation() {
    return [
      body("name").notEmpty().withMessage("نام صرافی الزامی است"),

      body("code")
        .notEmpty()
        .withMessage("کد صرافی الزامی است")
        .isLength({ min: 2, max: 10 })
        .withMessage("کد صرافی باید بین 2 تا 10 کاراکتر باشد"),

      body("type")
        .isIn(["exchange", "bank", "financial_institution"])
        .withMessage("نوع صرافی معتبر نیست"),

      body("contact.email").isEmail().withMessage("ایمیل معتبر وارد کنید"),

      body("subscription.plan")
        .isIn(["basic", "premium", "enterprise", "custom"])
        .withMessage("طرح اشتراک معتبر نیست"),

      body("subscription.endDate")
        .isISO8601()
        .withMessage("تاریخ پایان اشتراک معتبر نیست"),
    ];
  }

  static branchValidation() {
    return [
      body("name").notEmpty().withMessage("نام شعبه الزامی است"),

      body("code").notEmpty().withMessage("کد شعبه الزامی است"),

      body("address").notEmpty().withMessage("آدرس شعبه الزامی است"),

      body("phone").notEmpty().withMessage("شماره تلفن شعبه الزامی است"),
    ];
  }

  static rateValidation() {
    return [
      body("fromCurrency")
        .notEmpty()
        .withMessage("ارز مبدا الزامی است")
        .isLength({ min: 3, max: 3 })
        .withMessage("کد ارز باید 3 کاراکتر باشد"),

      body("toCurrency")
        .notEmpty()
        .withMessage("ارز مقصد الزامی است")
        .isLength({ min: 3, max: 3 })
        .withMessage("کد ارز باید 3 کاراکتر باشد"),

      body("buyRate")
        .isFloat({ min: 0 })
        .withMessage("نرخ خرید باید مثبت باشد"),

      body("sellRate")
        .isFloat({ min: 0 })
        .withMessage("نرخ فروش باید مثبت باشد"),
    ];
  }

  static transactionValidation() {
    return [
      body("customerId").notEmpty().withMessage("شناسه مشتری الزامی است"),

      body("type")
        .isIn(["buy", "sell", "transfer", "deposit", "withdrawal"])
        .withMessage("نوع تراکنش معتبر نیست"),

      body("amount")
        .isFloat({ min: 0.01 })
        .withMessage("مبلغ باید بیشتر از صفر باشد"),

      body("currency")
        .notEmpty()
        .withMessage("ارز الزامی است")
        .isLength({ min: 3, max: 3 })
        .withMessage("کد ارز باید 3 کاراکتر باشد"),
    ];
  }

  static customerValidation() {
    return [
      body("name").notEmpty().withMessage("نام مشتری الزامی است"),

      body("email").isEmail().withMessage("ایمیل معتبر وارد کنید"),

      body("phone").notEmpty().withMessage("شماره تلفن الزامی است"),

      body("nationalId").notEmpty().withMessage("کد ملی الزامی است"),
    ];
  }

  // Payment validation
  static paymentValidation() {
    return [
      body("transactionId").notEmpty().withMessage("شناسه تراکنش الزامی است"),

      body("customerId").notEmpty().withMessage("شناسه مشتری الزامی است"),

      body("amount")
        .isFloat({ min: 0.01 })
        .withMessage("مبلغ باید بیشتر از صفر باشد"),

      body("currency")
        .notEmpty()
        .withMessage("ارز الزامی است")
        .isLength({ min: 3, max: 3 })
        .withMessage("کد ارز باید 3 کاراکتر باشد"),

      body("paymentMethod")
        .isIn(["bank_transfer", "cash", "card", "digital_wallet", "crypto"])
        .withMessage("روش پرداخت معتبر نیست"),
    ];
  }

  // Debt validation
  static debtValidation() {
    return [
      body("customerId").notEmpty().withMessage("شناسه مشتری الزامی است"),

      body("transactionId").notEmpty().withMessage("شناسه تراکنش الزامی است"),

      body("originalAmount")
        .isFloat({ min: 0.01 })
        .withMessage("مبلغ اصلی باید بیشتر از صفر باشد"),

      body("currency")
        .notEmpty()
        .withMessage("ارز الزامی است")
        .isLength({ min: 3, max: 3 })
        .withMessage("کد ارز باید 3 کاراکتر باشد"),

      body("dueDate").isISO8601().withMessage("تاریخ سررسید معتبر نیست"),

      body("interestRate")
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage("نرخ سود باید بین 0 تا 100 درصد باشد"),

      body("penaltyRate")
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage("نرخ جریمه باید بین 0 تا 100 درصد باشد"),
    ];
  }

  // Exchange Account validation
  static exchangeAccountValidation() {
    return [
      body("customerId").notEmpty().withMessage("شناسه مشتری الزامی است"),

      body("accountType")
        .isIn(["savings", "current", "investment", "holding"])
        .withMessage("نوع حساب معتبر نیست"),

      body("currency")
        .notEmpty()
        .withMessage("ارز الزامی است")
        .isLength({ min: 3, max: 3 })
        .withMessage("کد ارز باید 3 کاراکتر باشد"),

      body("interestRate")
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage("نرخ سود باید بین 0 تا 100 درصد باشد"),

      body("monthlyFee")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("کارمزد ماهانه باید مثبت باشد"),
    ];
  }

  // Inter-Branch Transfer validation
  static interBranchTransferValidation() {
    return [
      body("sourceBranchId")
        .notEmpty()
        .withMessage("شناسه شعبه مبدا الزامی است"),

      body("destinationBranchId")
        .notEmpty()
        .withMessage("شناسه شعبه مقصد الزامی است"),

      body("amount")
        .isFloat({ min: 0.01 })
        .withMessage("مبلغ باید بیشتر از صفر باشد"),

      body("currency")
        .notEmpty()
        .withMessage("ارز الزامی است")
        .isLength({ min: 3, max: 3 })
        .withMessage("کد ارز باید 3 کاراکتر باشد"),

      body("transferType")
        .isIn(["cash", "account", "emergency", "regular"])
        .withMessage("نوع انتقال معتبر نیست"),

      body("transferDetails.method")
        .isIn(["bank_transfer", "cash_courier", "digital_transfer", "check"])
        .withMessage("روش انتقال معتبر نیست"),
    ];
  }

  // Update validations
  static tenantUpdateValidation() {
    return [
      body("name")
        .optional()
        .notEmpty()
        .withMessage("نام صرافی نمی‌تواند خالی باشد"),

      body("contact.email")
        .optional()
        .isEmail()
        .withMessage("ایمیل معتبر وارد کنید"),
    ];
  }

  static branchUpdateValidation() {
    return [
      body("name")
        .optional()
        .notEmpty()
        .withMessage("نام شعبه نمی‌تواند خالی باشد"),

      body("phone")
        .optional()
        .notEmpty()
        .withMessage("شماره تلفن نمی‌تواند خالی باشد"),
    ];
  }

  static rateUpdateValidation() {
    return [
      body("buyRate")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("نرخ خرید باید مثبت باشد"),

      body("sellRate")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("نرخ فروش باید مثبت باشد"),
    ];
  }

  static transactionUpdateValidation() {
    return [
      body("amount")
        .optional()
        .isFloat({ min: 0.01 })
        .withMessage("مبلغ باید بیشتر از صفر باشد"),

      body("status")
        .optional()
        .isIn(["pending", "approved", "completed", "cancelled", "rejected"])
        .withMessage("وضعیت معتبر نیست"),
    ];
  }

  static customerUpdateValidation() {
    return [
      body("name")
        .optional()
        .notEmpty()
        .withMessage("نام مشتری نمی‌تواند خالی باشد"),

      body("email").optional().isEmail().withMessage("ایمیل معتبر وارد کنید"),
    ];
  }

  // Calculate validation
  static calculateValidation() {
    return [
      body("fromCurrency").notEmpty().withMessage("ارز مبدا الزامی است"),

      body("toCurrency").notEmpty().withMessage("ارز مقصد الزامی است"),

      body("amount")
        .isFloat({ min: 0.01 })
        .withMessage("مبلغ باید بیشتر از صفر باشد"),
    ];
  }
}

module.exports = ValidationRules;
