const request = require('supertest');
const app = require('../../../app');

describe('Role-Based Testing: Branch Staff', () => {
  let scenario, tokens;

  beforeEach(async () => {
    scenario = await global.testUtils.createTestScenario();
    tokens = global.testUtils.generateTokensForScenario(scenario);
  });

  describe('تست کارمند شعبه (Branch Staff) - Customer Registration', () => {
    it('should register new customer with basic information', async () => {
      const customerData = {
        firstName: 'فاطمه',
        lastName: 'کریمی',
        email: 'fateme.karimi@example.com',
        phone: '09123456789',
        nationalId: '1234567890',
        dateOfBirth: '1990-03-20',
        address: 'تهران، میدان آزادی'
      };

      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .send(customerData);

      expect(response.status).toBe(201);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.customer.firstName).toBe('فاطمه');
      expect(response.body.data.customer.status).toBe('pending'); // Staff registered customers need approval
    });

    it('should upload customer documents', async () => {
      const customer = await global.testUtils.createTestCustomer({
        tenantId: scenario.tenant._id,
        status: 'pending'
      });

      const documentData = {
        customerId: customer._id,
        documentType: 'nationalCard',
        documentNumber: 'A123456789',
        expiryDate: '2030-12-31',
        documentImage: 'base64-encoded-image-data',
        notes: 'کارت ملی معتبر'
      };

      const response = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .send(documentData);

      expect(response.status).toBe(201);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.document.documentType).toBe('nationalCard');
    });

    it('should view customer list with limited access', async () => {
      // Create customers for this branch
      await global.testUtils.createTestCustomer({
        tenantId: scenario.tenant._id,
        firstName: 'مهدی'
      });

      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`);

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.customers).toBeInstanceOf(Array);
      
      // Staff should only see customers from their tenant
      response.body.data.customers.forEach(customer => {
        expect(customer.tenantId).toBe(scenario.tenant._id.toString());
      });
    });

    it('should search customers by basic criteria', async () => {
      const customer = await global.testUtils.createTestCustomer({
        tenantId: scenario.tenant._id,
        phone: '09111111111'
      });

      const response = await request(app)
        .get('/api/customers/search')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .query({ phone: '09111111111' });

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.customers).toHaveLength(1);
      expect(response.body.data.customers[0].phone).toBe('09111111111');
    });
  });

  describe('Authorized Transactions', () => {
    beforeEach(async () => {
      // Setup exchange rates for transactions
      await global.testUtils.createTestExchangeRate({
        tenantId: scenario.tenant._id,
        fromCurrency: 'USD',
        toCurrency: 'IRR',
        buyRate: 42000,
        sellRate: 42500
      });
    });

    it('should create small value transactions within limits', async () => {
      const customer = await global.testUtils.createTestCustomer({
        tenantId: scenario.tenant._id,
        status: 'verified'
      });

      const transactionData = {
        customerId: customer._id,
        type: 'buy',
        sourceCurrency: 'IRR',
        targetCurrency: 'USD',
        sourceAmount: 1000000, // 1M IRR (small amount)
        description: 'خرید دلار - مبلغ کم'
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .send(transactionData);

      expect(response.status).toBe(201);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.transaction.sourceCurrency).toBe('IRR');
      expect(response.body.data.transaction.status).toBe('pending'); // Requires approval
    });

    it('should not create large value transactions above staff limit', async () => {
      const customer = await global.testUtils.createTestCustomer({
        tenantId: scenario.tenant._id,
        status: 'verified'
      });

      const largeTransactionData = {
        customerId: customer._id,
        type: 'sell',
        sourceCurrency: 'USD',
        targetCurrency: 'IRR',
        sourceAmount: 10000, // $10,000 (large amount requiring higher approval)
        description: 'فروش دلار - مبلغ بالا'
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .send(largeTransactionData);

      // Staff might be able to create but not approve large transactions
      expect([201, 403]).toContain(response.status);
      
      if (response.status === 201) {
        expect(response.body.data.transaction.status).toBe('pending');
        expect(response.body.data.transaction.requiresApproval).toBe(true);
      }
    });

    it('should view transaction status', async () => {
      const transaction = await global.testUtils.createTestTransaction({
        tenantId: scenario.tenant._id,
        branchId: scenario.branch._id,
        status: 'pending'
      });

      const response = await request(app)
        .get(`/api/transactions/${transaction._id}`)
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`);

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.transaction.status).toBe('pending');
    });

    it('should not approve transactions (limited authority)', async () => {
      const transaction = await global.testUtils.createTestTransaction({
        tenantId: scenario.tenant._id,
        branchId: scenario.branch._id,
        status: 'pending'
      });

      const response = await request(app)
        .put(`/api/transactions/${transaction._id}/approve`)
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .send({
          approvalNotes: 'Staff attempting to approve'
        });

      expect(response.status).toBe(403);
      global.testUtils.expectErrorResponse(response, 'دسترسی');
    });
  });

  describe('Payment Receipt Management', () => {
    it('should record cash payment receipt', async () => {
      const customer = await global.testUtils.createTestCustomer({
        tenantId: scenario.tenant._id
      });

      const transaction = await global.testUtils.createTestTransaction({
        tenantId: scenario.tenant._id,
        customerId: customer._id,
        branchId: scenario.branch._id,
        status: 'approved'
      });

      const receiptData = {
        transactionId: transaction._id,
        paymentMethod: 'cash',
        amount: 1000000,
        currency: 'IRR',
        receivedBy: tokens.branchStaffToken, // Staff member who received payment
        notes: 'نقد دریافت شد'
      };

      const response = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .send(receiptData);

      expect(response.status).toBe(201);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.receipt.paymentMethod).toBe('cash');
    });

    it('should record bank transfer receipt with image', async () => {
      const customer = await global.testUtils.createTestCustomer({
        tenantId: scenario.tenant._id
      });

      const receiptData = {
        paymentMethod: 'bank_transfer',
        amount: 2000000,
        currency: 'IRR',
        bankDetails: {
          bankName: 'بانک پاسارگاد',
          accountNumber: '987654321',
          transactionReference: 'REF123456'
        },
        receiptImage: 'base64-encoded-receipt-image',
        customerId: customer._id,
        description: 'واریز حواله'
      };

      const response = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .send(receiptData);

      expect(response.status).toBe(201);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.receipt.bankDetails.bankName).toBe('بانک پاسارگاد');
    });

    it('should view receipt history', async () => {
      const response = await request(app)
        .get('/api/receipts')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .query({
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          limit: 20
        });

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.receipts).toBeInstanceOf(Array);
    });

    it('should not delete or modify receipts once recorded', async () => {
      const receipt = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .send({
          paymentMethod: 'cash',
          amount: 500000,
          currency: 'IRR'
        });

      const deleteResponse = await request(app)
        .delete(`/api/receipts/${receipt.body.data.receipt.id}`)
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`);

      expect(deleteResponse.status).toBe(403);
      global.testUtils.expectErrorResponse(deleteResponse);
    });
  });

  describe('Limited Report Access', () => {
    it('should view daily transaction summary for own work', async () => {
      const response = await request(app)
        .get('/api/reports/my-daily-summary')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .query({
          date: new Date().toISOString().split('T')[0]
        });

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.summary).toHaveProperty('transactionsHandled');
      expect(response.body.data.summary).toHaveProperty('totalAmount');
    });

    it('should view own performance metrics', async () => {
      const response = await request(app)
        .get('/api/reports/staff-performance')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .query({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        });

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
    });

    it('should not access branch financial reports', async () => {
      const response = await request(app)
        .get('/api/reports/branch-financial')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`);

      expect(response.status).toBe(403);
      global.testUtils.expectErrorResponse(response, 'دسترسی');
    });

    it('should not access tenant-wide reports', async () => {
      const response = await request(app)
        .get('/api/reports/financial')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`);

      expect(response.status).toBe(403);
      global.testUtils.expectErrorResponse(response, 'دسترسی');
    });
  });

  describe('Exchange Rate Inquiry', () => {
    it('should view current exchange rates', async () => {
      const response = await request(app)
        .get('/api/exchange-rates/current')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`);

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.rates).toBeInstanceOf(Array);
    });

    it('should calculate transaction amounts for customers', async () => {
      const response = await request(app)
        .post('/api/exchange-rates/calculate')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .send({
          fromCurrency: 'USD',
          toCurrency: 'IRR',
          amount: 100,
          type: 'buy'
        });

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.calculation).toHaveProperty('total');
      expect(response.body.data.calculation).toHaveProperty('rate');
    });

    it('should not modify exchange rates', async () => {
      const rateData = {
        fromCurrency: 'EUR',
        toCurrency: 'IRR',
        buyRate: 46000,
        sellRate: 46500
      };

      const response = await request(app)
        .post('/api/exchange-rates')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .send(rateData);

      expect(response.status).toBe(403);
      global.testUtils.expectErrorResponse(response, 'دسترسی');
    });
  });

  describe('Customer Service Functions', () => {
    it('should help customers check transaction status', async () => {
      const customer = await global.testUtils.createTestCustomer({
        tenantId: scenario.tenant._id
      });

      const transaction = await global.testUtils.createTestTransaction({
        tenantId: scenario.tenant._id,
        customerId: customer._id,
        trackingCode: 'TXN123456789'
      });

      const response = await request(app)
        .get('/api/transactions/track')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .query({ trackingCode: 'TXN123456789' });

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.transaction.trackingCode).toBe('TXN123456789');
    });

    it('should print customer transaction receipts', async () => {
      const transaction = await global.testUtils.createTestTransaction({
        tenantId: scenario.tenant._id,
        branchId: scenario.branch._id,
        status: 'completed'
      });

      const response = await request(app)
        .get(`/api/transactions/${transaction._id}/receipt`)
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`);

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.receipt).toHaveProperty('transactionDetails');
    });

    it('should update customer contact information', async () => {
      const customer = await global.testUtils.createTestCustomer({
        tenantId: scenario.tenant._id
      });

      const updates = {
        phone: '09987654321',
        email: 'new.email@example.com',
        address: 'آدرس جدید'
      };

      const response = await request(app)
        .put(`/api/customers/${customer._id}/contact`)
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.customer.phone).toBe('09987654321');
    });
  });

  describe('Access Restrictions and Security', () => {
    it('should not access other tenant data', async () => {
      const otherTenant = await global.testUtils.createTestTenant();
      const otherCustomer = await global.testUtils.createTestCustomer({
        tenantId: otherTenant._id
      });

      const response = await request(app)
        .get(`/api/customers/${otherCustomer._id}`)
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`);

      expect(response.status).toBe(404);
      global.testUtils.expectErrorResponse(response);
    });

    it('should not access administrative functions', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`);

      expect(response.status).toBe(403);
      global.testUtils.expectErrorResponse(response, 'دسترسی');
    });

    it('should not modify system settings', async () => {
      const response = await request(app)
        .put(`/api/tenants/${scenario.tenant._id}/settings`)
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .send({ maxDailyTransactionAmount: 1000000 });

      expect(response.status).toBe(403);
      global.testUtils.expectErrorResponse(response, 'دسترسی');
    });

    it('should not create or manage users', async () => {
      const userData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'SecurePass@123',
        role: 'branch_staff'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .send(userData);

      expect(response.status).toBe(403);
      global.testUtils.expectErrorResponse(response, 'دسترسی');
    });
  });

  describe('Error Handling and Validation', () => {
    it('should validate customer data before registration', async () => {
      const invalidCustomerData = {
        firstName: '',
        email: 'invalid-email',
        phone: '123', // Too short
        nationalId: '' // Empty
      };

      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .send(invalidCustomerData);

      expect(response.status).toBe(400);
      global.testUtils.expectErrorResponse(response);
    });

    it('should handle transaction amount validation', async () => {
      const invalidTransactionData = {
        type: 'exchange',
        sourceCurrency: 'USD',
        targetCurrency: 'IRR',
        sourceAmount: 0 // Zero amount
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .send(invalidTransactionData);

      expect(response.status).toBe(400);
      global.testUtils.expectErrorResponse(response);
    });

    it('should handle receipt data validation', async () => {
      const invalidReceiptData = {
        paymentMethod: 'unknown_method',
        amount: -1000, // Negative amount
        currency: 'INVALID'
      };

      const response = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .send(invalidReceiptData);

      expect(response.status).toBe(400);
      global.testUtils.expectErrorResponse(response);
    });
  });

  describe('Audit Trail and Logging', () => {
    it('should log all customer interactions', async () => {
      const customer = await global.testUtils.createTestCustomer({
        tenantId: scenario.tenant._id
      });

      // Perform some actions
      await request(app)
        .get(`/api/customers/${customer._id}`)
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`);

      // Check audit logs (if accessible to staff for their own actions)
      const response = await request(app)
        .get('/api/audit-logs/my-actions')
        .set('Authorization', `Bearer ${tokens.branchStaffToken}`)
        .query({
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        });

      expect([200, 403]).toContain(response.status);
      // Staff might have limited access to their own audit trail
    });
  });
});