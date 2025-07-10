# 🔌 API Documentation - Exchange Platform v3

## Overview
Complete API documentation for the Exchange Platform v3 with OpenAPI/Swagger specifications, authentication, and examples.

## 📋 Table of Contents
- [Authentication](#authentication)
- [Multi-tenancy](#multi-tenancy)
- [Transactions API](#transactions-api)
- [Users API](#users-api)
- [Reports API](#reports-api)
- [P2P API](#p2p-api)
- [Accounting API](#accounting-api)
- [Error Codes](#error-codes)

## 🔐 Authentication

### Login
```http
POST /api/auth/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
    "user": {
    "id": "user_id",
      "email": "user@example.com",
    "role": "customer",
    "tenantId": "tenant_id",
    "permissions": ["read", "write"]
  }
}
```

### Register
```http
POST /api/auth/register
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+989123456789",
  "tenantId": "tenant_id"
}
```

### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json
```

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

## 🏢 Multi-tenancy

All API requests must include tenant context:

```http
GET /api/transactions
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
```

## 💰 Transactions API

### Create Transaction
```http
POST /api/transactions
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "currency_buy",
  "fromCurrency": "IRR",
  "toCurrency": "USD",
  "amount": 1000000,
  "exchangeRate": 50000,
  "paymentMethod": "bank_transfer",
  "deliveryMethod": "account_credit",
  "bank_details": {
    "bank_name": "Test Bank",
    "account_number": "1234567890",
    "iban": "IR123456789012345678901234"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "transaction_id",
    "transactionId": "TXN-20241201-001",
    "type": "currency_buy",
      "status": "pending",
    "amount": 1000000,
    "exchangeRate": 50000,
    "totalAmount": 1000000,
    "createdAt": "2024-12-01T10:00:00.000Z"
  }
}
```

### Get Transactions
```http
GET /api/transactions?page=1&limit=20&status=completed
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `status` (string): Filter by status
- `type` (string): Filter by transaction type
- `startDate` (string): Filter from date (ISO)
- `endDate` (string): Filter to date (ISO)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "transaction_id",
      "transactionId": "TXN-20241201-001",
      "type": "currency_buy",
      "status": "completed",
      "amount": 1000000,
      "exchangeRate": 50000,
      "totalAmount": 1000000,
      "createdAt": "2024-12-01T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### Update Transaction
```http
PATCH /api/transactions/{id}
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "completed",
  "notes": "Transaction completed successfully"
}
```

### Upload Receipt
```http
POST /api/transactions/{id}/receipts
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
Content-Type: multipart/form-data
```

**Form Data:**
- `receipt` (file): Receipt image/document
- `description` (string): Receipt description

## 👥 Users API

### Get User Profile
```http
GET /api/users/profile
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
```

### Update Profile
```http
PUT /api/users/profile
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
Content-Type: application/json
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+989123456789",
  "address": "123 Main St, Tehran"
}
```

### KYC Submission
```http
POST /api/users/kyc
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
Content-Type: multipart/form-data
```

**Form Data:**
- `idDocument` (file): ID document
- `proofOfAddress` (file): Address proof
- `nationalId` (string): National ID number
- `dateOfBirth` (string): Date of birth (YYYY-MM-DD)

## 📊 Reports API

### Financial Report
```http
GET /api/reports/financial?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balanceSheet": {
      "assets": 50000000,
      "liabilities": 30000000,
      "equity": 20000000
    },
    "incomeStatement": {
      "revenue": 10000000,
      "expenses": 8000000,
      "netIncome": 2000000
    },
    "cashFlow": {
      "operating": 15000000,
      "investing": -5000000,
      "financing": -2000000,
      "net": 8000000
    }
  }
}
```

### Transaction Report
```http
GET /api/reports/transactions?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
```

### Analytics Report
```http
GET /api/reports/analytics
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
```

## 🤝 P2P API

### Create Announcement
```http
POST /api/p2p/announcements
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
Content-Type: application/json
```

**Request Body:**
```json
{
  "type": "sell",
  "fromCurrency": "USD",
  "toCurrency": "IRR",
  "amount": 100,
  "price": 50000,
  "paymentMethod": "bank_transfer",
  "deliveryMethod": "account_credit",
  "description": "Selling USD for IRR"
}
```

### Get Announcements
```http
GET /api/p2p/announcements?type=sell&fromCurrency=USD&toCurrency=IRR
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
```

### Match Announcement
```http
POST /api/p2p/announcements/{id}/match
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
```

## 📈 Accounting API

### Create Journal Entry
```http
POST /api/accounting/journal-entries
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
Content-Type: application/json
```

**Request Body:**
```json
{
  "description": "Currency exchange transaction",
  "entryType": "currency_exchange",
  "entries": [
    {
      "accountCode": "1001",
      "accountName": "Cash",
      "debit": 1000000,
      "credit": 0,
      "currency": "IRR"
    },
    {
      "accountCode": "2001",
      "accountName": "Accounts Payable",
      "debit": 0,
      "credit": 1000000,
      "currency": "IRR"
    }
  ]
}
```

### Get Trial Balance
```http
GET /api/accounting/trial-balance
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
```

### Get Financial Reports
```http
GET /api/accounting/reports
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
```

## ❌ Error Codes

### Authentication Errors
- `TOKEN_MISSING` (401): Authentication token required
- `TOKEN_INVALID` (401): Invalid authentication token
- `TOKEN_EXPIRED` (401): Authentication token expired
- `ACCOUNT_DEACTIVATED` (401): Account is deactivated
- `ACCOUNT_LOCKED` (401): Account is locked

### Authorization Errors
- `INSUFFICIENT_PERMISSIONS` (403): User lacks required permissions
- `TENANT_INACTIVE` (403): Tenant is inactive
- `CROSS_TENANT_ACCESS` (403): Cross-tenant access denied

### Validation Errors
- `VALIDATION_ERROR` (400): Request data validation failed
- `INVALID_ID` (400): Invalid ID format
- `DUPLICATE_ENTRY` (409): Record already exists

### Business Logic Errors
- `INSUFFICIENT_BALANCE` (400): Insufficient account balance
- `INVALID_TRANSACTION` (400): Invalid transaction data
- `TRANSACTION_LIMIT_EXCEEDED` (400): Transaction limit exceeded

### System Errors
- `INTERNAL_ERROR` (500): Internal server error
- `DATABASE_ERROR` (500): Database operation failed
- `SERVICE_UNAVAILABLE` (503): Service temporarily unavailable

## 🔧 Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **General endpoints**: 100 requests per 15 minutes
- **Authentication endpoints**: 5 requests per 15 minutes
- **Report endpoints**: 50 requests per 15 minutes

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## 📝 Request/Response Examples

### Complete Transaction Flow

1. **Create Transaction**
```bash
curl -X POST https://api.exchange.com/api/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "currency_buy",
    "fromCurrency": "IRR",
    "toCurrency": "USD",
    "amount": 1000000,
    "exchangeRate": 50000,
    "paymentMethod": "bank_transfer",
    "deliveryMethod": "account_credit"
  }'
```

2. **Upload Receipt**
```bash
curl -X POST https://api.exchange.com/api/transactions/TRANSACTION_ID/receipts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID" \
  -F "receipt=@receipt.jpg" \
  -F "description=Payment receipt"
```

3. **Get Transaction Status**
```bash
curl -X GET https://api.exchange.com/api/transactions/TRANSACTION_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: YOUR_TENANT_ID"
```

## 🚀 SDK Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api.exchange.com',
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': tenantId
  }
});

// Create transaction
const transaction = await api.post('/api/transactions', {
  type: 'currency_buy',
  fromCurrency: 'IRR',
  toCurrency: 'USD',
  amount: 1000000,
  exchangeRate: 50000
});

// Get transactions
const transactions = await api.get('/api/transactions', {
  params: { page: 1, limit: 20 }
});
```

### Python
```python
import requests

headers = {
    'Authorization': f'Bearer {token}',
    'x-tenant-id': tenant_id
}

# Create transaction
response = requests.post(
    'https://api.exchange.com/api/transactions',
    headers=headers,
    json={
        'type': 'currency_buy',
        'fromCurrency': 'IRR',
        'toCurrency': 'USD',
        'amount': 1000000,
        'exchangeRate': 50000
    }
)
```

## 📊 Webhook Integration

### Webhook Configuration
```http
POST /api/webhooks
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
Content-Type: application/json
```

**Request Body:**
```json
{
  "url": "https://your-app.com/webhooks",
  "events": ["transaction.created", "transaction.completed"],
  "secret": "webhook_secret"
}
```

### Webhook Payload Example
```json
{
  "event": "transaction.completed",
  "timestamp": "2024-12-01T10:00:00.000Z",
  "data": {
    "transactionId": "TXN-20241201-001",
    "type": "currency_buy",
    "status": "completed",
    "amount": 1000000
  },
  "signature": "sha256_signature"
}
```

## 🔒 Security Best Practices

1. **Always use HTTPS** in production
2. **Store tokens securely** and never expose them
3. **Implement proper error handling** for all API calls
4. **Use webhooks** for real-time updates
5. **Validate all responses** before processing
6. **Implement retry logic** for failed requests
7. **Monitor rate limits** and handle 429 responses
8. **Log all API interactions** for debugging

## 📞 Support

For API support and questions:
- **Email**: api-support@exchange.com
- **Documentation**: https://docs.exchange.com
- **Status Page**: https://status.exchange.com
- **Developer Portal**: https://developers.exchange.com 