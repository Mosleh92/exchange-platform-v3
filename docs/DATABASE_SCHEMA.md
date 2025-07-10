# 🗄️ Database Schema Documentation

## Overview
Complete database schema documentation for Exchange Platform v3 with Entity-Relationship Diagrams (ERD), indexes, and data relationships.

## 📋 Table of Contents
- [Schema Overview](#schema-overview)
- [Core Entities](#core-entities)
- [Financial Entities](#financial-entities)
- [Multi-tenancy Structure](#multi-tenancy-structure)
- [Indexes & Performance](#indexes--performance)
- [Data Relationships](#data-relationships)
- [Migration Guide](#migration-guide)

## 🏗️ Schema Overview

### Database Architecture
```
Exchange Platform v3 Database Schema
├── Core Entities
│   ├── Tenants (Multi-tenancy)
│   ├── Users (Authentication)
│   └── Transactions (Business Logic)
├── Financial Entities
│   ├── Journal Entries (Double-entry)
│   ├── Accounts (Chart of Accounts)
│   ├── Checks (Payment System)
│   └── P2P Announcements (Trading)
└── Supporting Entities
    ├── Audit Logs (Security)
    ├── Notifications (Communication)
    └── Reports (Analytics)
```

## 🏢 Core Entities

### Tenants Collection
```javascript
{
  _id: ObjectId,
  name: String,                    // Tenant name
  level: String,                   // SUPER_ADMIN | EXCHANGE | BRANCH | USER
  parent: ObjectId,                // Reference to parent tenant
  isActive: Boolean,               // Tenant status
  settings: {
    currency: String,              // Default currency
    timezone: String,              // Timezone
    commission: Number,            // Default commission rate
    limits: {
      maxTransaction: Number,      // Maximum transaction amount
      dailyLimit: Number           // Daily transaction limit
    }
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ level: 1 }`
- `{ parent: 1 }`
- `{ isActive: 1 }`
- `{ name: "text" }`

### Users Collection
```javascript
{
  _id: ObjectId,
  tenantId: ObjectId,             // Reference to Tenant
  email: String,                  // User email
  password: String,               // Hashed password
  firstName: String,
  lastName: String,
  phone: String,
  role: String,                   // super_admin | admin | user | customer
  permissions: [String],          // Array of permissions
  isActive: Boolean,
  isLocked: Boolean,
  loginAttempts: Number,
  lastLoginAt: Date,
  lastPasswordChange: Date,
  kycStatus: String,              // pending | approved | rejected
  kycDocuments: [{
    type: String,                 // id_document | proof_of_address
    filePath: String,
    verified: Boolean,
    verifiedAt: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ tenantId: 1, email: 1 }` (unique)
- `{ tenantId: 1, role: 1 }`
- `{ tenantId: 1, isActive: 1 }`
- `{ email: "text" }`

### Transactions Collection
```javascript
{
  _id: ObjectId,
  tenantId: ObjectId,             // Reference to Tenant
  transactionId: String,          // Unique transaction ID
  customerId: ObjectId,           // Reference to User
  type: String,                   // currency_buy | currency_sell | transfer | remittance
  fromCurrency: String,
  toCurrency: String,
  amount: Number,
  exchangeRate: Number,
  commission: Number,
  totalAmount: Number,
  paidAmount: Number,
  remainingAmount: Number,
  paymentMethod: String,          // cash | bank_transfer | card | crypto | check
  deliveryMethod: String,         // physical | bank_transfer | account_credit | crypto_wallet
  status: String,                 // pending | partial_paid | completed | cancelled | failed
  holdStatus: String,             // hold | delivered
  bank_details: {
    bank_name: String,
    account_number: String,
    iban: String,
    swift_code: String,
    recipient_name: String
  },
  in_person_delivery_details: {
    recipient_full_name: String,
    recipient_id_number: String,
    delivery_agent_id: ObjectId,
    delivery_status: String,
    delivery_date: Date
  },
  payments: [{
    paymentId: ObjectId,
    amount: Number,
    currency: String,
    method: String,
    status: String,
    date: Date
  }],
  receipts: [{
    filePath: String,
    fileName: String,
    fileSize: Number,
    mimeType: String,
    uploadedAt: Date,
    description: String,
    verified: Boolean,
    verifiedBy: ObjectId,
    verifiedAt: Date
  }],
  status_history: [{
    status: String,
    holdStatus: String,
    changed_by: ObjectId,
    changed_at: Date,
    reason: String
  }],
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ tenantId: 1, createdAt: -1 }`
- `{ tenantId: 1, status: 1 }`
- `{ tenantId: 1, type: 1 }`
- `{ tenantId: 1, customerId: 1 }`
- `{ tenantId: 1, fromCurrency: 1, toCurrency: 1 }`
- `{ transactionId: 1 }` (unique)
- `{ customer_name: "text" }`

## 💰 Financial Entities

### Journal Entries Collection
```javascript
{
  _id: ObjectId,
  tenantId: ObjectId,             // Reference to Tenant
  entryNumber: String,            // Unique entry number
  transactionId: ObjectId,        // Reference to Transaction
  entryDate: Date,
  accountingPeriod: {
    year: Number,
    month: Number
  },
  description: String,
  entryType: String,              // currency_exchange | commission | fee | transfer | adjustment
  entries: [{
    accountId: ObjectId,          // Reference to Account
    accountCode: String,
    accountName: String,
    debit: Number,
    credit: Number,
    currency: String,
    exchangeRate: Number,
    description: String
  }],
  totalDebit: Number,
  totalCredit: Number,
  status: String,                 // draft | posted | reversed | cancelled
  createdBy: ObjectId,            // Reference to User
  postedBy: ObjectId,
  postedAt: Date,
  reversedBy: ObjectId,
  reversedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ tenantId: 1, entryDate: -1 }`
- `{ tenantId: 1, accountingPeriod: 1 }`
- `{ tenantId: 1, status: 1 }`
- `{ transactionId: 1 }`
- `{ entryNumber: 1 }` (unique)

### Accounts Collection
```javascript
{
  _id: ObjectId,
  tenantId: ObjectId,             // Reference to Tenant
  accountCode: String,            // Chart of accounts code
  accountName: String,
  accountType: String,            // asset | liability | equity | revenue | expense
  parentAccount: ObjectId,        // Reference to parent account
  balance: Number,                // Current balance
  totalDebits: Number,
  totalCredits: Number,
  currency: String,
  isActive: Boolean,
  description: String,
  lastUpdated: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ tenantId: 1, accountCode: 1 }` (unique)
- `{ tenantId: 1, accountType: 1 }`
- `{ tenantId: 1, isActive: 1 }`

### Checks Collection
```javascript
{
  _id: ObjectId,
  tenantId: ObjectId,             // Reference to Tenant
  checkNumber: String,            // Unique check number
  transactionId: ObjectId,        // Reference to Transaction
  bankName: String,
  accountNumber: String,
  checkAmount: Number,
  currency: String,
  issueDate: Date,
  dueDate: Date,
  status: String,                 // pending | approved | cleared | bounced | cancelled | expired
  verifiedBy: ObjectId,           // Reference to User
  verifiedAt: Date,
  verificationNotes: String,
  checkImages: [{
    filePath: String,
    fileName: String,
    fileSize: Number,
    mimeType: String,
    uploadedAt: Date,
    description: String
  }],
  bankProcessing: {
    processingDate: Date,
    clearingDate: Date,
    bankReference: String,
    processingNotes: String
  },
  riskLevel: String,              // low | medium | high
  riskFactors: [{
    factor: String,
    description: String,
    severity: String              // low | medium | high
  }],
  createdBy: ObjectId,            // Reference to User
  updatedBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ tenantId: 1, status: 1 }`
- `{ tenantId: 1, issueDate: -1 }`
- `{ tenantId: 1, dueDate: 1 }`
- `{ checkNumber: 1 }` (unique)
- `{ transactionId: 1 }`

### P2P Announcements Collection
```javascript
{
  _id: ObjectId,
  tenantId: ObjectId,             // Reference to Tenant
  userId: ObjectId,               // Reference to User (announcer)
  type: String,                   // buy | sell
  fromCurrency: String,
  toCurrency: String,
  amount: Number,
  price: Number,
  paymentMethod: String,
  deliveryMethod: String,
  description: String,
  status: String,                 // active | matched | cancelled | expired
  matchedWith: ObjectId,          // Reference to User (buyer)
  matchedAt: Date,
  expiresAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ tenantId: 1, status: 1 }`
- `{ tenantId: 1, type: 1 }`
- `{ tenantId: 1, fromCurrency: 1, toCurrency: 1 }`
- `{ userId: 1 }`
- `{ expiresAt: 1 }`

## 🔐 Security & Audit Entities

### Audit Logs Collection
```javascript
{
  _id: ObjectId,
  tenantId: ObjectId,             // Reference to Tenant
  userId: ObjectId,               // Reference to User
  action: String,                 // login | logout | create | update | delete
  resource: String,               // transaction | user | report
  resourceId: ObjectId,
  details: Object,                // Action-specific details
  ipAddress: String,
  userAgent: String,
  timestamp: Date
}
```

**Indexes:**
- `{ tenantId: 1, timestamp: -1 }`
- `{ userId: 1, timestamp: -1 }`
- `{ action: 1, timestamp: -1 }`
- `{ resource: 1, resourceId: 1 }`

### Security Events Collection
```javascript
{
  _id: ObjectId,
  tenantId: ObjectId,
  eventType: String,              // AUTH_FAILURE | RATE_LIMIT | PERMISSION_DENIED
  severity: String,               // low | medium | high | critical
  userId: ObjectId,
  ipAddress: String,
  userAgent: String,
  details: Object,
  timestamp: Date
}
```

**Indexes:**
- `{ tenantId: 1, timestamp: -1 }`
- `{ eventType: 1, severity: 1 }`
- `{ ipAddress: 1, timestamp: -1 }`

## 📊 Analytics & Reporting Entities

### Reports Collection
```javascript
{
  _id: ObjectId,
  tenantId: ObjectId,
  reportType: String,             // financial | transaction | analytics
  period: {
    startDate: Date,
    endDate: Date
  },
  data: Object,                   // Report-specific data
  generatedBy: ObjectId,          // Reference to User
  generatedAt: Date,
  expiresAt: Date
}
```

**Indexes:**
- `{ tenantId: 1, reportType: 1 }`
- `{ tenantId: 1, generatedAt: -1 }`
- `{ expiresAt: 1 }`

### Notifications Collection
```javascript
{
  _id: ObjectId,
  tenantId: ObjectId,
  userId: ObjectId,               // Reference to User
  type: String,                   // transaction | security | system
  title: String,
  message: String,
  data: Object,                   // Notification-specific data
  isRead: Boolean,
  readAt: Date,
  createdAt: Date
}
```

**Indexes:**
- `{ tenantId: 1, userId: 1 }`
- `{ userId: 1, isRead: 1 }`
- `{ createdAt: -1 }`

## 🔗 Data Relationships

### Entity Relationship Diagram (ERD)

```
Tenants (1) ──── (N) Users
    │
    ├── (N) Transactions
    │       │
    │       ├── (1) Journal Entries
    │       ├── (1) Checks
    │       └── (N) Audit Logs
    │
    ├── (N) P2P Announcements
    ├── (N) Accounts
    ├── (N) Reports
    └── (N) Notifications
```

### Relationship Details

1. **Tenant → Users (1:N)**
   - Each tenant can have multiple users
   - Users are isolated by tenant

2. **Tenant → Transactions (1:N)**
   - All transactions belong to a tenant
   - Complete tenant isolation

3. **Transaction → Journal Entries (1:1)**
   - Each transaction creates one journal entry
   - Double-entry accounting compliance

4. **Transaction → Checks (1:1)**
   - Optional relationship for check payments
   - Risk assessment and verification

5. **User → Transactions (1:N)**
   - Users can have multiple transactions
   - Customer and staff relationships

## 📈 Indexes & Performance

### Critical Indexes

1. **Multi-tenant Isolation**
   ```javascript
   { tenantId: 1, createdAt: -1 }
   { tenantId: 1, status: 1 }
   { tenantId: 1, type: 1 }
   ```

2. **Authentication & Authorization**
   ```javascript
   { tenantId: 1, email: 1 } // unique
   { tenantId: 1, role: 1 }
   { tenantId: 1, isActive: 1 }
   ```

3. **Financial Operations**
   ```javascript
   { tenantId: 1, accountingPeriod: 1 }
   { tenantId: 1, entryDate: -1 }
   { accountCode: 1, tenantId: 1 } // unique
   ```

4. **Search & Analytics**
   ```javascript
   { customer_name: "text" }
   { email: "text" }
   { transactionId: 1 } // unique
   ```

### Performance Optimizations

1. **Compound Indexes**
   ```javascript
   { tenantId: 1, type: 1, status: 1, createdAt: -1 }
   { tenantId: 1, customerId: 1, createdAt: -1 }
   { tenantId: 1, fromCurrency: 1, toCurrency: 1, createdAt: -1 }
   ```

2. **Partial Indexes**
   ```javascript
   { tenantId: 1, status: 1 } // Only active records
   { tenantId: 1, isActive: 1 } // Only active users
   ```

3. **TTL Indexes**
   ```javascript
   { expiresAt: 1 } // TTL for temporary data
   { createdAt: 1 } // TTL for audit logs (optional)
   ```

## 🔄 Migration Guide

### Version 2 to 3 Migration

1. **Add Multi-tenancy**
   ```javascript
   // Add tenantId to all collections
   db.transactions.updateMany({}, { $set: { tenantId: ObjectId("default_tenant") } })
   db.users.updateMany({}, { $set: { tenantId: ObjectId("default_tenant") } })
   ```

2. **Add Security Fields**
   ```javascript
   // Add security fields to users
   db.users.updateMany({}, { 
     $set: { 
       permissions: ["read", "write"],
       isLocked: false,
       loginAttempts: 0
     }
   })
   ```

3. **Add Financial Fields**
   ```javascript
   // Add accounting fields to transactions
   db.transactions.updateMany({}, {
     $set: {
       commission: 0,
       totalAmount: { $multiply: ["$amount", "$exchangeRate"] }
     }
   })
   ```

4. **Create Indexes**
   ```javascript
   // Create new indexes
   db.transactions.createIndex({ "tenantId": 1, "createdAt": -1 })
   db.users.createIndex({ "tenantId": 1, "email": 1 }, { unique: true })
   db.journal_entries.createIndex({ "tenantId": 1, "entryDate": -1 })
   ```

### Data Validation

```javascript
// Validate tenant isolation
db.transactions.find({ tenantId: { $exists: false } }).count()

// Validate required fields
db.transactions.find({ 
  $or: [
    { transactionId: { $exists: false } },
    { tenantId: { $exists: false } },
    { customerId: { $exists: false } }
  ]
}).count()

// Validate financial integrity
db.journal_entries.find({
  $expr: { $ne: ["$totalDebit", "$totalCredit"] }
}).count()
```

## 📊 Monitoring & Maintenance

### Database Health Checks

1. **Index Usage**
   ```javascript
   db.transactions.aggregate([
     { $indexStats: {} }
   ])
   ```

2. **Collection Sizes**
   ```javascript
   db.runCommand({ dbStats: 1 })
   db.runCommand({ collStats: "transactions" })
   ```

3. **Query Performance**
   ```javascript
   db.transactions.find({ tenantId: ObjectId("...") }).explain("executionStats")
   ```

### Maintenance Tasks

1. **Daily**
   - Check index usage
   - Monitor collection sizes
   - Verify tenant isolation

2. **Weekly**
   - Analyze slow queries
   - Update statistics
   - Clean up expired data

3. **Monthly**
   - Review and optimize indexes
   - Archive old audit logs
   - Update data retention policies

## 🔒 Security Considerations

1. **Data Encryption**
   - Sensitive fields encrypted at rest
   - TLS for data in transit
   - Key rotation policies

2. **Access Control**
   - Database user with minimal privileges
   - Network-level access restrictions
   - Audit logging for all operations

3. **Backup & Recovery**
   - Daily automated backups
   - Point-in-time recovery capability
   - Disaster recovery procedures

## 📞 Support

For database schema questions:
- **Email**: db-support@exchange.com
- **Documentation**: https://docs.exchange.com/database
- **Migration Support**: https://support.exchange.com/migration 