const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const TEST_EMAIL = 'security.test@example.com';

class SecurityTestSuite {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  async test(name, testFn) {
    try {
      console.log(`\n🧪 Testing: ${name}`);
      const result = await testFn();
      if (result) {
        console.log(`✅ PASS: ${name}`);
        this.passed++;
      } else {
        console.log(`❌ FAIL: ${name}`);
        this.failed++;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${name} - ${error.message}`);
      this.failed++;
    }
  }

  async run() {
    console.log('🔐 Exchange Platform V3 - Security Test Suite');
    console.log('=' .repeat(50));

    // Test 1: Health Check
    await this.test('Health Check Endpoint', async () => {
      const response = await axios.get(`${BASE_URL}/health`);
      return response.status === 200 && response.data.status === 'OK';
    });

    // Test 2: XSS Sanitization
    await this.test('XSS Multi-Character Sanitization', async () => {
      const maliciousInput = {
        email: '<script>alert("xss")</script>test@example.com',
        password: 'javascript:alert(1)'
      };
      
      const response = await axios.post(`${BASE_URL}/api/auth/login`, maliciousInput);
      
      // Check if malicious scripts are removed
      const email = response.data.user.email;
      return !email.includes('<script>') && !email.includes('javascript:');
    });

    // Test 3: Rate Limiting
    await this.test('Auth Rate Limiting (5 requests max)', async () => {
      // Make 6 requests rapidly
      const promises = [];
      for (let i = 0; i < 6; i++) {
        promises.push(
          axios.post(`${BASE_URL}/api/auth/login`, {
            email: `test${i}@example.com`,
            password: 'password'
          }).catch(err => err.response)
        );
      }
      
      const responses = await Promise.all(promises);
      
      // Should have at least one rate-limited response (429)
      return responses.some(res => res && res.status === 429);
    });

    // Test 4: JWT Token Generation
    await this.test('JWT Token Generation & Structure', async () => {
      const response = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: TEST_EMAIL,
        password: 'password123'
      });
      
      const { accessToken, refreshToken } = response.data;
      
      // Check token structure (JWT has 3 parts separated by dots)
      return accessToken && refreshToken && 
             accessToken.split('.').length === 3 &&
             refreshToken.split('.').length === 3;
    });

    // Test 5: Token Refresh
    await this.test('JWT Token Refresh', async () => {
      // Get tokens
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: TEST_EMAIL,
        password: 'password123'
      });
      
      const { refreshToken } = loginResponse.data;
      
      // Refresh tokens
      const refreshResponse = await axios.post(`${BASE_URL}/api/auth/refresh`, {
        refreshToken
      });
      
      return refreshResponse.status === 200 && 
             refreshResponse.data.success === true &&
             refreshResponse.data.accessToken;
    });

    // Test 6: 2FA Setup
    await this.test('2FA Setup & QR Code Generation', async () => {
      const response = await axios.post(`${BASE_URL}/api/auth/2fa/setup`, {
        email: TEST_EMAIL
      });
      
      const { secret, qrCode, backupCodes } = response.data.data;
      
      return secret && qrCode.startsWith('data:image/png;base64,') && 
             Array.isArray(backupCodes) && backupCodes.length === 10;
    });

    // Test 7: Encryption/Decryption
    await this.test('AES Encryption & Decryption', async () => {
      const testData = 'Sensitive financial data: $50,000';
      
      const response = await axios.post(`${BASE_URL}/api/security/encrypt-test`, {
        data: testData,
        context: 'user_financial_data'
      });
      
      const { original, encrypted, decrypted, matches } = response.data.data;
      
      return original === testData && 
             encrypted !== original && 
             decrypted === original && 
             matches === true;
    });

    // Test 8: CORS Protection
    await this.test('CORS Configuration', async () => {
      try {
        // This should work from allowed origin
        const response = await axios.get(`${BASE_URL}/api/test`, {
          headers: {
            'Origin': 'http://localhost:3000'
          }
        });
        return response.status === 200;
      } catch (error) {
        return false;
      }
    });

    // Test 9: Security Headers
    await this.test('Security Headers (Helmet)', async () => {
      const response = await axios.get(`${BASE_URL}/health`);
      const headers = response.headers;
      
      return headers['x-frame-options'] || 
             headers['x-content-type-options'] || 
             headers['x-xss-protection'];
    });

    // Test 10: Input Validation
    await this.test('Input Validation & Sanitization', async () => {
      const invalidData = {
        email: '',
        password: ''
      };
      
      const response = await axios.post(`${BASE_URL}/api/auth/login`, invalidData)
        .catch(err => err.response);
      
      return response.status === 400 && 
             response.data.success === false;
    });

    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(50));
    console.log(`✅ Tests Passed: ${this.passed}`);
    console.log(`❌ Tests Failed: ${this.failed}`);
    console.log(`📈 Success Rate: ${Math.round((this.passed / (this.passed + this.failed)) * 100)}%`);
    
    if (this.failed === 0) {
      console.log('\n🎉 ALL SECURITY TESTS PASSED!');
      console.log('🔐 Exchange Platform V3 security implementation is working correctly.');
    } else {
      console.log(`\n⚠️  ${this.failed} test(s) failed. Please review the implementation.`);
    }
    
    return this.failed === 0;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const testSuite = new SecurityTestSuite();
  testSuite.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  });
}

module.exports = SecurityTestSuite;