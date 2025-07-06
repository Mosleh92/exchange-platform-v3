const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:3000/api';
const TEST_DATA = {
  superAdmin: {
    email: 'superadmin@test.com',
    password: 'superadmin123'
  },
  tenantAdmin: {
    email: 'tenantadmin@test.com',
    password: 'tenant123'
  },
  customer: {
    email: 'customer@test.com',
    password: 'customer123'
  }
};

class SystemTester {
  constructor() {
    this.results = [];
    this.tokens = {};
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    console.log(logMessage);
    this.results.push({ timestamp, type, message });
  }

  async testEndpoint(method, endpoint, data = null, token = null) {
    try {
      const config = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || error.message, 
        status: error.response?.status 
      };
    }
  }

  async testAuthentication() {
    await this.log('=== Testing Authentication ===');

    // Test Super Admin Login
    const superAdminLogin = await this.testEndpoint('POST', '/auth/login', {
      email: TEST_DATA.superAdmin.email,
      password: TEST_DATA.superAdmin.password,
      tenantId: 'super'
    });

    if (superAdminLogin.success) {
      this.tokens.superAdmin = superAdminLogin.data.token;
      await this.log('✅ Super Admin login successful');
    } else {
      await this.log('❌ Super Admin login failed', 'error');
    }

    // Test Tenant Admin Login
    const tenantAdminLogin = await this.testEndpoint('POST', '/auth/login', {
      email: TEST_DATA.tenantAdmin.email,
      password: TEST_DATA.tenantAdmin.password,
      tenantId: 'test-tenant'
    });

    if (tenantAdminLogin.success) {
      this.tokens.tenantAdmin = tenantAdminLogin.data.token;
      await this.log('✅ Tenant Admin login successful');
    } else {
      await this.log('❌ Tenant Admin login failed', 'error');
    }

    // Test Customer Login
    const customerLogin = await this.testEndpoint('POST', '/auth/login', {
      email: TEST_DATA.customer.email,
      password: TEST_DATA.customer.password,
      tenantId: 'test-tenant'
    });

    if (customerLogin.success) {
      this.tokens.customer = customerLogin.data.token;
      await this.log('✅ Customer login successful');
    } else {
      await this.log('❌ Customer login failed', 'error');
    }
  }

  async testTenantManagement() {
    await this.log('=== Testing Tenant Management ===');

    if (!this.tokens.superAdmin) {
      await this.log('❌ Super Admin token not available', 'error');
      return;
    }

    // Test Create Tenant
    const createTenant = await this.testEndpoint('POST', '/super-admin/tenants', {
      name: 'Test Exchange',
      code: 'TEST-EXCHANGE',
      subscriptionPlan: 'premium',
      maxBranches: 5,
      maxUsers: 50,
      adminEmail: 'admin@testexchange.com',
      adminPassword: 'admin123',
      adminName: 'Test Admin'
    }, this.tokens.superAdmin);

    if (createTenant.success) {
      await this.log('✅ Tenant creation successful');
    } else {
      await this.log('❌ Tenant creation failed', 'error');
    }

    // Test Get Tenants
    const getTenants = await this.testEndpoint('GET', '/super-admin/tenants', null, this.tokens.superAdmin);
    if (getTenants.success) {
      await this.log(`✅ Retrieved ${getTenants.data.data.length} tenants`);
    } else {
      await this.log('❌ Get tenants failed', 'error');
    }
  }

  async testTransactionManagement() {
    await this.log('=== Testing Transaction Management ===');

    if (!this.tokens.tenantAdmin) {
      await this.log('❌ Tenant Admin token not available', 'error');
      return;
    }

    // Test Create Transaction
    const createTransaction = await this.testEndpoint('POST', '/transactions', {
      type: 'currency_buy',
      fromCurrency: 'IRR',
      toCurrency: 'USD',
      amount: 1000000,
      exchangeRate: 500000,
      convertedAmount: 2,
      commission: 50000,
      totalAmount: 1050000,
      paymentMethod: 'bank_transfer',
      deliveryMethod: 'account_credit',
      customerId: 'test-customer-id',
      customer_name: 'Test Customer'
    }, this.tokens.tenantAdmin);

    if (createTransaction.success) {
      await this.log('✅ Transaction creation successful');
      const transactionId = createTransaction.data.data._id;

      // Test Get Transaction
      const getTransaction = await this.testEndpoint('GET', `/transactions/${transactionId}`, null, this.tokens.tenantAdmin);
      if (getTransaction.success) {
        await this.log('✅ Transaction retrieval successful');
      } else {
        await this.log('❌ Transaction retrieval failed', 'error');
      }

      // Test Update Transaction Status
      const updateStatus = await this.testEndpoint('PUT', `/transactions/${transactionId}/status`, {
        status: 'completed',
        reason: 'Payment verified'
      }, this.tokens.tenantAdmin);

      if (updateStatus.success) {
        await this.log('✅ Transaction status update successful');
      } else {
        await this.log('❌ Transaction status update failed', 'error');
      }
    } else {
      await this.log('❌ Transaction creation failed', 'error');
    }
  }

  async testPaymentManagement() {
    await this.log('=== Testing Payment Management ===');

    if (!this.tokens.tenantAdmin) {
      await this.log('❌ Tenant Admin token not available', 'error');
      return;
    }

    // Test Create Payment
    const createPayment = await this.testEndpoint('POST', '/payments', {
      transactionId: 'test-transaction-id',
      customerId: 'test-customer-id',
      amount: 500000,
      currency: 'IRR',
      paymentMethod: 'bank_transfer',
      sender: {
        name: 'Test Sender',
        phone: '09123456789',
        nationalId: '1234567890'
      },
      bankAccount: {
        bankName: 'Test Bank',
        accountNumber: '1234567890',
        accountHolder: 'Test Account Holder'
      },
      referenceNumber: 'REF123456'
    }, this.tokens.tenantAdmin);

    if (createPayment.success) {
      await this.log('✅ Payment creation successful');
      const paymentId = createPayment.data.data._id;

      // Test Get Payment
      const getPayment = await this.testEndpoint('GET', `/payments/${paymentId}`, null, this.tokens.tenantAdmin);
      if (getPayment.success) {
        await this.log('✅ Payment retrieval successful');
      } else {
        await this.log('❌ Payment retrieval failed', 'error');
      }

      // Test Verify Payment
      const verifyPayment = await this.testEndpoint('POST', `/payments/${paymentId}/verify`, {
        notes: 'Payment verified successfully'
      }, this.tokens.tenantAdmin);

      if (verifyPayment.success) {
        await this.log('✅ Payment verification successful');
      } else {
        await this.log('❌ Payment verification failed', 'error');
      }
    } else {
      await this.log('❌ Payment creation failed', 'error');
    }
  }

  async testDebtManagement() {
    await this.log('=== Testing Debt Management ===');

    if (!this.tokens.tenantAdmin) {
      await this.log('❌ Tenant Admin token not available', 'error');
      return;
    }

    // Test Create Debt
    const createDebt = await this.testEndpoint('POST', '/debts', {
      customerId: 'test-customer-id',
      transactionId: 'test-transaction-id',
      originalAmount: 1000000,
      currency: 'IRR',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      interestRate: 2.5,
      penaltyRate: 5
    }, this.tokens.tenantAdmin);

    if (createDebt.success) {
      await this.log('✅ Debt creation successful');
      const debtId = createDebt.data.data._id;

      // Test Get Debt
      const getDebt = await this.testEndpoint('GET', `/debts/${debtId}`, null, this.tokens.tenantAdmin);
      if (getDebt.success) {
        await this.log('✅ Debt retrieval successful');
      } else {
        await this.log('❌ Debt retrieval failed', 'error');
      }

      // Test Add Payment to Debt
      const addPayment = await this.testEndpoint('POST', `/debts/${debtId}/payment`, {
        amount: 500000,
        paymentMethod: 'bank_transfer',
        referenceNumber: 'DEBT-REF-123'
      }, this.tokens.tenantAdmin);

      if (addPayment.success) {
        await this.log('✅ Debt payment addition successful');
      } else {
        await this.log('❌ Debt payment addition failed', 'error');
      }
    } else {
      await this.log('❌ Debt creation failed', 'error');
    }
  }

  async testFileUpload() {
    await this.log('=== Testing File Upload ===');

    if (!this.tokens.tenantAdmin) {
      await this.log('❌ Tenant Admin token not available', 'error');
      return;
    }

    // Create a test file
    const testFilePath = path.join(__dirname, 'test-receipt.txt');
    fs.writeFileSync(testFilePath, 'Test receipt content');

    try {
      const FormData = require('form-data');
      const form = new FormData();
      form.append('receipt', fs.createReadStream(testFilePath));

      const response = await axios.post(`${BASE_URL}/upload`, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${this.tokens.tenantAdmin}`
        }
      });

      if (response.status === 200) {
        await this.log('✅ File upload successful');
      } else {
        await this.log('❌ File upload failed', 'error');
      }
    } catch (error) {
      await this.log('❌ File upload failed', 'error');
    } finally {
      // Clean up test file
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  }

  async testMultiLanguage() {
    await this.log('=== Testing Multi-Language Support ===');

    // Test Persian Language
    const persianResponse = await this.testEndpoint('GET', '/i18n/fa');
    if (persianResponse.success) {
      await this.log('✅ Persian translations loaded successfully');
    } else {
      await this.log('❌ Persian translations failed to load', 'error');
    }

    // Test English Language
    const englishResponse = await this.testEndpoint('GET', '/i18n/en');
    if (englishResponse.success) {
      await this.log('✅ English translations loaded successfully');
    } else {
      await this.log('❌ English translations failed to load', 'error');
    }
  }

  async testSecurity() {
    await this.log('=== Testing Security Features ===');

    // Test Unauthorized Access
    const unauthorizedAccess = await this.testEndpoint('GET', '/transactions');
    if (!unauthorizedAccess.success && unauthorizedAccess.status === 401) {
      await this.log('✅ Unauthorized access properly blocked');
    } else {
      await this.log('❌ Unauthorized access not properly blocked', 'error');
    }

    // Test Invalid Token
    const invalidToken = await this.testEndpoint('GET', '/transactions', null, 'invalid-token');
    if (!invalidToken.success && invalidToken.status === 401) {
      await this.log('✅ Invalid token properly rejected');
    } else {
      await this.log('❌ Invalid token not properly rejected', 'error');
    }
  }

  async generateReport() {
    await this.log('=== Generating Test Report ===');

    const report = {
      timestamp: new Date().toISOString(),
      totalTests: this.results.length,
      passed: this.results.filter(r => r.message.includes('✅')).length,
      failed: this.results.filter(r => r.message.includes('❌')).length,
      results: this.results
    };

    const reportPath = path.join(__dirname, 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    await this.log(`📊 Test Report Generated: ${reportPath}`);
    await this.log(`📈 Summary: ${report.passed} passed, ${report.failed} failed out of ${report.totalTests} total tests`);

    return report;
  }

  async runAllTests() {
    await this.log('🚀 Starting System Tests...');

    try {
      await this.testAuthentication();
      await this.testTenantManagement();
      await this.testTransactionManagement();
      await this.testPaymentManagement();
      await this.testDebtManagement();
      await this.testFileUpload();
      await this.testMultiLanguage();
      await this.testSecurity();

      const report = await this.generateReport();
      
      await this.log('🎉 All tests completed!');
      return report;
    } catch (error) {
      await this.log(`💥 Test execution failed: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new SystemTester();
  tester.runAllTests()
    .then(report => {
      console.log('\n🎯 Test Summary:');
      console.log(`✅ Passed: ${report.passed}`);
      console.log(`❌ Failed: ${report.failed}`);
      console.log(`📊 Success Rate: ${((report.passed / report.totalTests) * 100).toFixed(2)}%`);
      
      if (report.failed > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = SystemTester; 
const http = require('http');
const https = require('https');

console.log('🧪 تست سیستم پلتفرم صرافی...\n');

const tests = [
    {
        name: 'تست Backend API',
        url: 'http://localhost:3000/health',
        method: 'GET'
    },
    {
        name: 'تست API Info',
        url: 'http://localhost:3000/api',
        method: 'GET'
    },
    {
        name: 'تست Frontend',
        url: 'http://localhost:8080',
        method: 'GET'
    }
];

async function testEndpoint(test) {
    return new Promise((resolve) => {
        const url = new URL(test.url);
        const client = url.protocol === 'https:' ? https : http;
        
        const req = client.request(url, {
            method: test.method,
            timeout: 5000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`✅ ${test.name}: موفق (${res.statusCode})`);
                    resolve(true);
                } else {
                    console.log(`❌ ${test.name}: ناموفق (${res.statusCode})`);
                    resolve(false);
                }
            });
        });

        req.on('error', (err) => {
            console.log(`❌ ${test.name}: خطا - ${err.message}`);
            resolve(false);
        });

        req.on('timeout', () => {
            console.log(`⏰ ${test.name}: تایم‌اوت`);
            req.destroy();
            resolve(false);
        });

        req.end();
    });
}

async function runTests() {
    console.log('🔍 بررسی وضعیت سرویس‌ها...\n');
    
    let passed = 0;
    let total = tests.length;

    for (const test of tests) {
        const result = await testEndpoint(test);
        if (result) passed++;
        console.log(''); // خط خالی
    }

    console.log('📊 نتایج تست:');
    console.log(`✅ موفق: ${passed}/${total}`);
    console.log(`❌ ناموفق: ${total - passed}/${total}`);

    if (passed === total) {
        console.log('\n🎉 تمام تست‌ها موفق بودند! سیستم آماده است.');
    } else {
        console.log('\n⚠️ برخی تست‌ها ناموفق بودند. لطفاً بررسی کنید:');
        console.log('1. آیا سرورها در حال اجرا هستند؟');
        console.log('2. آیا پورت‌ها درست تنظیم شده‌اند؟');
        console.log('3. آیا فایل .env درست پیکربندی شده است？');
    }

    // بررسی پیش‌نیازها
    console.log('\n🔍 بررسی پیش‌نیازها:');
    
    // بررسی Node.js
    const nodeVersion = process.version;
    const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (nodeMajor >= 16) {
        console.log(`✅ Node.js ${nodeVersion} - مناسب`);
    } else {
        console.log(`❌ Node.js ${nodeVersion} - نیاز به نسخه 16 یا بالاتر`);
    }

    // بررسی npm
    const npmVersion = require('child_process').execSync('npm --version', { encoding: 'utf8' }).trim();
    console.log(`✅ npm ${npmVersion} - مناسب`);

    // بررسی فایل‌های مهم
    const fs = require('fs');
    const path = require('path');
    
    const importantFiles = [
        '../backend/.env',
        '../backend/src/server.js',
        '../frontend/public/index.html',
        '../package.json'
    ];

    console.log('\n📁 بررسی فایل‌های مهم:');
    importantFiles.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
            console.log(`✅ ${file} - موجود`);
        } else {
            console.log(`❌ ${file} - موجود نیست`);
        }
    });

    console.log('\n🎯 توصیه‌ها:');
    if (passed === total) {
        console.log('✅ سیستم آماده استفاده است!');
        console.log('🌐 دسترسی: http://localhost:8080');
        console.log('📚 مستندات: README.md');
    } else {
        console.log('🔧 لطفاً مشکلات را برطرف کنید و دوباره تست کنید');
        console.log('📖 راهنمای عیب‌یابی: QUICKSTART.md');
    }
}

// اجرای تست‌ها
runTests().catch(console.error); 