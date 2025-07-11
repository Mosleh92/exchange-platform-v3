// test-sequelize.js - Simple test to validate Sequelize setup
require('dotenv').config();

const sequelizeManager = require('./backend/src/config/sequelize');
const { defineAssociations } = require('./backend/src/models/sequelize');

async function testSequelize() {
  try {
    console.log('🧪 Testing Sequelize setup...');

    // Initialize Sequelize connection
    await sequelizeManager.initialize();
    console.log('✅ PostgreSQL connection established');

    // Define model associations
    defineAssociations();
    console.log('✅ Model associations defined');

    // Test database health
    const health = await sequelizeManager.getHealthStatus();
    console.log('📊 Database health:', health);

    // Test a simple query
    const result = await sequelizeManager.query('SELECT NOW() as current_time');
    console.log('⏰ Database time:', result[0]?.current_time);

    console.log('🎉 Sequelize setup test completed successfully!');

  } catch (error) {
    console.error('❌ Sequelize setup test failed:', error.message);
  } finally {
    await sequelizeManager.close();
    console.log('🔒 Database connection closed');
  }
}

testSequelize();