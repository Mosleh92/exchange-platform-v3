// src/services/DatabaseService.js
const db = require('../models/postgresql');
const bcrypt = require('bcryptjs');

/**
 * Database Initialization Service
 * Handles database setup, migrations, and seed data for enterprise platform
 */
class DatabaseService {
  constructor() {
    this.isInitialized = false;
  }
  
  /**
   * Initialize the database and run migrations
   */
  async initialize() {
    try {
      console.log('🔄 Initializing Enterprise Database...');
      
      // Test database connection
      await db.sequelize.authenticate();
      console.log('✅ Database connection established');
      
      // Sync models (in development only)
      if (process.env.NODE_ENV === 'development') {
        await db.sequelize.sync({ alter: true });
        console.log('✅ Database models synchronized');
      }
      
      // Run migrations
      await this.runMigrations();
      
      // Seed initial data
      await this.seedInitialData();
      
      this.isInitialized = true;
      console.log('🎉 Enterprise Database initialized successfully');
      
      return { success: true, message: 'Database initialized successfully' };
      
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw new Error(`Database initialization failed: ${error.message}`);
    }
  }
  
  /**
   * Run database migrations
   */
  async runMigrations() {
    try {
      // In production, this would run actual migration files
      // For now, we'll ensure the basic structure is in place
      
      const queryInterface = db.sequelize.getQueryInterface();
      
      // Check if tables exist and create indexes if needed
      const tableNames = await queryInterface.showAllTables();
      
      console.log('📊 Found tables:', tableNames);
      
      // Add any missing indexes or constraints
      await this.ensureIndexes();
      
      console.log('✅ Database migrations completed');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }
  
  /**
   * Ensure all required indexes are in place
   */
  async ensureIndexes() {
    try {
      const queryInterface = db.sequelize.getQueryInterface();
      
      // Performance indexes for Tenants
      await this.createIndexIfNotExists(queryInterface, 'tenants', 'idx_tenants_status', ['status']);
      await this.createIndexIfNotExists(queryInterface, 'tenants', 'idx_tenants_subscription', ['subscription_plan']);
      
      // Performance indexes for Users
      await this.createIndexIfNotExists(queryInterface, 'users', 'idx_users_tenant_role', ['tenant_id', 'role']);
      await this.createIndexIfNotExists(queryInterface, 'users', 'idx_users_email_tenant', ['email', 'tenant_id']);
      await this.createIndexIfNotExists(queryInterface, 'users', 'idx_users_status', ['status']);
      
      // Performance indexes for AccountBalances
      await this.createIndexIfNotExists(queryInterface, 'account_balances', 'idx_balances_user_currency', ['user_id', 'currency']);
      await this.createIndexIfNotExists(queryInterface, 'account_balances', 'idx_balances_tenant', ['tenant_id']);
      
      // Performance indexes for Transactions
      await this.createIndexIfNotExists(queryInterface, 'transactions', 'idx_transactions_tenant_user', ['tenant_id', 'user_id']);
      await this.createIndexIfNotExists(queryInterface, 'transactions', 'idx_transactions_type_status', ['type', 'status']);
      await this.createIndexIfNotExists(queryInterface, 'transactions', 'idx_transactions_completed_at', ['completed_at']);
      
      console.log('✅ Database indexes ensured');
      
    } catch (error) {
      console.error('❌ Index creation failed:', error);
      // Don't throw error for index creation failures in demo
    }
  }
  
  /**
   * Create index if it doesn't exist
   */
  async createIndexIfNotExists(queryInterface, tableName, indexName, columns) {
    try {
      await queryInterface.addIndex(tableName, columns, {
        name: indexName,
        concurrently: true
      });
    } catch (error) {
      // Index might already exist, which is fine
      if (!error.message.includes('already exists')) {
        console.warn(`⚠️  Could not create index ${indexName}:`, error.message);
      }
    }
  }
  
  /**
   * Seed initial data for enterprise platform
   */
  async seedInitialData() {
    try {
      console.log('🌱 Seeding initial enterprise data...');
      
      // Create platform-level tenant (super admin organization)
      const platformTenant = await this.createPlatformTenant();
      
      // Create sample enterprise tenant
      const enterpriseTenant = await this.createSampleTenant();
      
      // Create admin users
      await this.createAdminUsers(platformTenant, enterpriseTenant);
      
      // Create sample customers
      await this.createSampleCustomers(enterpriseTenant);
      
      // Create initial account balances
      await this.createInitialBalances(enterpriseTenant);
      
      console.log('✅ Initial data seeded successfully');
      
    } catch (error) {
      console.error('❌ Data seeding failed:', error);
      // Don't throw error for seeding failures in demo
    }
  }
  
  /**
   * Create platform-level tenant
   */
  async createPlatformTenant() {
    try {
      const [tenant, created] = await db.Tenant.findOrCreate({
        where: { domain: 'platform.exchange.com' },
        defaults: {
          name: 'Exchange Platform Enterprise',
          domain: 'platform.exchange.com',
          businessLicense: 'PLATFORM-2024',
          countryCode: 'US',
          baseCurrency: 'USD',
          subscriptionPlan: 'enterprise',
          subscriptionStatus: 'active',
          status: 'active',
          tenantLevel: 'platform',
          contactEmail: 'admin@exchange.com',
          contactPhone: '+1-800-EXCHANGE',
          address: {
            street: '123 Financial District',
            city: 'New York',
            state: 'NY',
            country: 'US',
            zipCode: '10001'
          },
          settings: {
            features: {
              multiCurrency: true,
              p2pTrading: true,
              reporting: true,
              apiAccess: true,
              whiteLabel: true
            },
            limits: {
              maxUsers: 10000,
              maxTransactionsPerDay: 100000,
              maxStorageGB: 1000
            },
            branding: {
              primaryColor: '#2563eb',
              secondaryColor: '#64748b'
            },
            security: {
              requireTwoFactor: true,
              sessionTimeout: 7200
            }
          }
        }
      });
      
      if (created) {
        console.log('✅ Platform tenant created');
      } else {
        console.log('✅ Platform tenant already exists');
      }
      
      return tenant;
      
    } catch (error) {
      console.error('❌ Platform tenant creation failed:', error);
      throw error;
    }
  }
  
  /**
   * Create sample enterprise tenant
   */
  async createSampleTenant() {
    try {
      const [tenant, created] = await db.Tenant.findOrCreate({
        where: { domain: 'demo.exchange.com' },
        defaults: {
          name: 'Demo Exchange Corp',
          domain: 'demo.exchange.com',
          businessLicense: 'DEMO-2024-001',
          countryCode: 'US',
          baseCurrency: 'USD',
          subscriptionPlan: 'professional',
          subscriptionStatus: 'active',
          status: 'active',
          tenantLevel: 'tenant',
          contactEmail: 'admin@demo.exchange.com',
          contactPhone: '+1-555-DEMO',
          address: {
            street: '456 Business Ave',
            city: 'San Francisco',
            state: 'CA',
            country: 'US',
            zipCode: '94102'
          },
          settings: {
            features: {
              multiCurrency: true,
              p2pTrading: true,
              reporting: true,
              apiAccess: true,
              whiteLabel: false
            },
            limits: {
              maxUsers: 1000,
              maxTransactionsPerDay: 10000,
              maxStorageGB: 100
            },
            branding: {
              primaryColor: '#059669',
              secondaryColor: '#6b7280'
            },
            security: {
              requireTwoFactor: false,
              sessionTimeout: 3600
            }
          }
        }
      });
      
      if (created) {
        console.log('✅ Sample tenant created');
      } else {
        console.log('✅ Sample tenant already exists');
      }
      
      return tenant;
      
    } catch (error) {
      console.error('❌ Sample tenant creation failed:', error);
      throw error;
    }
  }
  
  /**
   * Create admin users
   */
  async createAdminUsers(platformTenant, enterpriseTenant) {
    try {
      // Super admin user
      const [superAdmin, saCreated] = await db.User.findOrCreate({
        where: { email: 'superadmin@exchange.com' },
        defaults: {
          tenantId: platformTenant.id,
          email: 'superadmin@exchange.com',
          passwordHash: 'SuperAdmin123!',
          firstName: 'Super',
          lastName: 'Admin',
          phone: '+1-800-ADMIN',
          role: 'super_admin',
          status: 'active',
          emailVerified: true,
          kycStatus: 'approved',
          preferences: {
            language: 'en',
            timezone: 'UTC',
            currency: 'USD'
          }
        }
      });
      
      if (saCreated) {
        console.log('✅ Super admin user created');
      }
      
      // Tenant admin user
      const [tenantAdmin, taCreated] = await db.User.findOrCreate({
        where: { email: 'admin@demo.exchange.com' },
        defaults: {
          tenantId: enterpriseTenant.id,
          email: 'admin@demo.exchange.com',
          passwordHash: 'TenantAdmin123!',
          firstName: 'Tenant',
          lastName: 'Admin',
          phone: '+1-555-ADMIN',
          role: 'tenant_admin',
          status: 'active',
          emailVerified: true,
          kycStatus: 'approved',
          preferences: {
            language: 'en',
            timezone: 'America/Los_Angeles',
            currency: 'USD'
          }
        }
      });
      
      if (taCreated) {
        console.log('✅ Tenant admin user created');
      }
      
      // Branch manager user
      const [branchManager, bmCreated] = await db.User.findOrCreate({
        where: { email: 'manager@demo.exchange.com' },
        defaults: {
          tenantId: enterpriseTenant.id,
          email: 'manager@demo.exchange.com',
          passwordHash: 'BranchManager123!',
          firstName: 'Branch',
          lastName: 'Manager',
          phone: '+1-555-MANAGER',
          role: 'branch_manager',
          status: 'active',
          emailVerified: true,
          kycStatus: 'approved',
          preferences: {
            language: 'en',
            timezone: 'America/Los_Angeles',
            currency: 'USD'
          }
        }
      });
      
      if (bmCreated) {
        console.log('✅ Branch manager user created');
      }
      
    } catch (error) {
      console.error('❌ Admin user creation failed:', error);
      throw error;
    }
  }
  
  /**
   * Create sample customers
   */
  async createSampleCustomers(tenant) {
    try {
      const customers = [
        {
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1-555-0001'
        },
        {
          email: 'jane.smith@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          phone: '+1-555-0002'
        },
        {
          email: 'bob.johnson@example.com',
          firstName: 'Bob',
          lastName: 'Johnson',
          phone: '+1-555-0003'
        }
      ];
      
      for (const customerData of customers) {
        const [customer, created] = await db.User.findOrCreate({
          where: { email: customerData.email },
          defaults: {
            tenantId: tenant.id,
            email: customerData.email,
            passwordHash: 'Customer123!',
            firstName: customerData.firstName,
            lastName: customerData.lastName,
            phone: customerData.phone,
            role: 'customer',
            status: 'active',
            emailVerified: true,
            kycStatus: 'approved',
            preferences: {
              language: 'en',
              timezone: 'America/Los_Angeles',
              currency: 'USD'
            }
          }
        });
        
        if (created) {
          console.log(`✅ Customer ${customerData.email} created`);
        }
      }
      
    } catch (error) {
      console.error('❌ Customer creation failed:', error);
      throw error;
    }
  }
  
  /**
   * Create initial account balances
   */
  async createInitialBalances(tenant) {
    try {
      // Find all users in the tenant
      const users = await db.User.findAll({
        where: { tenantId: tenant.id, role: 'customer' }
      });
      
      const currencies = ['USD', 'EUR', 'BTC', 'ETH'];
      
      for (const user of users) {
        for (const currency of currencies) {
          const [balance, created] = await db.AccountBalance.findOrCreate({
            where: { userId: user.id, currency },
            defaults: {
              userId: user.id,
              tenantId: tenant.id,
              currency,
              availableBalance: currency === 'USD' ? '1000.00000000' :
                               currency === 'EUR' ? '850.00000000' :
                               currency === 'BTC' ? '0.02500000' :
                               currency === 'ETH' ? '0.50000000' : '0.00000000',
              pendingBalance: '0.00000000',
              frozenBalance: '0.00000000'
            }
          });
          
          if (created) {
            console.log(`✅ Initial balance created for ${user.email} - ${currency}`);
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Initial balance creation failed:', error);
      throw error;
    }
  }
  
  /**
   * Check database health
   */
  async healthCheck() {
    try {
      // Test connection
      await db.sequelize.authenticate();
      
      // Check if main tables exist and have data
      const tenantCount = await db.Tenant.count();
      const userCount = await db.User.count();
      const balanceCount = await db.AccountBalance.count();
      
      return {
        status: 'healthy',
        connection: 'active',
        tables: {
          tenants: tenantCount,
          users: userCount,
          accountBalances: balanceCount
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      await db.close();
      console.log('✅ Database connections closed gracefully');
    } catch (error) {
      console.error('❌ Error during database shutdown:', error);
    }
  }
}

module.exports = new DatabaseService();