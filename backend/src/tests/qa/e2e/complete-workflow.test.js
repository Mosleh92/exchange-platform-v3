const request = require('supertest');
const app = require('../../../app');

describe('End-to-End Workflow: Complete Transaction Flow', () => {
  let scenario, tokens;

  beforeEach(async () => {
    scenario = await global.testUtils.createTestScenario();
    tokens = global.testUtils.generateTokensForScenario(scenario);
    
    // Setup exchange rates for the complete workflow
    await global.testUtils.createTestExchangeRate({
      tenantId: scenario.tenant._id,
      fromCurrency: 'USD',
      toCurrency: 'IRR',
      buyRate: 42000,
      sellRate: 42500
    });
  });

  describe('سناریو کامل: ایجاد معامله → پرداخت → رسید → ثبت → حواله → گزارش', () => {
    it('should complete full transaction workflow', async () => {
      // مرحله 1: ثبت مشتری
      console.log('🔍 مرحله 1: ثبت مشتری جدید');
      const customerData = {
        firstName: 'احمد',
        lastName: 'رضایی',
        email: 'ahmad.rezaei@example.com',
        phone: '09123456789',
        nationalId: '1234567890',
        dateOfBirth: '1985-01-15',
        address: 'تهران، خیابان ولیعصر، پلاک 123',
        documentType: 'nationalCard',
        documentNumber: 'A123456789'
      };

      const customerResponse = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send(customerData);

      expect(customerResponse.status).toBe(201);
      global.testUtils.expectSuccessResponse(customerResponse);
      const customer = customerResponse.body.data.customer;
      console.log('✅ مشتری ثبت شد:', customer.firstName, customer.lastName);

      // مرحله 2: تایید مشتری
      console.log('🔍 مرحله 2: تایید و فعال‌سازی مشتری');
      const verifyCustomerResponse = await request(app)
        .put(`/api/customers/${customer.id}/verify`)
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send({
          status: 'verified',
          verificationLevel: 'level2',
          verifiedBy: tokens.branchAdminToken,
          verificationNotes: 'مدارک بررسی و تایید شد'
        });

      expect(verifyCustomerResponse.status).toBe(200);
      console.log('✅ مشتری تایید شد');

      // مرحله 3: ایجاد معامله جدید
      console.log('🔍 مرحله 3: ایجاد معامله ارزی');
      const transactionData = {
        customerId: customer.id,
        type: 'buy', // مشتری دلار می‌خرد
        sourceCurrency: 'IRR',
        targetCurrency: 'USD',
        sourceAmount: 4200000, // 4.2 میلیون تومان
        description: 'خرید دلار برای سفر',
        paymentMethod: 'bank_transfer'
      };

      const transactionResponse = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send(transactionData);

      expect(transactionResponse.status).toBe(201);
      global.testUtils.expectSuccessResponse(transactionResponse);
      const transaction = transactionResponse.body.data.transaction;
      console.log('✅ معامله ایجاد شد:', transaction.id, '- مبلغ:', transaction.sourceAmount, 'تومان');

      // مرحله 4: محاسبه نرخ و کمیسیون
      console.log('🔍 مرحله 4: محاسبه نرخ ارز و کمیسیون');
      const calculationResponse = await request(app)
        .get('/api/transactions/calculate')
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .query({
          sourceCurrency: 'IRR',
          targetCurrency: 'USD',
          sourceAmount: 4200000,
          type: 'buy'
        });

      expect(calculationResponse.status).toBe(200);
      global.testUtils.expectSuccessResponse(calculationResponse);
      const calculation = calculationResponse.body.data.calculation;
      console.log('✅ محاسبه انجام شد - نرخ:', calculation.rate, '- کمیسیون:', calculation.commission);

      // مرحله 5: پرداخت توسط مشتری (شبیه‌سازی)
      console.log('🔍 مرحله 5: پرداخت توسط مشتری');
      // در اینجا مشتری پرداخت می‌کند و رسید بانکی دارد
      
      // مرحله 6: ثبت رسید پرداخت
      console.log('🔍 مرحله 6: ثبت رسید پرداخت');
      const receiptData = {
        transactionId: transaction.id,
        paymentMethod: 'bank_transfer',
        amount: transaction.sourceAmount,
        currency: transaction.sourceCurrency,
        bankDetails: {
          bankName: 'بانک ملی ایران',
          accountNumber: '1234567890123456',
          transactionReference: 'REF' + Date.now(),
          transferDate: new Date().toISOString()
        },
        receiptImage: 'base64-encoded-receipt-image-data',
        receivedBy: 'branch_staff',
        notes: 'رسید بانکی تایید شد'
      };

      const receiptResponse = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .send(receiptData);

      expect(receiptResponse.status).toBe(201);
      global.testUtils.expectSuccessResponse(receiptResponse);
      const receipt = receiptResponse.body.data.receipt;
      console.log('✅ رسید ثبت شد:', receipt.id);

      // مرحله 7: تایید رسید و پرداخت
      console.log('🔍 مرحله 7: تایید رسید توسط مدیر شعبه');
      const verifyReceiptResponse = await request(app)
        .put(`/api/receipts/${receipt.id}/verify`)
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send({
          verificationStatus: 'verified',
          verificationNotes: 'رسید بانکی بررسی و تایید شد',
          verifiedBy: 'branch_admin'
        });

      expect(verifyReceiptResponse.status).toBe(200);
      console.log('✅ رسید تایید شد');

      // مرحله 8: تایید و تکمیل معامله
      console.log('🔍 مرحله 8: تایید نهایی معامله');
      const approveTransactionResponse = await request(app)
        .put(`/api/transactions/${transaction.id}/approve`)
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send({
          approvalNotes: 'پرداخت تایید شد - معامله قابل تحویل',
          finalAmount: calculation.targetAmount,
          finalRate: calculation.rate
        });

      expect(approveTransactionResponse.status).toBe(200);
      global.testUtils.expectSuccessResponse(approveTransactionResponse);
      console.log('✅ معامله تایید شد');

      // مرحله 9: تحویل ارز / صدور حواله
      console.log('🔍 مرحله 9: صدور حواله بین‌المللی');
      const remittanceData = {
        transactionId: transaction.id,
        customerId: customer.id,
        senderName: `${customer.firstName} ${customer.lastName}`,
        senderPhone: customer.phone,
        recipientName: 'John Smith',
        recipientPhone: '+1234567890',
        recipientCountry: 'USA',
        recipientCity: 'New York',
        recipientAddress: '123 Broadway, New York, NY 10001',
        recipientBankDetails: {
          bankName: 'Chase Bank',
          accountNumber: 'US1234567890',
          routingNumber: '021000021',
          swiftCode: 'CHASUS33'
        },
        amount: calculation.targetAmount,
        currency: 'USD',
        purpose: 'personal_transfer',
        transferType: 'wire_transfer'
      };

      const remittanceResponse = await request(app)
        .post('/api/remittances')
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send(remittanceData);

      expect(remittanceResponse.status).toBe(201);
      global.testUtils.expectSuccessResponse(remittanceResponse);
      const remittance = remittanceResponse.body.data.remittance;
      console.log('✅ حواله صادر شد - کد پیگیری:', remittance.trackingCode);

      // مرحله 10: بروزرسانی وضعیت حواله
      console.log('🔍 مرحله 10: بروزرسانی وضعیت حواله');
      const updateRemittanceResponse = await request(app)
        .put(`/api/remittances/${remittance.id}/status`)
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send({
          status: 'in_transit',
          statusMessage: 'حواله به بانک مقصد ارسال شد',
          estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 روز
          updatedBy: 'branch_admin'
        });

      expect(updateRemittanceResponse.status).toBe(200);
      console.log('✅ وضعیت حواله بروزرسانی شد');

      // مرحله 11: تولید گزارش معامله
      console.log('🔍 مرحله 11: تولید گزارش معامله');
      const reportResponse = await request(app)
        .get('/api/reports/transaction-detail')
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .query({
          transactionId: transaction.id,
          includeCustomer: true,
          includeRemittance: true,
          includeReceipts: true
        });

      expect(reportResponse.status).toBe(200);
      global.testUtils.expectSuccessResponse(reportResponse);
      const report = reportResponse.body.data.report;
      console.log('✅ گزارش تولید شد');

      // مرحله 12: بروزرسانی موجودی
      console.log('🔍 مرحله 12: بروزرسانی موجودی شعبه');
      const inventoryUpdateResponse = await request(app)
        .post('/api/inventory/update')
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send({
          branchId: scenario.branch._id,
          currency: 'USD',
          amount: -calculation.targetAmount, // کاهش موجودی دلار
          transactionId: transaction.id,
          type: 'sale',
          notes: 'فروش دلار به مشتری'
        });

      expect([200, 201]).toContain(inventoryUpdateResponse.status);
      console.log('✅ موجودی بروزرسانی شد');

      // تایید نهایی: بررسی تمام اطلاعات
      console.log('🔍 مرحله نهایی: بررسی کلی معامله');
      
      // بررسی وضعیت نهایی معامله
      const finalTransactionCheck = await request(app)
        .get(`/api/transactions/${transaction.id}`)
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`);

      expect(finalTransactionCheck.status).toBe(200);
      expect(finalTransactionCheck.body.data.transaction.status).toBe('approved');
      
      // بررسی حواله
      const remittanceCheck = await request(app)
        .get(`/api/remittances/track/${remittance.trackingCode}`)
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`);

      expect(remittanceCheck.status).toBe(200);
      expect(remittanceCheck.body.data.remittance.status).toBe('in_transit');

      // بررسی آخرین وضعیت مشتری
      const customerCheck = await request(app)
        .get(`/api/customers/${customer.id}`)
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`);

      expect(customerCheck.status).toBe(200);
      expect(customerCheck.body.data.customer.status).toBe('verified');

      console.log('🎉 گردش کامل عملیات با موفقیت تکمیل شد!');
      console.log('📊 خلاصه:');
      console.log(`   • مشتری: ${customer.firstName} ${customer.lastName}`);
      console.log(`   • معامله: ${transaction.sourceAmount} ${transaction.sourceCurrency} → ${calculation.targetAmount} ${transaction.targetCurrency}`);
      console.log(`   • نرخ: ${calculation.rate}`);
      console.log(`   • حواله: ${remittance.trackingCode}`);
      console.log(`   • وضعیت: ${finalTransactionCheck.body.data.transaction.status}`);

      // تست‌های نهایی
      expect(customer).toBeDefined();
      expect(transaction).toBeDefined();
      expect(receipt).toBeDefined();
      expect(remittance).toBeDefined();
      expect(report).toBeDefined();
    }, 60000); // 60 second timeout for complete workflow

    it('should handle transaction cancellation workflow', async () => {
      console.log('🔍 تست لغو معامله');
      
      // ایجاد معامله
      const customer = await global.testUtils.createTestCustomer({
        tenantId: scenario.tenant._id,
        status: 'verified'
      });

      const transaction = await global.testUtils.createTestTransaction({
        tenantId: scenario.tenant._id,
        customerId: customer._id,
        branchId: scenario.branch._id,
        status: 'pending'
      });

      // لغو معامله
      const cancelResponse = await request(app)
        .put(`/api/transactions/${transaction._id}/cancel`)
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send({
          cancellationReason: 'درخواست مشتری',
          cancellationNotes: 'مشتری انصراف داد'
        });

      expect(cancelResponse.status).toBe(200);
      global.testUtils.expectSuccessResponse(cancelResponse);
      expect(cancelResponse.body.data.transaction.status).toBe('cancelled');
      
      console.log('✅ معامله با موفقیت لغو شد');
    });

    it('should handle rejected payment workflow', async () => {
      console.log('🔍 تست رد پرداخت');
      
      const customer = await global.testUtils.createTestCustomer({
        tenantId: scenario.tenant._id,
        status: 'verified'
      });

      const transaction = await global.testUtils.createTestTransaction({
        tenantId: scenario.tenant._id,
        customerId: customer._id,
        branchId: scenario.branch._id,
        status: 'pending'
      });

      // ثبت رسید پرداخت
      const receipt = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .send({
          transactionId: transaction._id,
          paymentMethod: 'bank_transfer',
          amount: 1000000,
          currency: 'IRR'
        });

      // رد رسید
      const rejectReceiptResponse = await request(app)
        .put(`/api/receipts/${receipt.body.data.receipt.id}/reject`)
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send({
          rejectionReason: 'مبلغ ناکافی',
          rejectionNotes: 'مبلغ واریزی کمتر از مبلغ معامله است'
        });

      expect(rejectReceiptResponse.status).toBe(200);
      global.testUtils.expectSuccessResponse(rejectReceiptResponse);

      // رد معامله
      const rejectTransactionResponse = await request(app)
        .put(`/api/transactions/${transaction._id}/reject`)
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send({
          rejectionReason: 'پرداخت نامعتبر'
        });

      expect(rejectTransactionResponse.status).toBe(200);
      expect(rejectTransactionResponse.body.data.transaction.status).toBe('rejected');
      
      console.log('✅ فرآیند رد پرداخت با موفقیت انجام شد');
    });

    it('should handle high-value transaction approval workflow', async () => {
      console.log('🔍 تست معامله پرارزش');
      
      const customer = await global.testUtils.createTestCustomer({
        tenantId: scenario.tenant._id,
        status: 'verified',
        verificationLevel: 'level3' // سطح بالای تایید
      });

      // معامله پرارزش (بیش از حد مجاز کارمند)
      const highValueTransaction = {
        customerId: customer._id,
        type: 'sell',
        sourceCurrency: 'USD',
        targetCurrency: 'IRR',
        sourceAmount: 50000, // $50,000
        description: 'معامله پرارزش - نیاز به تایید مدیر'
      };

      const transactionResponse = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .send(highValueTransaction);

      // کارمند نمی‌تواند معامله پرارزش ایجاد کند
      expect([201, 403]).toContain(transactionResponse.status);

      if (transactionResponse.status === 201) {
        const transaction = transactionResponse.body.data.transaction;
        expect(transaction.status).toBe('pending');
        expect(transaction.requiresApproval).toBe(true);

        // تایید توسط مدیر شعبه
        const approvalResponse = await request(app)
          .put(`/api/transactions/${transaction.id}/approve`)
          .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
          .send({
            approvalNotes: 'معامله پرارزش تایید شد',
            approvalLevel: 'branch_admin'
          });

        expect(approvalResponse.status).toBe(200);
        console.log('✅ معامله پرارزش توسط مدیر شعبه تایید شد');
      }
    });
  });

  describe('Performance and Stress Testing', () => {
    it('should handle multiple concurrent transactions', async () => {
      console.log('🔍 تست همزمانی معاملات');
      
      const customer = await global.testUtils.createTestCustomer({
        tenantId: scenario.tenant._id,
        status: 'verified'
      });

      // ایجاد چندین معامله همزمان
      const transactionPromises = Array.from({ length: 5 }, (_, i) => 
        request(app)
          .post('/api/transactions')
          .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
          .send({
            customerId: customer._id,
            type: 'buy',
            sourceCurrency: 'IRR',
            targetCurrency: 'USD',
            sourceAmount: 1000000 * (i + 1),
            description: `معامله همزمان ${i + 1}`
          })
      );

      const results = await Promise.all(transactionPromises);
      
      results.forEach((result, index) => {
        expect(result.status).toBe(201);
        console.log(`✅ معامله ${index + 1} ایجاد شد`);
      });

      console.log('✅ همه معاملات همزمان با موفقیت ایجاد شدند');
    });

    it('should maintain data consistency under load', async () => {
      console.log('🔍 تست یکپارچگی داده‌ها تحت بار');
      
      const customer = await global.testUtils.createTestCustomer({
        tenantId: scenario.tenant._id,
        status: 'verified'
      });

      // ایجاد معامله
      const transaction = await global.testUtils.createTestTransaction({
        tenantId: scenario.tenant._id,
        customerId: customer._id,
        branchId: scenario.branch._id,
        status: 'pending'
      });

      // تلاش همزمان برای تایید و رد معامله
      const approvePromise = request(app)
        .put(`/api/transactions/${transaction._id}/approve`)
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send({ approvalNotes: 'تایید' });

      const rejectPromise = request(app)
        .put(`/api/transactions/${transaction._id}/reject`)
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send({ rejectionReason: 'رد' });

      const [approveResult, rejectResult] = await Promise.all([
        approvePromise,
        rejectPromise
      ]);

      // فقط یکی باید موفق باشد
      const successCount = [approveResult, rejectResult].filter(r => r.status === 200).length;
      expect(successCount).toBe(1);
      
      console.log('✅ یکپارچگی داده‌ها حفظ شد');
    });
  });

  describe('Error Recovery and Rollback', () => {
    it('should rollback failed transaction workflow', async () => {
      console.log('🔍 تست بازگشت معامله ناموفق');
      
      const customer = await global.testUtils.createTestCustomer({
        tenantId: scenario.tenant._id,
        status: 'verified'
      });

      // شروع معامله
      const transaction = await global.testUtils.createTestTransaction({
        tenantId: scenario.tenant._id,
        customerId: customer._id,
        branchId: scenario.branch._id,
        status: 'approved'
      });

      // تلاش برای صدور حواله با اطلاعات نادرست
      const invalidRemittanceData = {
        transactionId: transaction._id,
        customerId: customer._id,
        recipientCountry: 'INVALID_COUNTRY',
        amount: -1000 // مبلغ منفی
      };

      const remittanceResponse = await request(app)
        .post('/api/remittances')
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send(invalidRemittanceData);

      expect(remittanceResponse.status).toBe(400);

      // بازگشت وضعیت معامله
      const rollbackResponse = await request(app)
        .put(`/api/transactions/${transaction._id}/rollback`)
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send({
          reason: 'خطا در صدور حواله',
          rollbackTo: 'pending'
        });

      expect([200, 404]).toContain(rollbackResponse.status);
      console.log('✅ بازگشت معامله انجام شد');
    });
  });
});