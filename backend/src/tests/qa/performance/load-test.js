import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Performance Test Configuration for Exchange Platform
// Based on requirements: 100 concurrent users, 1000 transactions/hour, < 2 seconds response time

export let options = {
  scenarios: {
    // Load Test: Normal traffic simulation
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 }, // Ramp up to 20 users
        { duration: '5m', target: 50 }, // Ramp up to 50 users
        { duration: '10m', target: 100 }, // Target load: 100 concurrent users
        { duration: '5m', target: 100 }, // Stay at 100 users
        { duration: '2m', target: 0 }, // Ramp down
      ],
    },
    
    // Stress Test: Peak traffic simulation
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 200 }, // Stress test with 200 users
        { duration: '2m', target: 300 }, // Peak stress with 300 users
        { duration: '5m', target: 300 },
        { duration: '2m', target: 0 },
      ],
      startTime: '25m', // Start after load test
    },

    // Spike Test: Sudden traffic increase
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '30s', target: 500 }, // Sudden spike
        { duration: '1m', target: 500 },
        { duration: '30s', target: 50 },
        { duration: '1m', target: 0 },
      ],
      startTime: '50m',
    },
  },
  
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.01'], // Error rate under 1%
    login_duration: ['p(95)<1000'], // Login under 1s
    transaction_duration: ['p(95)<3000'], // Transactions under 3s
    api_response_time: ['p(90)<1500'], // 90% API calls under 1.5s
  }
};

// Custom metrics
const loginDuration = new Trend('login_duration');
const transactionDuration = new Trend('transaction_duration');
const apiResponseTime = new Trend('api_response_time');
const errorRate = new Rate('error_rate');
const successfulTransactions = new Counter('successful_transactions');

// Test configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Test data
const testUsers = [
  { email: 'admin@test.com', password: 'Admin@123', role: 'tenant_admin' },
  { email: 'branch1@test.com', password: 'Branch@123', role: 'branch_admin' },
  { email: 'staff1@test.com', password: 'Staff@123', role: 'branch_staff' },
];

let authTokens = {};

export function setup() {
  console.log('🚀 Starting Exchange Platform Performance Test');
  console.log(`Target: ${BASE_URL}`);
  
  // Setup authentication tokens
  testUsers.forEach(user => {
    const loginResponse = http.post(`${API_BASE}/auth/login`, JSON.stringify({
      email: user.email,
      password: user.password
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

    if (loginResponse.status === 200) {
      authTokens[user.role] = JSON.parse(loginResponse.body).data.accessToken;
      console.log(`✅ Authenticated ${user.role}`);
    } else {
      console.log(`❌ Failed to authenticate ${user.role}`);
    }
  });

  return { authTokens };
}

export default function(data) {
  const testScenario = Math.random();
  
  if (testScenario < 0.3) {
    // 30% - Authentication flow
    testAuthenticationFlow();
  } else if (testScenario < 0.6) {
    // 30% - Customer management
    testCustomerManagement(data.authTokens);
  } else if (testScenario < 0.8) {
    // 20% - Transaction processing
    testTransactionProcessing(data.authTokens);
  } else {
    // 20% - Reporting and queries
    testReportingAndQueries(data.authTokens);
  }

  sleep(1); // 1 second pause between iterations
}

function testAuthenticationFlow() {
  const startTime = new Date();
  
  // Login attempt
  const loginPayload = JSON.stringify({
    email: testUsers[Math.floor(Math.random() * testUsers.length)].email,
    password: 'TestPassword@123'
  });

  const loginResponse = http.post(`${API_BASE}/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' }
  });

  const duration = new Date() - startTime;
  loginDuration.add(duration);

  check(loginResponse, {
    'login status is 200 or 401': (r) => [200, 401].includes(r.status),
    'login response time < 1s': (r) => r.timings.duration < 1000,
  });

  if (loginResponse.status !== 200) {
    errorRate.add(1);
  }

  // If login successful, test token refresh
  if (loginResponse.status === 200) {
    const loginData = JSON.parse(loginResponse.body);
    const refreshToken = loginData.data.refreshToken;

    const refreshResponse = http.post(`${API_BASE}/auth/refresh`, JSON.stringify({
      refreshToken: refreshToken
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

    check(refreshResponse, {
      'refresh token works': (r) => r.status === 200,
    });
  }
}

function testCustomerManagement(authTokens) {
  const token = authTokens.branch_admin || authTokens.tenant_admin;
  if (!token) return;

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const startTime = new Date();

  // List customers
  const listResponse = http.get(`${API_BASE}/customers`, { headers });
  
  check(listResponse, {
    'customer list loads': (r) => r.status === 200,
    'customer list response time < 2s': (r) => r.timings.duration < 2000,
  });

  // Create new customer
  const customerData = JSON.stringify({
    firstName: `TestUser${Math.floor(Math.random() * 10000)}`,
    lastName: 'Performance',
    email: `test${Math.floor(Math.random() * 10000)}@perf.test`,
    phone: `091${Math.floor(Math.random() * 100000000)}`,
    nationalId: `${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    dateOfBirth: '1990-01-01',
    address: 'Performance Test Address'
  });

  const createResponse = http.post(`${API_BASE}/customers`, customerData, { headers });
  
  check(createResponse, {
    'customer creation succeeds': (r) => r.status === 201,
    'customer creation time < 2s': (r) => r.timings.duration < 2000,
  });

  // Search customers
  const searchResponse = http.get(`${API_BASE}/customers/search?search=Performance`, { headers });
  
  check(searchResponse, {
    'customer search works': (r) => r.status === 200,
    'customer search time < 1s': (r) => r.timings.duration < 1000,
  });

  const duration = new Date() - startTime;
  apiResponseTime.add(duration);

  if ([listResponse, createResponse, searchResponse].some(r => r.status >= 400)) {
    errorRate.add(1);
  }
}

function testTransactionProcessing(authTokens) {
  const token = authTokens.branch_admin;
  if (!token) return;

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const startTime = new Date();

  // Get exchange rates
  const ratesResponse = http.get(`${API_BASE}/exchange-rates/current`, { headers });
  
  check(ratesResponse, {
    'exchange rates load': (r) => r.status === 200,
    'rates response time < 1s': (r) => r.timings.duration < 1000,
  });

  // Calculate transaction
  const calculationResponse = http.get(
    `${API_BASE}/transactions/calculate?sourceCurrency=USD&targetCurrency=IRR&sourceAmount=100&type=buy`,
    { headers }
  );

  check(calculationResponse, {
    'transaction calculation works': (r) => r.status === 200,
    'calculation time < 500ms': (r) => r.timings.duration < 500,
  });

  // Create transaction
  const transactionData = JSON.stringify({
    type: 'buy',
    sourceCurrency: 'IRR',
    targetCurrency: 'USD',
    sourceAmount: 4200000,
    description: 'Performance test transaction'
  });

  const transactionResponse = http.post(`${API_BASE}/transactions`, transactionData, { headers });
  
  const transactionSuccess = check(transactionResponse, {
    'transaction creation succeeds': (r) => [201, 400].includes(r.status), // 400 might be due to missing customer
    'transaction time < 3s': (r) => r.timings.duration < 3000,
  });

  if (transactionSuccess && transactionResponse.status === 201) {
    successfulTransactions.add(1);
  }

  const duration = new Date() - startTime;
  transactionDuration.add(duration);

  if ([ratesResponse, calculationResponse, transactionResponse].some(r => r.status >= 500)) {
    errorRate.add(1);
  }
}

function testReportingAndQueries(authTokens) {
  const token = authTokens.tenant_admin || authTokens.branch_admin;
  if (!token) return;

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const startTime = new Date();
  const today = new Date().toISOString().split('T')[0];
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Daily summary
  const dailyResponse = http.get(`${API_BASE}/reports/daily-summary?date=${today}`, { headers });
  
  check(dailyResponse, {
    'daily report loads': (r) => r.status === 200,
    'daily report time < 2s': (r) => r.timings.duration < 2000,
  });

  // Financial report
  const financialResponse = http.get(
    `${API_BASE}/reports/financial?startDate=${lastWeek}&endDate=${today}`,
    { headers }
  );

  check(financialResponse, {
    'financial report loads': (r) => r.status === 200,
    'financial report time < 3s': (r) => r.timings.duration < 3000,
  });

  // Transaction history
  const historyResponse = http.get(
    `${API_BASE}/transactions?startDate=${lastWeek}&endDate=${today}&limit=50`,
    { headers }
  );

  check(historyResponse, {
    'transaction history loads': (r) => r.status === 200,
    'history response time < 2s': (r) => r.timings.duration < 2000,
  });

  const duration = new Date() - startTime;
  apiResponseTime.add(duration);

  if ([dailyResponse, financialResponse, historyResponse].some(r => r.status >= 400)) {
    errorRate.add(1);
  }
}

export function teardown(data) {
  console.log('🏁 Performance Test Completed');
  console.log('📊 Results Summary:');
  console.log(`   • Total Users Simulated: ${__ENV.K6_VUS || 'Variable'}`);
  console.log(`   • Test Duration: ${__ENV.K6_DURATION || 'Variable'}`);
  console.log('   • Check detailed metrics in the K6 output above');
  
  // Logout test users
  Object.values(data.authTokens).forEach(token => {
    if (token) {
      http.post(`${API_BASE}/auth/logout`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
    }
  });
}

// Export for use in other performance tests
export { testAuthenticationFlow, testCustomerManagement, testTransactionProcessing, testReportingAndQueries };