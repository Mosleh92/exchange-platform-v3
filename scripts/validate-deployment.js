#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Exchange Platform V3 - Final Deployment Validation\n');

// Test 1: Build Process
console.log('📦 Testing Build Process...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed successfully\n');
} catch (error) {
  console.log('❌ Build failed\n');
  process.exit(1);
}

// Test 2: Frontend Build Output
console.log('📁 Checking Frontend Build Output...');
const frontendDistPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  const files = fs.readdirSync(frontendDistPath);
  if (files.includes('index.html')) {
    console.log('✅ Frontend built successfully');
    console.log(`   Files: ${files.join(', ')}\n`);
  } else {
    console.log('❌ Frontend build missing index.html\n');
    process.exit(1);
  }
} else {
  console.log('❌ Frontend dist directory not found\n');
  process.exit(1);
}

// Test 3: API Endpoints
console.log('🔧 Testing API Endpoints...');
try {
  execSync('node scripts/test-api.js', { stdio: 'inherit' });
  console.log('✅ API endpoints working\n');
} catch (error) {
  console.log('❌ API endpoint test failed\n');
  process.exit(1);
}

// Test 4: Health Check
console.log('🩺 Running Health Check...');
try {
  execSync('NODE_ENV=production JWT_SECRET=test-secret-minimum-64-characters-for-deployment-validation MONGODB_URI=mongodb://localhost:27017/test node scripts/health-check.js', { stdio: 'inherit' });
  console.log('✅ Health check passed\n');
} catch (error) {
  console.log('❌ Health check failed\n');
  process.exit(1);
}

// Test 5: Configuration Files
console.log('📋 Checking Deployment Configuration Files...');
const configFiles = [
  'package.json',
  'Procfile',
  'render.yaml',
  'vercel.json',
  'api/index.js',
  'frontend/package.json',
  'backend/package.json'
];

let allConfigsExist = true;
configFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ Missing: ${file}`);
    allConfigsExist = false;
  }
});

if (!allConfigsExist) {
  console.log('\n❌ Some configuration files are missing');
  process.exit(1);
}

console.log('\n🎉 All validation tests passed!');
console.log('\n📋 Deployment Summary:');
console.log('   ✅ Build process works');
console.log('   ✅ Frontend builds successfully');
console.log('   ✅ API endpoints respond correctly');
console.log('   ✅ Health checks pass');
console.log('   ✅ All configuration files present');

console.log('\n🚀 Ready for deployment on:');
console.log('   • Render.com (use render.yaml)');
console.log('   • Vercel (use vercel.json)');
console.log('   • Heroku (use Procfile)');
console.log('   • Any Docker platform (use docker-compose.yml)');

console.log('\n📖 See DEPLOYMENT_QUICK_GUIDE.md for detailed instructions');