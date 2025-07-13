// MongoDB initialization script for local Fly.io testing
// This script sets up the database with proper users and collections

print('Initializing Exchange Platform database...');

// Switch to the exchange_platform database
db = db.getSiblingDB('exchange_platform');

// Create application user
db.createUser({
  user: 'exchange_app',
  pwd: 'exchange_app_password',
  roles: [
    {
      role: 'readWrite',
      db: 'exchange_platform'
    }
  ]
});

// Create basic collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'username', 'createdAt'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        },
        username: {
          bsonType: 'string',
          minLength: 3,
          maxLength: 50
        },
        role: {
          bsonType: 'string',
          enum: ['user', 'admin', 'super_admin']
        },
        status: {
          bsonType: 'string',
          enum: ['active', 'inactive', 'suspended', 'pending']
        }
      }
    }
  }
});

db.createCollection('transactions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'type', 'status', 'createdAt'],
      properties: {
        type: {
          bsonType: 'string',
          enum: ['exchange', 'deposit', 'withdrawal', 'transfer']
        },
        status: {
          bsonType: 'string',
          enum: ['pending', 'completed', 'failed', 'cancelled']
        },
        amount: {
          bsonType: 'number',
          minimum: 0
        }
      }
    }
  }
});

db.createCollection('accounts', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'currency', 'accountNumber'],
      properties: {
        currency: {
          bsonType: 'string',
          minLength: 3,
          maxLength: 3
        },
        balance: {
          bsonType: 'number',
          minimum: 0
        },
        accountNumber: {
          bsonType: 'string',
          minLength: 10
        }
      }
    }
  }
});

db.createCollection('exchange_rates');
db.createCollection('audit_logs');
db.createCollection('sessions');
db.createCollection('migration_log');
db.createCollection('db_monitoring');

// Create indexes for better performance
print('Creating indexes...');

// Users indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ tenantId: 1 });
db.users.createIndex({ createdAt: 1 });
db.users.createIndex({ role: 1 });
db.users.createIndex({ status: 1 });

// Transactions indexes
db.transactions.createIndex({ userId: 1 });
db.transactions.createIndex({ type: 1 });
db.transactions.createIndex({ status: 1 });
db.transactions.createIndex({ createdAt: -1 });
db.transactions.createIndex({ userId: 1, status: 1, createdAt: -1 });
db.transactions.createIndex({ tenantId: 1 });

// Accounts indexes
db.accounts.createIndex({ userId: 1 });
db.accounts.createIndex({ currency: 1 });
db.accounts.createIndex({ accountNumber: 1 }, { unique: true });
db.accounts.createIndex({ userId: 1, currency: 1 }, { unique: true });
db.accounts.createIndex({ tenantId: 1 });

// Exchange rates indexes
db.exchange_rates.createIndex({ from: 1, to: 1 });
db.exchange_rates.createIndex({ timestamp: -1 });
db.exchange_rates.createIndex({ tenantId: 1 });

// Sessions indexes (with TTL)
db.sessions.createIndex({ expires: 1 }, { expireAfterSeconds: 0 });
db.sessions.createIndex({ userId: 1 });

// Audit logs indexes (with TTL for 90 days)
db.audit_logs.createIndex({ userId: 1, timestamp: -1 });
db.audit_logs.createIndex({ action: 1, timestamp: -1 });
db.audit_logs.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

// Monitoring indexes (with TTL for 7 days)
db.db_monitoring.createIndex({ timestamp: 1 }, { expireAfterSeconds: 604800 }); // 7 days

// Insert sample data for testing
print('Inserting sample data...');

// Sample currencies
db.currencies.insertMany([
  { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2, active: true },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, active: true },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2, active: true },
  { code: 'BTC', name: 'Bitcoin', symbol: '₿', decimals: 8, active: true },
  { code: 'ETH', name: 'Ethereum', symbol: 'Ξ', decimals: 18, active: true }
]);

// Sample system configuration
db.system_config.insertOne({
  _id: 'system',
  maintenance_mode: false,
  registration_enabled: true,
  email_verification_required: false,
  two_factor_required: false,
  max_transaction_amount: 100000,
  min_transaction_amount: 1,
  transaction_fee_percentage: 0.1,
  updatedAt: new Date()
});

// Sample exchange rates
const now = new Date();
db.exchange_rates.insertMany([
  {
    from: 'USD',
    to: 'EUR',
    rate: 0.85,
    timestamp: now,
    source: 'test'
  },
  {
    from: 'EUR',
    to: 'USD',
    rate: 1.18,
    timestamp: now,
    source: 'test'
  },
  {
    from: 'USD',
    to: 'GBP',
    rate: 0.73,
    timestamp: now,
    source: 'test'
  },
  {
    from: 'GBP',
    to: 'USD',
    rate: 1.37,
    timestamp: now,
    source: 'test'
  }
]);

// Log initialization completion
db.migration_log.insertOne({
  version: 'init',
  timestamp: new Date(),
  status: 'completed',
  type: 'initialization',
  environment: 'local'
});

print('Database initialization completed successfully!');
print('Collections created:', db.getCollectionNames().length);
print('Users collection documents:', db.users.countDocuments());
print('Exchange rates inserted:', db.exchange_rates.countDocuments());