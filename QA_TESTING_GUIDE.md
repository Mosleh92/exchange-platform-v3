# 🧪 راهنمای جامع تست کیفیت (QA) سیستم صرافی

## فهرست مطالب
- [نصب و راه‌اندازی](#نصب-و-راه‌اندازی)
- [انواع تست‌ها](#انواع-تست‌ها)
- [تست‌های نقش‌محور](#تست‌های-نقش‌محور)
- [تست‌های گردش کامل](#تست‌های-گردش-کامل)
- [تست‌های امنیتی](#تست‌های-امنیتی)
- [تست‌های عملکردی](#تست‌های-عملکردی)
- [اجرای تست‌ها](#اجرای-تست‌ها)
- [گزارش‌گیری](#گزارش‌گیری)

---

## نصب و راه‌اندازی

### پیش‌نیازها
```bash
# نصب وابستگی‌های testing
cd backend && npm install
cd ../frontend && npm install

# راه‌اندازی دیتابیس تست
docker run -d --name mongo-test -p 27017:27017 mongo:6.0
docker run -d --name redis-test -p 6379:6379 redis:7-alpine

# نصب k6 برای تست عملکرد
# Linux/macOS:
brew install k6
# یا
sudo apt install k6
```

### تنظیم محیط تست
```bash
# کپی فایل تنظیمات تست
cp backend/.env.example backend/.env.test

# ویرایش تنظیمات تست
nano backend/.env.test
```

---

## انواع تست‌ها

### 1. 🔬 Unit Tests
تست اجزای مجزای کد بدون وابستگی خارجی

**مکان:** `backend/src/tests/unit/`

**مثال اجرا:**
```bash
cd backend
npm run test:unit
```

### 2. 🔗 Integration Tests
تست تعامل بین اجزای مختلف سیستم

**مکان:** `backend/src/tests/integration/`

**ویژگی‌های کلیدی:**
- ✅ Tenant Isolation
- ✅ Payment Processing
- ✅ Authentication Flow
- ✅ Database Operations

### 3. 🎭 Role-Based Tests
تست کارکرد بر اساس نقش‌های مختلف کاربران

**مکان:** `backend/src/tests/qa/role-based/`

**نقش‌ها:**
- **Super Admin**: مدیریت کل سیستم
- **Tenant Admin**: مدیریت صرافی
- **Branch Admin**: مدیریت شعبه
- **Branch Staff**: کارمند شعبه

### 4. 🌐 End-to-End Tests
تست کامل User Journey از Frontend تا Backend

**مکان:** `frontend/cypress/e2e/`

**سناریوهای کلیدی:**
- گردش کامل معامله
- فرآیند ثبت مشتری
- صدور حواله بین‌المللی

### 5. 🔐 Security Tests
تست‌های امنیتی جامع

**مکان:** `backend/src/tests/qa/security/`

**موارد تست:**
- Tenant Isolation
- Authentication & Authorization
- JWT Token Security
- Rate Limiting

### 6. ⚡ Performance Tests
تست عملکرد و بار سیستم

**مکان:** `backend/src/tests/qa/performance/`

**ابزار:** K6
**هدف:** 100 کاربر همزمان، 1000 تراکنش/ساعت، زمان پاسخ < 2 ثانیه

---

## تست‌های نقش‌محور

### تست سوپر ادمین
```bash
# اجرای تست‌های سوپر ادمین
npm run test:qa:roles -- --testNamePattern="Super Admin"
```

**چکلیست:**
- [ ] ایجاد tenant جدید (صرافی)
- [ ] تنظیم شعبات و کاربران زیرمجموعه
- [ ] مدیریت اشتراکها و پلن‌ها
- [ ] نظارت بر تمام تراکنش‌ها و گزارش‌ها
- [ ] مدیریت وضعیت امنیتی سیستم

### تست صرافی (Tenant Admin)
```bash
npm run test:qa:roles -- --testNamePattern="Tenant Admin"
```

**چکلیست:**
- [ ] مدیریت شعبات تحت نظارت
- [ ] تنظیم نرخ‌های ارز و کمیسیون‌ها
- [ ] مشاهده گزارش‌های مالی کل صرافی
- [ ] مدیریت کاربران شعبات
- [ ] تنظیمات امنیتی صرافی

### تست مدیر شعبه (Branch Admin)
```bash
npm run test:qa:roles -- --testNamePattern="Branch Admin"
```

**چکلیست:**
- [ ] ثبت و مدیریت مشتریهای شعبه
- [ ] انجام معاملات ارزی
- [ ] ثبت پرداخت‌ها و رسیدها
- [ ] صدور حواله‌های بین‌المللی
- [ ] گزارش‌گیری عملکرد شعبه

### تست کارمند شعبه (Branch Staff)
```bash
npm run test:qa:roles -- --testNamePattern="Branch Staff"
```

**چکلیست:**
- [ ] ثبت مشتری جدید
- [ ] انجام معاملات مجاز
- [ ] ثبت رسید پرداخت
- [ ] مشاهده گزارش‌های مجاز

---

## تست‌های گردش کامل

### سناریو اصلی: معامله → پرداخت → رسید → ثبت → حواله → گزارش

```bash
# اجرای تست گردش کامل
npm run test:qa:e2e
```

**مراحل تست:**
1. **صرافی ایجاد معامله جدید**
   - انتخاب نرخ ارز
   - تعیین مقدار و کمیسیون

2. **مشتری پرداخت**
   - آپلود رسید بانکی
   - تایید اطلاعات پرداخت

3. **کارمند تایید رسید**
   - بررسی صحت مبلغ
   - ثبت در سیستم

4. **صدور حواله**
   - ایجاد کد پیگیری
   - ارسال اطلاعات به گیرنده

5. **تولید گزارش**
   - گزارش تراکنش
   - بروزرسانی موجودی

### تست‌های سناریوهای جانبی
```bash
# تست لغو معامله
npm run test:qa:e2e -- --grep "cancellation"

# تست رد پرداخت
npm run test:qa:e2e -- --grep "rejected payment"

# تست معاملات پرارزش
npm run test:qa:e2e -- --grep "high-value"
```

---

## تست‌های امنیتی

### Tenant Isolation Testing
```bash
npm run test:qa:security -- --testNamePattern="Tenant Isolation"
```

**موارد تست:**
- [ ] تلاش دسترسی کاربر شعبه A به داده‌های شعبه B
- [ ] تست نقض دسترسی cross-tenant
- [ ] بررسی فیلترهای خودکار tenant_id
- [ ] تست session hijacking

### Authentication & Authorization
```bash
npm run test:qa:security -- --testNamePattern="Auth"
```

**موارد تست:**
- [ ] تست JWT token manipulation
- [ ] تست role-based access control
- [ ] تست 2FA اگر فعال باشد
- [ ] تست rate limiting

---

## تست‌های عملکردی

### Load Testing با K6
```bash
# تست بار عادی (100 کاربر)
k6 run backend/src/tests/qa/performance/load-test.js

# تست بار سنگین (300 کاربر)
k6 run -e K6_VUS=300 backend/src/tests/qa/performance/load-test.js

# تست spike (500 کاربر ناگهانی)
k6 run -e SCENARIO=spike backend/src/tests/qa/performance/load-test.js
```

**معیارهای موفقیت:**
- Response time < 2 ثانیه (95%)
- Error rate < 1%
- 100 کاربر همزمان
- 1000 تراکنش در ساعت

---

## اجرای تست‌ها

### تست‌های Backend
```bash
cd backend

# همه تست‌ها
npm test

# تست‌های QA
npm run test:qa

# تست‌های نقش‌محور
npm run test:qa:roles

# تست‌های امنیتی
npm run test:qa:security

# تست‌های E2E backend
npm run test:qa:e2e

# تست با Coverage
npm run test:coverage
```

### تست‌های Frontend
```bash
cd frontend

# تست‌های واحد
npm test

# تست‌های E2E
npm run test:e2e

# تست‌های E2E تعاملی
npm run test:e2e:open

# تست با Coverage
npm run test:coverage
```

### تست‌های عملکردی
```bash
# اجرای K6
npm run test:performance

# با متغیرهای محیطی
BASE_URL=https://staging.example.com k6 run backend/src/tests/qa/performance/load-test.js
```

---

## گزارش‌گیری

### تولید گزارش جامع
```bash
# اجرای تمام تست‌ها و تولید گزارش
./scripts/run-qa-tests.sh

# یا به صورت دستی:
npm run test:coverage > qa-report.txt
npm run test:e2e >> qa-report.txt
npm run test:performance >> qa-report.txt
```

### قالب گزارش نهایی QA

```markdown
## گزارش تست کیفیت نهایی

### خلاصه اجرایی
- تاریخ تست: [DATE]
- محیط تست: [ENVIRONMENT]
- نسخه سیستم: [VERSION]

### نتایج تست‌ها
- تعداد تست‌های اجرا شده: [TOTAL]
- تست‌های موفق: [PASSED]
- تست‌های ناموفق: [FAILED]
- درصد موفقیت: [PERCENTAGE]%

### پوشش کد (Coverage)
- خطوط کد: [LINE_COVERAGE]%
- توابع: [FUNCTION_COVERAGE]%
- شاخه‌ها: [BRANCH_COVERAGE]%

### تست‌های نقش‌محور
- [x] Super Admin: [STATUS]
- [x] Tenant Admin: [STATUS]
- [x] Branch Admin: [STATUS]
- [x] Branch Staff: [STATUS]

### تست‌های امنیتی
- [x] Tenant Isolation: [STATUS]
- [x] Authentication: [STATUS]
- [x] Authorization: [STATUS]
- [x] JWT Security: [STATUS]

### تست‌های عملکردی
- متوسط زمان پاسخ: [AVG_RESPONSE_TIME]ms
- حداکثر کاربر همزمان: [MAX_CONCURRENT]
- نرخ خطا: [ERROR_RATE]%
- مصرف منابع: [RESOURCE_USAGE]

### مشکلات کشف شده
1. [Critical] [ISSUE_DESCRIPTION]
   - راه حل پیشنهادی: [SOLUTION]
   
2. [High] [ISSUE_DESCRIPTION]
   - راه حل پیشنهادی: [SOLUTION]

### توصیه‌ها
- [RECOMMENDATION_1]
- [RECOMMENDATION_2]
- آمادگی برای production: [YES/NO]

### ضمائم
- لاگ‌های تفصیلی: [LINK]
- تصاویر تست‌ها: [LINK]
- گزارش عملکرد: [LINK]
```

---

## اقدامات بعدی

### تست محیط Development
```bash
npm run test:qa
npm run test:security
npm run test:performance
```

### تست محیط Staging
- تست با داده‌های واقعی
- تست load balancing
- تست backup/restore

### تست محیط Production
- Smoke tests
- Health checks
- Monitoring validation

---

## نکات مهم

1. **همیشه تست‌ها را قبل از commit اجرا کنید**
2. **Coverage باید بالای 70% باشد**
3. **تست‌های امنیتی اجباری هستند**
4. **عملکرد باید در threshold های تعریف شده باشد**
5. **تست‌های E2E در محیط مشابه production اجرا شوند**

**Pipeline خودکار است اما local testing همیشه سریع‌تر و مؤثرتر است.**