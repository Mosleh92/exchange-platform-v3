#!/usr/bin/env node

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvironmentVariables() {
  log('\n🔍 Checking Environment Variables...', 'blue');
  
  const requiredVars = [
    'NODE_ENV',
    'JWT_SECRET',
    'MONGODB_URI'
  ];
  
  const optionalVars = ['PORT'];
  
  let allValid = true;
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      log(`❌ Missing: ${varName}`, 'red');
      allValid = false;
    } else if (varName === 'JWT_SECRET' && value.length < 32) {
      log(`⚠️  Warning: ${varName} should be at least 32 characters long`, 'yellow');
    } else {
      log(`✅ ${varName}: ${varName === 'JWT_SECRET' ? '***' : value}`, 'green');
    }
  });
  
  optionalVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      log(`✅ ${varName}: ${value}`, 'green');
    } else {
      log(`ℹ️  ${varName}: Using default (will be auto-set by hosting platforms)`, 'blue');
    }
  });
  
  return allValid;
}

function checkDependencies() {
  log('\n📦 Checking Dependencies...', 'blue');
  
  try {
    require('express');
    log('✅ Express available', 'green');
  } catch (e) {
    log('❌ Express not found', 'red');
    return false;
  }
  
  try {
    require('mongoose');
    log('✅ Mongoose available', 'green');
  } catch (e) {
    log('❌ Mongoose not found', 'red');
    return false;
  }
  
  return true;
}

function validatePorts() {
  log('\n🌐 Checking Port Configuration...', 'blue');
  
  const port = process.env.PORT || 3000;
  if (isNaN(port) || port < 1000 || port > 65535) {
    log(`❌ Invalid port: ${port}`, 'red');
    return false;
  }
  
  log(`✅ Port: ${port}`, 'green');
  return true;
}

async function validateDatabase() {
  log('\n🗄️  Checking Database Configuration...', 'blue');
  
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    log('❌ MONGODB_URI not set', 'red');
    return false;
  }
  
  if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    log('❌ Invalid MongoDB URI format', 'red');
    return false;
  }
  
  log('✅ MongoDB URI format is valid', 'green');
  return true;
}

function checkBuildConfig() {
  log('\n🔧 Checking Build Configuration...', 'blue');
  
  const fs = require('fs');
  const path = require('path');
  
  // Check if essential files exist
  const essentialFiles = [
    'package.json',
    'server.js',
    'api/index.js',
    'frontend/package.json',
    'frontend/vite.config.js'
  ];
  
  let allExist = true;
  
  essentialFiles.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      log(`✅ ${file} exists`, 'green');
    } else {
      log(`❌ Missing: ${file}`, 'red');
      allExist = false;
    }
  });
  
  return allExist;
}

async function main() {
  log('🚀 Exchange Platform - Deployment Health Check', 'blue');
  log('='.repeat(50), 'blue');
  
  require('dotenv').config();
  
  const checks = [
    checkEnvironmentVariables,
    checkDependencies,
    validatePorts,
    validateDatabase,
    checkBuildConfig
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    const result = await check();
    if (!result) {
      allPassed = false;
    }
  }
  
  log('\n📋 Summary:', 'blue');
  if (allPassed) {
    log('✅ All checks passed! Ready for deployment.', 'green');
    process.exit(0);
  } else {
    log('❌ Some checks failed. Please fix the issues before deployment.', 'red');
    process.exit(1);
  }
}

main().catch(console.error);