'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create Tenants table
    await queryInterface.createTable('tenants', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'suspended'),
        defaultValue: 'active'
      },
      plan: {
        type: Sequelize.ENUM('basic', 'premium', 'enterprise'),
        defaultValue: 'basic'
      },
      settings: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      deleted_at: {
        type: Sequelize.DATE
      }
    });

    // Create Users table
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      first_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      last_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      phone: {
        type: Sequelize.STRING
      },
      role: {
        type: Sequelize.ENUM('super_admin', 'tenant_admin', 'manager', 'staff', 'customer'),
        defaultValue: 'customer'
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'suspended'),
        defaultValue: 'active'
      },
      two_fa_enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      two_fa_secret: {
        type: Sequelize.STRING
      },
      last_login_at: {
        type: Sequelize.DATE
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      deleted_at: {
        type: Sequelize.DATE
      }
    });

    // Create unique constraint for email per tenant
    await queryInterface.addConstraint('users', {
      fields: ['tenant_id', 'email'],
      type: 'unique',
      name: 'users_tenant_email_unique'
    });

    // Create Accounts table
    await queryInterface.createTable('accounts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id'
        }
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      account_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      account_type: {
        type: Sequelize.ENUM('cash', 'bank', 'crypto', 'p2p'),
        defaultValue: 'cash'
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'USD'
      },
      balance: {
        type: Sequelize.DECIMAL(20, 8),
        defaultValue: 0
      },
      frozen_balance: {
        type: Sequelize.DECIMAL(20, 8),
        defaultValue: 0
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'frozen'),
        defaultValue: 'active'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      deleted_at: {
        type: Sequelize.DATE
      }
    });

    // Create Transactions table
    await queryInterface.createTable('transactions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id'
        }
      },
      from_account_id: {
        type: Sequelize.UUID,
        references: {
          model: 'accounts',
          key: 'id'
        }
      },
      to_account_id: {
        type: Sequelize.UUID,
        references: {
          model: 'accounts',
          key: 'id'
        }
      },
      transaction_type: {
        type: Sequelize.ENUM(
          'cash_receipt', 'cash_payment', 'bank_deposit', 'bank_withdrawal',
          'check_received', 'check_issued', 'transfer', 'exchange',
          'remittance_send', 'remittance_receive', 'commission', 'fee'
        ),
        allowNull: false
      },
      amount: {
        type: Sequelize.DECIMAL(20, 8),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false
      },
      exchange_rate: {
        type: Sequelize.DECIMAL(20, 8),
        defaultValue: 1
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed', 'cancelled'),
        defaultValue: 'pending'
      },
      reference: {
        type: Sequelize.STRING
      },
      description: {
        type: Sequelize.TEXT
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      deleted_at: {
        type: Sequelize.DATE
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('users', ['tenant_id', 'email']);
    await queryInterface.addIndex('users', ['tenant_id', 'role']);
    await queryInterface.addIndex('accounts', ['tenant_id', 'user_id']);
    await queryInterface.addIndex('accounts', ['account_number']);
    await queryInterface.addIndex('transactions', ['tenant_id', 'status']);
    await queryInterface.addIndex('transactions', ['tenant_id', 'created_at']);
    await queryInterface.addIndex('transactions', ['from_account_id']);
    await queryInterface.addIndex('transactions', ['to_account_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('transactions');
    await queryInterface.dropTable('accounts');
    await queryInterface.dropTable('users');
    await queryInterface.dropTable('tenants');
  }
};