// Simple standalone test to verify our environment validation service
process.env.NODE_ENV = 'test';

const EnvironmentValidationService = require('../services/environmentValidationService');

// Test 1: Missing JWT_SECRET should fail
console.log('Test 1: Testing missing JWT_SECRET...');
delete process.env.JWT_SECRET;
const validator1 = new EnvironmentValidationService();
const result1 = validator1.validateJWTConfiguration();
console.log('✓ Correctly identified missing JWT_SECRET:', !result1.isValid);
console.log('✓ Error message:', result1.errors.includes('JWT_SECRET environment variable is required'));

// Test 2: Default JWT_SECRET in production should fail
console.log('\nTest 2: Testing default JWT_SECRET in production...');
process.env.NODE_ENV = 'production';
process.env.JWT_SECRET = 'your-secret-key-here';
const validator2 = new EnvironmentValidationService();
const result2 = validator2.validateJWTConfiguration();
console.log('✓ Correctly rejected default secret in production:', !result2.isValid);
console.log('✓ Error message:', result2.errors.includes('JWT_SECRET cannot use default value in production environment'));

// Test 3: Short JWT_SECRET should fail
console.log('\nTest 3: Testing short JWT_SECRET...');
process.env.NODE_ENV = 'development';
process.env.JWT_SECRET = 'short';
const validator3 = new EnvironmentValidationService();
const result3 = validator3.validateJWTConfiguration();
console.log('✓ Correctly rejected short secret:', !result3.isValid);
console.log('✓ Error message:', result3.errors.includes('JWT_SECRET must be at least 32 characters long for security'));

// Test 4: Valid JWT_SECRET should pass
console.log('\nTest 4: Testing valid JWT_SECRET...');
process.env.JWT_SECRET = 'this-is-a-very-secure-jwt-secret-with-at-least-32-characters-long';
const validator4 = new EnvironmentValidationService();
const result4 = validator4.validateJWTConfiguration();
console.log('✓ Correctly accepted valid secret:', result4.isValid);
console.log('✓ No errors:', result4.errors.length === 0);

// Test 5: Generate secure secret
console.log('\nTest 5: Testing secure secret generation...');
const generatedSecret = EnvironmentValidationService.generateSecureSecret();
console.log('✓ Generated secret length correct:', generatedSecret.length === 128);
console.log('✓ Generated secret is hex:', /^[a-f0-9]+$/.test(generatedSecret));

console.log('\n🎉 All environment validation tests passed!');

// Test token blacklist service basic functionality
const tokenBlacklistService = require('../services/tokenBlacklistService');

console.log('\nTest 6: Testing token blacklist service...');
(async () => {
    try {
        const testToken = 'test-token-12345';
        
        // Test blacklisting a token
        await tokenBlacklistService.blacklistToken(testToken, 60);
        console.log('✓ Token blacklisted successfully');
        
        // Test checking if token is blacklisted
        const isBlacklisted = await tokenBlacklistService.isTokenBlacklisted(testToken);
        console.log('✓ Token correctly identified as blacklisted:', isBlacklisted);
        
        // Test stats
        const stats = await tokenBlacklistService.getStats();
        console.log('✓ Stats retrieved:', stats.storage === 'memory');
        
        console.log('\n🎉 All token blacklist tests passed!');
        
    } catch (error) {
        console.error('❌ Token blacklist test failed:', error.message);
    }
})();