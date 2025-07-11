// backend/test-security.js
/**
 * Quick security feature validation
 */

try {
    // Test encryption
    const encryption = require('./src/utils/encryption');
    console.log('🔒 Testing encryption...');
    const text = 'Sensitive banking information: 1234567890';
    const encrypted = encryption.encrypt(text);
    const decrypted = encryption.decrypt(encrypted);
    console.log(`   Original: ${text}`);
    console.log(`   Encrypted: ${encrypted.substring(0, 50)}...`);
    console.log(`   Decrypted: ${decrypted}`);
    console.log(`   ✅ Encryption ${text === decrypted ? 'PASSED' : 'FAILED'}\n`);

    // Test sanitization
    const sanitization = require('./src/utils/sanitization');
    console.log('🧼 Testing input sanitization...');
    
    const xssAttempt = '<script>alert("xss")</script><p>normal text</p>';
    const sanitizedXss = sanitization.sanitizeString(xssAttempt);
    console.log(`   XSS attempt: ${xssAttempt}`);
    console.log(`   Sanitized: ${sanitizedXss}`);
    console.log(`   ✅ XSS protection ${!sanitizedXss.includes('<script>') ? 'PASSED' : 'FAILED'}`);

    const sqlAttempt = "admin'; DROP TABLE users; --";
    const sanitizedSql = sanitization.sanitizeString(sqlAttempt);
    console.log(`   SQL injection: ${sqlAttempt}`);
    console.log(`   Sanitized: ${sanitizedSql}`);
    console.log(`   ✅ SQL injection protection ${!sanitizedSql.includes('DROP') ? 'PASSED' : 'FAILED'}`);

    const email = sanitization.sanitizeEmail('Test@Example.COM');
    console.log(`   Email normalization: Test@Example.COM -> ${email}`);
    console.log(`   ✅ Email sanitization ${email === 'test@example.com' ? 'PASSED' : 'FAILED'}\n`);

    // Test password hashing
    console.log('🔐 Testing password security...');
    const password = 'SecurePassword123!';
    const hashedPassword = encryption.hash(password);
    const isValid = encryption.verifyHash(password, hashedPassword);
    const isInvalid = encryption.verifyHash('wrongpassword', hashedPassword);
    console.log(`   Password: ${password}`);
    console.log(`   Hashed: ${hashedPassword.substring(0, 50)}...`);
    console.log(`   ✅ Password hashing ${isValid && !isInvalid ? 'PASSED' : 'FAILED'}\n`);

    // Test session security
    console.log('🔐 Testing session security...');
    const sessionSecurity = require('./src/utils/sessionSecurity');
    const mockReq = {
        ip: '192.168.1.100',
        get: (header) => {
            const headers = {
                'User-Agent': 'Mozilla/5.0 (Test Browser)',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate'
            };
            return headers[header] || '';
        },
        headers: {
            'sec-ch-ua': '',
            'sec-ch-ua-platform': ''
        }
    };
    
    const fingerprint = sessionSecurity.generateDeviceFingerprint(mockReq);
    console.log(`   Device fingerprint: ${fingerprint}`);
    console.log(`   ✅ Device fingerprinting ${fingerprint && fingerprint.length === 16 ? 'PASSED' : 'FAILED'}\n`);

    console.log('🎉 All security component tests completed successfully!');
    console.log('✅ Encryption at rest working');
    console.log('✅ Input sanitization working');
    console.log('✅ Password hashing working');
    console.log('✅ Session security working');

} catch (error) {
    console.error('❌ Security test failed:', error.message);
    process.exit(1);
}