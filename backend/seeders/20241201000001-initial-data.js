'use strict';

const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create default tenant
    const [tenantResults] = await queryInterface.bulkInsert('tenants', [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Enterprise Exchange Platform',
        slug: 'enterprise-platform',
        email: 'admin@enterprise-platform.com',
        status: 'active',
        plan: 'enterprise',
        business_type: 'exchange',
        settings: JSON.stringify({
          timezone: 'UTC',
          currency: 'USD',
          language: 'en',
          enabledModules: [
            'cash_management',
            'bank_operations',
            'exchanges',
            'remittances',
            'reports',
            'p2p_trading',
            'commission_management'
          ],
          features: {
            twoFaRequired: false,
            maxDailyTransactionAmount: 1000000,
            maxMonthlyTransactionAmount: 10000000,
            allowP2P: true,
            allowCrypto: true,
            enableApiAccess: true
          }
        }),
        created_at: new Date(),
        updated_at: new Date()
      }
    ], { returning: true });

    // Create default users with different roles
    const hashedPassword = await bcrypt.hash('Admin@2024', 12);
    
    await queryInterface.bulkInsert('users', [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'superadmin@platform.com',
        password: hashedPassword,
        first_name: 'Super',
        last_name: 'Admin',
        phone: '+1-555-0001',
        role: 'super_admin',
        status: 'active',
        email_verified: true,
        kyc_status: 'verified',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'admin@exchange.com',
        password: hashedPassword,
        first_name: 'Tenant',
        last_name: 'Admin',
        phone: '+1-555-0002',
        role: 'tenant_admin',
        status: 'active',
        email_verified: true,
        kyc_status: 'verified',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'manager@branch.com',
        password: hashedPassword,
        first_name: 'Branch',
        last_name: 'Manager',
        phone: '+1-555-0003',
        role: 'manager',
        status: 'active',
        email_verified: true,
        kyc_status: 'verified',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'staff@branch.com',
        password: hashedPassword,
        first_name: 'Branch',
        last_name: 'Staff',
        phone: '+1-555-0004',
        role: 'staff',
        status: 'active',
        email_verified: true,
        kyc_status: 'verified',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'customer@exchange.com',
        password: hashedPassword,
        first_name: 'Demo',
        last_name: 'Customer',
        phone: '+1-555-0005',
        role: 'customer',
        status: 'active',
        email_verified: true,
        kyc_status: 'verified',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Create default branch
    await queryInterface.bulkInsert('branches', [
      {
        id: '550e8400-e29b-41d4-a716-446655440010',
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        manager_id: '550e8400-e29b-41d4-a716-446655440003',
        name: 'Main Branch',
        code: 'MAIN001',
        description: 'Main exchange branch',
        email: 'main@exchange.com',
        phone: '+1-555-0100',
        type: 'main',
        status: 'active',
        address: JSON.stringify({
          street: '123 Exchange Street',
          city: 'Financial District',
          state: 'NY',
          country: 'USA',
          zipCode: '10001'
        }),
        operating_hours: JSON.stringify({
          1: { open: '09:00', close: '17:00' }, // Monday
          2: { open: '09:00', close: '17:00' }, // Tuesday
          3: { open: '09:00', close: '17:00' }, // Wednesday
          4: { open: '09:00', close: '17:00' }, // Thursday
          5: { open: '09:00', close: '17:00' }, // Friday
          6: { open: '09:00', close: '13:00' }, // Saturday
          0: null // Sunday - closed
        }),
        services: JSON.stringify([
          'cash_management',
          'bank_operations',
          'exchanges',
          'remittances'
        ]),
        currencies: JSON.stringify(['USD', 'EUR', 'GBP', 'JPY', 'CAD']),
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Create default accounts for the customer
    await queryInterface.bulkInsert('accounts', [
      {
        id: '550e8400-e29b-41d4-a716-446655440020',
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: '550e8400-e29b-41d4-a716-446655440005',
        branch_id: '550e8400-e29b-41d4-a716-446655440010',
        account_number: 'CASH' + Date.now().toString(36).toUpperCase(),
        account_type: 'cash',
        currency: 'USD',
        balance: 10000.00,
        available_balance: 10000.00,
        status: 'active',
        is_default: true,
        opened_date: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440021',
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: '550e8400-e29b-41d4-a716-446655440005',
        branch_id: '550e8400-e29b-41d4-a716-446655440010',
        account_number: 'BANK' + Date.now().toString(36).toUpperCase(),
        account_type: 'bank',
        currency: 'USD',
        balance: 5000.00,
        available_balance: 5000.00,
        status: 'active',
        bank_name: 'Demo Bank',
        bank_code: 'DEMO001',
        opened_date: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Create sample exchange rates
    await queryInterface.bulkInsert('exchange_rates', [
      {
        id: '550e8400-e29b-41d4-a716-446655440030',
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        from_currency: 'USD',
        to_currency: 'EUR',
        buy_rate: 0.85,
        sell_rate: 0.87,
        mid_rate: 0.86,
        is_active: true,
        updated_by: '550e8400-e29b-41d4-a716-446655440002',
        effective_from: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440031',
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        from_currency: 'USD',
        to_currency: 'GBP',
        buy_rate: 0.75,
        sell_rate: 0.77,
        mid_rate: 0.76,
        is_active: true,
        updated_by: '550e8400-e29b-41d4-a716-446655440002',
        effective_from: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('exchange_rates', null, {});
    await queryInterface.bulkDelete('accounts', null, {});
    await queryInterface.bulkDelete('branches', null, {});
    await queryInterface.bulkDelete('users', null, {});
    await queryInterface.bulkDelete('tenants', null, {});
  }
};