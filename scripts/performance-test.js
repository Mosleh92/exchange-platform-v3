// K6 Performance Test Script
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const transactionDuration = new Trend('transaction_duration');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 50 }, // Ramp up to 50 users
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '2m', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.1'],   // Error rate must be below 10%
    errors: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

// Test data
const testUsers = [
  { email: 'admin1@tenant1.com', password: 'Admin@123456', role: 'tenant_admin' },
  { email: 'admin2@tenant2.com', password: 'Admin@123456', role: 'tenant_admin' },
  { email: 'customer1@tenant1.com', password: 'Customer@123456', role: 'customer' },
  { email: 'customer2@tenant2.com', password: 'Customer@123456', role: 'customer' },
];

function getRandomUser() {
  return testUsers[Math.floor(Math.random() * testUsers.length)];
}

function login(user) {
  const loginStart = new Date();
  
  const loginResponse = http.post(`${BASE_URL}/api/auth/login`, {
    email: user.email,
    password: user.password,
  }, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  const loginEnd = new Date();
  loginDuration.add(loginEnd - loginStart);
  
  const loginSuccess = check(loginResponse, {
    'login successful': (r) => r.status === 200,
    'login response has token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.accessToken;
      } catch (e) {
        return false;
      }
    },
  });
  
  if (!loginSuccess) {
    errorRate.add(1);
    return null;
  }
  
  try {
    const loginData = JSON.parse(loginResponse.body);
    return {
      token: loginData.data.accessToken,
      user: loginData.data.user,
    };
  } catch (e) {
    errorRate.add(1);
    return null;
  }
}

function makeAuthenticatedRequest(method, path, token, payload = null) {
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  
  let response;
  if (method === 'GET') {
    response = http.get(`${BASE_URL}${path}`, params);
  } else if (method === 'POST') {
    response = http.post(`${BASE_URL}${path}`, payload ? JSON.stringify(payload) : null, params);
  } else if (method === 'PUT') {
    response = http.put(`${BASE_URL}${path}`, payload ? JSON.stringify(payload) : null, params);
  } else if (method === 'DELETE') {
    response = http.del(`${BASE_URL}${path}`, null, params);
  }
  
  return response;
}

export default function () {
  const user = getRandomUser();
  
  group('Authentication Flow', () => {
    // Health check
    group('Health Check', () => {
      const healthResponse = http.get(`${BASE_URL}/health`);
      check(healthResponse, {
        'health check successful': (r) => r.status === 200,
        'health check response time < 100ms': (r) => r.timings.duration < 100,
      });
    });
    
    // Login
    const authData = login(user);
    if (!authData) {
      return; // Skip rest of test if login fails
    }
    
    sleep(1);
    
    // Dashboard data
    group('Dashboard Operations', () => {
      const dashboardResponse = makeAuthenticatedRequest('GET', '/api/dashboard/stats', authData.token);
      check(dashboardResponse, {
        'dashboard stats successful': (r) => r.status === 200,
        'dashboard response time < 300ms': (r) => r.timings.duration < 300,
      });
      
      sleep(0.5);
      
      const recentTransactionsResponse = makeAuthenticatedRequest('GET', '/api/dashboard/recent-transactions', authData.token);
      check(recentTransactionsResponse, {
        'recent transactions successful': (r) => r.status === 200,
        'recent transactions response time < 300ms': (r) => r.timings.duration < 300,
      });
    });
    
    sleep(1);
  });
  
  group('Transaction Operations', () => {
    const user = getRandomUser();
    const authData = login(user);
    if (!authData) return;
    
    // List transactions
    const transactionStart = new Date();
    const transactionsResponse = makeAuthenticatedRequest('GET', '/api/transactions', authData.token);
    const transactionEnd = new Date();
    
    transactionDuration.add(transactionEnd - transactionStart);
    
    check(transactionsResponse, {
      'transactions list successful': (r) => r.status === 200,
      'transactions response time < 500ms': (r) => r.timings.duration < 500,
      'transactions response has data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && Array.isArray(body.data.transactions);
        } catch (e) {
          return false;
        }
      },
    });
    
    sleep(1);
    
    // Create transaction (only for admins)
    if (authData.user.role === 'tenant_admin') {
      const newTransaction = {
        type: 'exchange',
        amount: Math.floor(Math.random() * 1000) + 100,
        sourceCurrency: 'USD',
        targetCurrency: 'EUR',
        description: `Performance test transaction ${new Date().getTime()}`,
      };
      
      const createResponse = makeAuthenticatedRequest('POST', '/api/transactions', authData.token, newTransaction);
      check(createResponse, {
        'transaction creation successful': (r) => r.status === 201,
        'transaction creation response time < 800ms': (r) => r.timings.duration < 800,
      });
      
      if (createResponse.status !== 201) {
        errorRate.add(1);
      }
    }
    
    sleep(1);
  });
  
  group('User Management', () => {
    const user = getRandomUser();
    const authData = login(user);
    if (!authData) return;
    
    // Get user profile
    const profileResponse = makeAuthenticatedRequest('GET', '/api/users/profile', authData.token);
    check(profileResponse, {
      'user profile successful': (r) => r.status === 200,
      'user profile response time < 200ms': (r) => r.timings.duration < 200,
    });
    
    sleep(0.5);
    
    // List users (only for admins)
    if (authData.user.role === 'tenant_admin') {
      const usersResponse = makeAuthenticatedRequest('GET', '/api/users', authData.token);
      check(usersResponse, {
        'users list successful': (r) => r.status === 200,
        'users list response time < 400ms': (r) => r.timings.duration < 400,
      });
    }
    
    sleep(1);
  });
  
  group('Tenant Isolation Tests', () => {
    const user1 = testUsers[0]; // Tenant 1 user
    const user2 = testUsers[1]; // Tenant 2 user
    
    const auth1 = login(user1);
    const auth2 = login(user2);
    
    if (!auth1 || !auth2) return;
    
    // Try to access other tenant's data
    const crossTenantResponse = makeAuthenticatedRequest('GET', '/api/transactions', auth2.token);
    
    check(crossTenantResponse, {
      'tenant isolation maintained': (r) => {
        if (r.status !== 200) return true; // Error is expected
        try {
          const body = JSON.parse(r.body);
          // Should not contain any transactions from other tenant
          return body.data.transactions.every(t => t.tenantId !== auth1.user.tenantId);
        } catch (e) {
          return true;
        }
      },
    });
    
    sleep(1);
  });
  
  group('Payment Processing', () => {
    const user = getRandomUser();
    const authData = login(user);
    if (!authData || authData.user.role !== 'tenant_admin') return;
    
    // Get payment methods
    const paymentMethodsResponse = makeAuthenticatedRequest('GET', '/api/payments/methods', authData.token);
    check(paymentMethodsResponse, {
      'payment methods successful': (r) => r.status === 200,
      'payment methods response time < 300ms': (r) => r.timings.duration < 300,
    });
    
    sleep(0.5);
    
    // Get payment history
    const paymentHistoryResponse = makeAuthenticatedRequest('GET', '/api/payments', authData.token);
    check(paymentHistoryResponse, {
      'payment history successful': (r) => r.status === 200,
      'payment history response time < 400ms': (r) => r.timings.duration < 400,
    });
    
    sleep(1);
  });
  
  // Random sleep between 1-3 seconds
  sleep(Math.random() * 2 + 1);
}

export function handleSummary(data) {
  return {
    'performance-results.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
