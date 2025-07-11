# Financial System Integration - Exchange Platform V3

## Overview

This implementation addresses critical financial data integrity issues by replacing MongoDB with PostgreSQL for financial operations and implementing a comprehensive double-entry bookkeeping system with ACID compliance.

## Problem Statement Addressed

### Issues Resolved:
- ❌ **MongoDB ACID Compliance**: Risk of data inconsistency
- ❌ **No Double-Entry Bookkeeping**: Lack of financial accuracy assurance  
- ❌ **Inadequate Audit Trail**: Missing proper change tracking and auditing
- ❌ **Race Conditions**: Potential bugs from concurrent operations
- ❌ **Data Loss Risks**: Power outages, currency conversion errors, balance calculation bugs

### Solutions Implemented:
- ✅ **PostgreSQL for Financial Operations**: ACID-compliant relational database
- ✅ **Double-Entry Bookkeeping**: Proper accounting standards implementation
- ✅ **Comprehensive Audit Trail**: Complete financial transaction history
- ✅ **Race Condition Prevention**: Optimistic locking and proper transaction isolation
- ✅ **Edge Case Testing**: Power failure scenarios and concurrent operations

## Architecture

### Database Design

```
┌─────────────────────┐    ┌─────────────────────┐
│     MongoDB         │    │    PostgreSQL       │
│  (Non-Financial)    │    │   (Financial)       │
├─────────────────────┤    ├─────────────────────┤
│ • User Management   │    │ • Accounts          │
│ • Tenant Config     │    │ • Transactions      │
│ • P2P Orders        │    │ • Ledger Entries    │
│ • Documents         │    │ • Audit Logs        │
│ • Notifications     │    │ • Account Balances  │
└─────────────────────┘    └─────────────────────┘
```

### Financial Models

#### 1. Account Model
```sql
CREATE TABLE accounts (
    id UUID PRIMARY KEY,
    account_number VARCHAR(50) UNIQUE NOT NULL,
    account_type ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'),
    account_name VARCHAR(255) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    balance DECIMAL(20, 8) DEFAULT 0,
    available_balance DECIMAL(20, 8) DEFAULT 0,
    blocked_balance DECIMAL(20, 8) DEFAULT 0,
    tenant_id UUID NOT NULL,
    customer_id UUID,
    version INTEGER DEFAULT 1, -- For optimistic locking
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. Financial Transaction Model
```sql
CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY,
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    tenant_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    transaction_type ENUM('CURRENCY_BUY', 'CURRENCY_SELL', 'DEPOSIT', 'WITHDRAWAL', ...),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    source_amount DECIMAL(20, 8) NOT NULL,
    destination_amount DECIMAL(20, 8) NOT NULL,
    exchange_rate DECIMAL(20, 8) NOT NULL,
    fee_amount DECIMAL(20, 8) DEFAULT 0,
    status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'),
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);
```

#### 3. Ledger Entry Model (Double-Entry)
```sql
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY,
    entry_number VARCHAR(50) UNIQUE NOT NULL,
    tenant_id UUID NOT NULL,
    transaction_id UUID REFERENCES financial_transactions(id),
    account_id UUID REFERENCES accounts(id),
    entry_type ENUM('DEBIT', 'CREDIT') NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    description TEXT,
    posting_date TIMESTAMP DEFAULT NOW(),
    is_posted BOOLEAN DEFAULT FALSE,
    is_reversed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. Financial Audit Model
```sql
CREATE TABLE financial_audits (
    id UUID PRIMARY KEY,
    audit_number VARCHAR(50) UNIQUE NOT NULL,
    tenant_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action ENUM('TRANSACTION_CREATED', 'TRANSACTION_UPDATED', ...),
    resource_type ENUM('FINANCIAL_TRANSACTION', 'ACCOUNT', 'LEDGER_ENTRY', ...),
    resource_id UUID,
    transaction_id UUID,
    description TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
    risk_score INTEGER, -- 0-100
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Double-Entry Bookkeeping Implementation

### Example: Currency Exchange Transaction

**Customer buys 850 EUR with 1000 USD (rate: 0.85, fee: 10 USD)**

```javascript
// Ledger Entries Created:
[
  // Customer gives USD
  { account: "Customer USD Account", type: "CREDIT", amount: 1000 },
  { account: "Exchange USD Pool", type: "DEBIT", amount: 1000 },
  
  // Customer receives EUR  
  { account: "Customer EUR Account", type: "DEBIT", amount: 850 },
  { account: "Exchange EUR Pool", type: "CREDIT", amount: 850 },
  
  // Fee collection
  { account: "Customer USD Account", type: "CREDIT", amount: 10 },
  { account: "Fee Revenue USD", type: "DEBIT", amount: 10 }
]

// Validation: Total Debits = Total Credits
// Debits: 1000 + 850 + 10 = 1860
// Credits: 1000 + 850 + 10 = 1860 ✓
```

## API Endpoints

### Financial Transaction Endpoints

```javascript
// Currency Exchange
POST /api/financial/exchange
{
  "fromCurrency": "USD",
  "toCurrency": "EUR", 
  "sourceAmount": 1000,
  "destinationAmount": 850,
  "exchangeRate": 0.85,
  "feeAmount": 10,
  "description": "Currency exchange transaction"
}

// Deposit
POST /api/financial/deposit
{
  "currency": "USD",
  "amount": 1000,
  "description": "Customer deposit"
}

// Withdrawal  
POST /api/financial/withdrawal
{
  "currency": "USD",
  "amount": 500,
  "description": "Customer withdrawal"
}

// Get Transaction
GET /api/financial/transaction/:transactionId

// Cancel Transaction
POST /api/financial/transaction/:transactionId/cancel
{
  "reason": "Customer request"
}

// Get Account Balance
GET /api/financial/account/:currency/balance

// Financial Reports
GET /api/financial/report/trial_balance
GET /api/financial/report/transaction_summary
GET /api/financial/report/account_reconciliation

// System Health
GET /api/financial/health
```

## Race Condition Prevention

### Optimistic Locking Implementation

```javascript
// Account update with version checking
async updateBalance(amount, transaction) {
    const currentVersion = this.version;
    
    const [updatedRows] = await this.constructor.update({
        balance: this.balance + amount,
        availableBalance: this.availableBalance + amount,
        version: currentVersion + 1
    }, {
        where: {
            id: this.id,
            version: currentVersion  // Critical: Check version
        },
        transaction
    });

    if (updatedRows === 0) {
        throw new Error('تراکنش ناموفق: داده‌ها تغییر کرده‌اند');
    }
}
```

### Retry Mechanism

```javascript
async executeWithRetry(operation, maxRetries = 3, initialDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (this.isRetryableError(error) && attempt < maxRetries) {
                const delay = initialDelay * Math.pow(2, attempt - 1);
                await this.delay(delay);
                continue;
            }
            throw error;
        }
    }
}
```

## Security Features

### Transaction Isolation
- **Isolation Level**: `REPEATABLE READ`
- **Row-Level Locking**: `SELECT ... FOR UPDATE`
- **Deadlock Detection**: Automatic retry with exponential backoff

### Audit Trail
- **Complete History**: Every financial operation logged
- **Risk Scoring**: 0-100 based on transaction characteristics
- **Retention Policy**: 7-10 years based on compliance requirements
- **Real-time Alerts**: High-risk activities trigger immediate notifications

### Data Validation
```javascript
// Input validation
const validateExchangeData = (data) => {
    if (!data.tenantId) throw new Error('Tenant ID required');
    if (!data.customerId) throw new Error('Customer ID required');
    if (data.sourceAmount <= 0) throw new Error('Amount must be positive');
    if (data.exchangeRate <= 0) throw new Error('Exchange rate must be positive');
    if (data.fromCurrency === data.toCurrency) throw new Error('Currencies must be different');
};
```

## Installation & Setup

### 1. Install Dependencies
```bash
npm install pg pg-hstore sequelize
```

### 2. Configure Environment
```bash
cp .env.financial.example .env
```

Edit `.env`:
```env
# Financial Database Configuration
FINANCIAL_DB_HOST=localhost
FINANCIAL_DB_PORT=5432
FINANCIAL_DB_NAME=exchange_financial
FINANCIAL_DB_USER=postgres
FINANCIAL_DB_PASSWORD=your_password

# Connection Pool
FINANCIAL_DB_MAX_CONNECTIONS=20
FINANCIAL_DB_MIN_CONNECTIONS=5
```

### 3. Set Up PostgreSQL
```sql
-- Create database
CREATE DATABASE exchange_financial;

-- Create user (if needed)
CREATE USER exchange_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE exchange_financial TO exchange_user;
```

### 4. Start the Server
```bash
# Development
npm run dev:financial

# Production
npm run start:financial
```

### 5. Verify Installation
```bash
curl http://localhost:5000/api/financial/health
```

## Testing

### Run Validation Tests
```bash
# Simple structure validation
node test-financial-system-simple.js

# Full integration tests (requires PostgreSQL)
npm run test:financial
```

### Manual Testing
```bash
# Test currency exchange
curl -X POST http://localhost:5000/api/financial/exchange \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "fromCurrency": "USD",
    "toCurrency": "EUR",
    "sourceAmount": 1000,
    "destinationAmount": 850,
    "exchangeRate": 0.85,
    "description": "Test exchange"
  }'
```

## Migration Strategy

### Phase 1: Parallel Operation
1. Keep existing MongoDB system running
2. Start new PostgreSQL financial system
3. Dual-write to both systems for comparison

### Phase 2: Financial Operations Migration
1. Migrate new financial transactions to PostgreSQL
2. Keep MongoDB for non-financial data
3. Gradually move historical data

### Phase 3: Full Migration (Optional)
1. Move all financial data to PostgreSQL
2. Retire MongoDB financial collections
3. Keep MongoDB for non-financial operations

## Performance Optimizations

### Database Indexes
```sql
-- High-performance indexes
CREATE INDEX CONCURRENTLY idx_transactions_tenant_status_date 
ON financial_transactions (tenant_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY idx_ledger_entries_account_date 
ON ledger_entries (account_id, posting_date DESC);

CREATE INDEX CONCURRENTLY idx_accounts_tenant_customer_currency 
ON accounts (tenant_id, customer_id, currency);
```

### Connection Pooling
- **Max Connections**: 20
- **Min Connections**: 5
- **Idle Timeout**: 30 seconds
- **Query Timeout**: 30 seconds

## Compliance & Auditing

### Audit Requirements
- **Retention**: 7-10 years based on severity
- **Immutability**: Audit logs cannot be modified
- **Compliance**: SOX, PCI-DSS ready
- **Real-time Monitoring**: Security alerts for high-risk activities

### Reporting
- **Trial Balance**: Verify double-entry accuracy
- **Transaction Summary**: Volume and value analysis  
- **Account Reconciliation**: Balance verification
- **Audit Reports**: Compliance and security monitoring

## Troubleshooting

### Common Issues

1. **Connection Errors**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Test connection
   psql -h localhost -U exchange_user -d exchange_financial
   ```

2. **Migration Errors**
   ```bash
   # Reset database schema
   npm run db:reset
   
   # Recreate tables
   npm run db:migrate
   ```

3. **Performance Issues**
   ```sql
   -- Check slow queries
   SELECT query, mean_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC;
   ```

### Monitoring

```javascript
// Health check endpoint returns:
{
  "status": "healthy",
  "databases": {
    "financial": {
      "status": "connected",
      "connection": "active"
    },
    "mongodb": {
      "status": "connected"  
    }
  },
  "features": {
    "doubleEntryBookkeeping": "enabled",
    "auditTrail": "enabled", 
    "raceConditionPrevention": "enabled",
    "transactionIntegrity": "ACID-compliant"
  }
}
```

## Contributors

This financial system implementation addresses all the critical issues mentioned in the problem statement and provides a robust, ACID-compliant foundation for financial operations in the Exchange Platform V3.

For support or questions, please refer to the documentation or contact the development team.