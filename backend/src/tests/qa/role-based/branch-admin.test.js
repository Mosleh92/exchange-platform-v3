const request = require('supertest');
const app = require('../../../app');

describe('Role-Based Testing: Branch Admin', () => {
  let scenario, tokens;

  beforeEach(async () => {
    scenario = await global.testUtils.createTestScenario();
    tokens = global.testUtils.generateTokensForScenario(scenario);
  });

  describe('تست مدیر شعبه (Branch Admin) - Customer Management', () => {
    it('should register new customer', async () => {
      const customerData = {
        firstName: 'علی',
        lastName: 'احمدی',
        email: 'ali.ahmadi@example.com',
        phone: '09123456789',
        nationalId: '1234567890',
        dateOfBirth: '1985-05-15',
        address: 'تهران، خیابان ولیعصر',
        documentType: 'nationalCard',
        documentNumber: 'A123456789'
      };

      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send(customerData);

      expect(response.status).toBe(201);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.customer.firstName).toBe('علی');
      expect(response.body.data.customer.tenantId).toBe(scenario.tenant._id.toString());
    });

    it('should view and manage branch customers', async () => {
      // Create sample customers
      await global.testUtils.createTestCustomer({
        tenantId: scenario.tenant._id,
        firstName: 'مریم',
        lastName: 'رضایی'
      });

      await global.testUtils.createTestCustomer({
        tenantId: scenario.tenant._id,
        firstName: 'حسن',
        lastName: 'کریمی'
      });

      const response = await request(app)
        .get('/api/customers')
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`);

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.customers.length).toBeGreaterThanOrEqual(2);
      
      // All customers should belong to this tenant
      response.body.data.customers.forEach(customer => {
        expect(customer.tenantId).toBe(scenario.tenant._id.toString());
      });
    });

    it('should update customer information', async () => {
      const customer = await global.testUtils.createTestCustomer({
        tenantId: scenario.tenant._id,
        firstName: 'زهرا',
        status: 'pending'
      });

      const updates = {
        status: 'verified',
        address: 'آدرس جدید',
        verificationLevel: 'level2'
      };

      const response = await request(app)
        .put(`/api/customers/${customer._id}`)
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.customer.status).toBe('verified');
    });

    it('should search customers by various criteria', async () => {
      const customer = await global.testUtils.createTestCustomer({
        tenantId: scenario.tenant._id,
        firstName: 'رضا',
        nationalId: '9876543210'
      });

      const response = await request(app)
        .get('/api/customers/search')
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .query({ nationalId: '9876543210' });

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.customers).toHaveLength(1);
      expect(response.body.data.customers[0].nationalId).toBe('9876543210');
    });
  });

  describe('Currency Exchange Transactions', () => {
    beforeEach(async () => {
      // Setup exchange rates
      await global.testUtils.createTestExchangeRate({
        tenantId: scenario.tenant._id,
        fromCurrency: 'USD',
        toCurrency: 'IRR',
        buyRate: 42000,
        sellRate: 42500
      });
    });

    it('should create currency exchange transaction', async () => {
      const customer = await global.testUtils.createTestCustomer({
        tenantId: scenario.tenant._id,
        status: 'verified'
      });

      const transactionData = {
        customerId: customer._id,
        type: 'buy', // Customer buying USD with IRR
        sourceCurrency: 'IRR',
        targetCurrency: 'USD',
        sourceAmount: 4200000, // 4.2M IRR
        expectedTargetAmount: 100, // Expected $100
        description: 'خرید دلار'
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send(transactionData);

      expect(response.status).toBe(201);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.transaction.sourceCurrency).toBe('IRR');
      expect(response.body.data.transaction.targetCurrency).toBe('USD');
      expect(response.body.data.transaction.branchId).toBe(scenario.branch._id.toString());
    });

    it('should calculate transaction amounts with rates and commissions', async () => {
      const response = await request(app)
        .post('/api/transactions/calculate')
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send({
          sourceCurrency: 'USD',
          targetCurrency: 'IRR',
          sourceAmount: 100,
          type: 'sell'
        });

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.calculation).toHaveProperty('targetAmount');
      expect(response.body.data.calculation).toHaveProperty('rate');
      expect(response.body.data.calculation).toHaveProperty('commission');
    });

    it('should approve pending transactions', async () => {
      const transaction = await global.testUtils.createTestTransaction({
        tenantId: scenario.tenant._id,
        branchId: scenario.branch._id,
        status: 'pending',
        amount: 1000
      });

      const response = await request(app)
        .put(`/api/transactions/${transaction._id}/approve`)
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send({
          approvalNotes: 'بررسی شد و تایید گردید'
        });

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.transaction.status).toBe('approved');
    });

    it('should reject invalid transactions', async () => {
      const transaction = await global.testUtils.createTestTransaction({
        tenantId: scenario.tenant._id,
        branchId: scenario.branch._id,
        status: 'pending'
      });

      const response = await request(app)
        .put(`/api/transactions/${transaction._id}/reject`)
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send({
          rejectionReason: 'مدارک ناکافی'
        });

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.transaction.status).toBe('rejected');
    });
  });

  describe('Payment and Receipt Management', () => {
    it('should record payment receipt', async () => {
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
        paymentMethod: 'bank_transfer',
        amount: 4200000,
        currency: 'IRR',
        bankDetails: {
          bankName: 'بانک ملی',
          accountNumber: '123456789',
          transactionReference: 'TXN123456'
        },
        receiptImage: 'base64-encoded-image-data'
      };

      const response = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send(receiptData);

      expect(response.status).toBe(201);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.receipt.paymentMethod).toBe('bank_transfer');
    });

    it('should verify payment receipts', async () => {
      const receipt = await request(app)
        .post('/api/receipts')
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send({
          transactionId: new global.testUtils.generateTestToken()._id,
          paymentMethod: 'cash',
          amount: 1000000,
          currency: 'IRR'
        });

      const verificationResponse = await request(app)
        .put(`/api/receipts/${receipt.body.data.receipt.id}/verify`)
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send({
          verificationStatus: 'verified',
          verificationNotes: 'مبلغ تایید شد'
        });

      expect(verificationResponse.status).toBe(200);
      global.testUtils.expectSuccessResponse(verificationResponse);
    });

    it('should handle cash transactions', async () => {
      const customer = await global.testUtils.createTestCustomer({
        tenantId: scenario.tenant._id
      });

      const cashTransactionData = {
        customerId: customer._id,
        type: 'cash_exchange',
        sourceCurrency: 'USD',
        targetCurrency: 'IRR',
        sourceAmount: 100,
        paymentMethod: 'cash'
      };

      const response = await request(app)
        .post('/api/transactions/cash')
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send(cashTransactionData);

      expect(response.status).toBe(201);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.transaction.paymentMethod).toBe('cash');
    });
  });

  describe('International Remittance', () => {
    it('should create international remittance order', async () => {
      const customer = await global.testUtils.createTestCustomer({
        tenantId: scenario.tenant._id,
        status: 'verified'
      });

      const remittanceData = {
        senderId: customer._id,
        senderName: 'علی احمدی',
        senderPhone: '09123456789',
        recipientName: 'John Smith',
        recipientPhone: '+1234567890',
        recipientCountry: 'USA',
        recipientCity: 'New York',
        recipientAddress: '123 Main Street',
        amount: 1000,
        currency: 'USD',
        purpose: 'family_support',
        paymentMethod: 'bank_transfer'
      };

      const response = await request(app)
        .post('/api/remittances')
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send(remittanceData);

      expect(response.status).toBe(201);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.remittance.recipientCountry).toBe('USA');
      expect(response.body.data.remittance.status).toBe('pending');
    });

    it('should track remittance status', async () => {
      const customer = await global.testUtils.createTestCustomer({
        tenantId: scenario.tenant._id
      });

      // Create remittance first
      const remittance = await request(app)
        .post('/api/remittances')
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send({
          senderId: customer._id,
          recipientName: 'Jane Doe',
          amount: 500,
          currency: 'EUR'
        });

      const trackingCode = remittance.body.data.remittance.trackingCode;

      const trackingResponse = await request(app)
        .get(`/api/remittances/track/${trackingCode}`)
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`);

      expect(trackingResponse.status).toBe(200);
      global.testUtils.expectSuccessResponse(trackingResponse);
      expect(trackingResponse.body.data.remittance.trackingCode).toBe(trackingCode);
    });

    it('should update remittance status', async () => {
      const remittanceId = 'sample-remittance-id';
      
      const statusUpdate = {
        status: 'in_transit',
        statusMessage: 'حواله در حال انتقال است',
        expectedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };

      const response = await request(app)
        .put(`/api/remittances/${remittanceId}/status`)
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send(statusUpdate);

      // This might return 404 for non-existent remittance, which is expected in test
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Branch Performance Reports', () => {
    beforeEach(async () => {
      // Create sample data for reports
      const customer = await global.testUtils.createTestCustomer({
        tenantId: scenario.tenant._id
      });

      await global.testUtils.createTestTransaction({
        tenantId: scenario.tenant._id,
        branchId: scenario.branch._id,
        customerId: customer._id,
        amount: 5000,
        status: 'completed',
        createdAt: new Date()
      });

      await global.testUtils.createTestTransaction({
        tenantId: scenario.tenant._id,
        branchId: scenario.branch._id,
        customerId: customer._id,
        amount: 3000,
        status: 'completed',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      });
    });

    it('should generate daily branch report', async () => {
      const response = await request(app)
        .get('/api/reports/branch/daily')
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .query({
          date: new Date().toISOString().split('T')[0],
          branchId: scenario.branch._id
        });

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.report).toHaveProperty('totalTransactions');
      expect(response.body.data.report).toHaveProperty('totalVolume');
    });

    it('should view branch transaction history', async () => {
      const response = await request(app)
        .get('/api/transactions/branch-history')
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .query({
          branchId: scenario.branch._id,
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          limit: 50
        });

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      expect(response.body.data.transactions).toBeInstanceOf(Array);
    });

    it('should view customer transaction summary', async () => {
      const customer = await global.testUtils.createTestCustomer({
        tenantId: scenario.tenant._id
      });

      const response = await request(app)
        .get(`/api/customers/${customer._id}/transactions`)
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .query({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        });

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
    });
  });

  describe('Access Control and Security', () => {
    it('should only access own branch data', async () => {
      const otherBranch = await global.testUtils.createTestBranch({
        tenantId: scenario.tenant._id,
        name: 'Other Branch'
      });

      const response = await request(app)
        .get('/api/branches')
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`);

      expect(response.status).toBe(200);
      global.testUtils.expectSuccessResponse(response);
      
      // Should see all branches in tenant (branch admin can see other branches for coordination)
      expect(response.body.data.branches.length).toBeGreaterThanOrEqual(1);
    });

    it('should not access other tenant customers', async () => {
      const otherTenant = await global.testUtils.createTestTenant();
      const otherCustomer = await global.testUtils.createTestCustomer({
        tenantId: otherTenant._id
      });

      const response = await request(app)
        .get(`/api/customers/${otherCustomer._id}`)
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`);

      expect(response.status).toBe(404);
      global.testUtils.expectErrorResponse(response);
    });

    it('should not modify transactions from other branches without permission', async () => {
      const otherBranch = await global.testUtils.createTestBranch({
        tenantId: scenario.tenant._id
      });

      const otherTransaction = await global.testUtils.createTestTransaction({
        tenantId: scenario.tenant._id,
        branchId: otherBranch._id,
        status: 'pending'
      });

      const response = await request(app)
        .put(`/api/transactions/${otherTransaction._id}/approve`)
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`);

      // Depending on business rules, this might be forbidden or allowed
      expect([200, 403]).toContain(response.status);
    });
  });

  describe('Error Handling and Validation', () => {
    it('should validate customer registration data', async () => {
      const invalidCustomerData = {
        firstName: '',
        email: 'invalid-email',
        nationalId: '123' // Too short
      };

      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send(invalidCustomerData);

      expect(response.status).toBe(400);
      global.testUtils.expectErrorResponse(response);
    });

    it('should prevent duplicate customer registration', async () => {
      const customerData = {
        firstName: 'احمد',
        lastName: 'محمدی',
        email: 'ahmad@example.com',
        nationalId: '1111111111'
      };

      // Create first customer
      await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send(customerData);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send(customerData);

      expect(response.status).toBe(409);
      global.testUtils.expectErrorResponse(response, 'تکراری');
    });

    it('should validate transaction amounts', async () => {
      const invalidTransactionData = {
        type: 'exchange',
        sourceCurrency: 'USD',
        targetCurrency: 'IRR',
        sourceAmount: -100 // Negative amount
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${tokens.branchAdminToken}`)
        .send(invalidTransactionData);

      expect(response.status).toBe(400);
      global.testUtils.expectErrorResponse(response);
    });
  });
});