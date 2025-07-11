// backend/src/tests/security/security.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const UserSecure = require('../../models/UserSecure');
const RefreshToken = require('../../models/RefreshToken');
const encryption = require('../../utils/encryption');
const sanitization = require('../../utils/sanitization');
const securityAudit = require('../../utils/securityAudit');
const sessionSecurity = require('../../utils/sessionSecurity');

describe('Security Features', () => {
    let testUser;
    let authToken;
    let refreshToken;

    beforeAll(async () => {
        // Connect to test database
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/exchange-test');
        }
    });

    beforeEach(async () => {
        // Clean up test data
        await UserSecure.deleteMany({});
        await RefreshToken.deleteMany({});

        // Create test user
        testUser = new UserSecure({
            email: 'test@example.com',
            password: 'SecurePassword123!',
            firstName: 'Test',
            lastName: 'User',
            phone: '+1234567890',
            role: 'customer'
        });
        await testUser.save();
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    describe('Authentication Security', () => {
        test('should implement proper JWT with refresh token mechanism', async () => {
            // Login
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'SecurePassword123!'
                })
                .expect(200);

            expect(loginResponse.body.success).toBe(true);
            expect(loginResponse.body.data.accessToken).toBeDefined();
            expect(loginResponse.body.data.refreshToken).toBeDefined();

            authToken = loginResponse.body.data.accessToken;
            refreshToken = loginResponse.body.data.refreshToken;

            // Verify refresh token is stored in database
            const storedRefreshToken = await RefreshToken.findOne({ token: refreshToken });
            expect(storedRefreshToken).toBeTruthy();
            expect(storedRefreshToken.userId.toString()).toBe(testUser._id.toString());
        });

        test('should rotate refresh tokens on use', async () => {
            // Login first
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'SecurePassword123!'
                });

            const originalRefreshToken = loginResponse.body.data.refreshToken;

            // Use refresh token
            const refreshResponse = await request(app)
                .post('/api/auth/refresh-token')
                .send({ refreshToken: originalRefreshToken })
                .expect(200);

            expect(refreshResponse.body.accessToken).toBeDefined();

            // Original refresh token should be invalidated
            const oldToken = await RefreshToken.findOne({ token: originalRefreshToken });
            expect(oldToken).toBeFalsy();
        });

        test('should implement account lockout after failed login attempts', async () => {
            // Make 5 failed login attempts
            for (let i = 0; i < 5; i++) {
                await request(app)
                    .post('/api/auth/login')
                    .send({
                        email: 'test@example.com',
                        password: 'wrongpassword'
                    })
                    .expect(401);
            }

            // Account should be locked
            const lockedUser = await UserSecure.findById(testUser._id);
            expect(lockedUser.isCurrentlyLocked).toBe(true);

            // Subsequent login with correct password should fail
            await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'SecurePassword123!'
                })
                .expect(423); // Account locked
        });

        test('should invalidate all sessions on logout', async () => {
            // Login
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'SecurePassword123!'
                });

            const refreshToken = loginResponse.body.data.refreshToken;

            // Logout all sessions
            await request(app)
                .post('/api/auth/logout-all')
                .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`)
                .expect(200);

            // Refresh token should be invalidated
            const invalidatedToken = await RefreshToken.findOne({ token: refreshToken });
            expect(invalidatedToken).toBeFalsy();
        });
    });

    describe('Input Sanitization', () => {
        test('should sanitize XSS attempts', () => {
            const maliciousInput = '<script>alert("xss")</script>';
            const sanitized = sanitization.sanitizeString(maliciousInput);
            
            expect(sanitized).not.toContain('<script>');
            expect(sanitized).not.toContain('alert');
        });

        test('should sanitize SQL injection attempts', () => {
            const maliciousInput = "'; DROP TABLE users; --";
            const sanitized = sanitization.sanitizeString(maliciousInput);
            
            expect(sanitized).not.toContain('DROP');
            expect(sanitized).not.toContain('--');
        });

        test('should validate and sanitize email addresses', () => {
            const validEmail = sanitization.sanitizeEmail('Test@Example.Com');
            expect(validEmail).toBe('test@example.com');

            const invalidEmail = sanitization.sanitizeEmail('<script>alert(1)</script>@test.com');
            expect(invalidEmail).toBeNull();
        });

        test('should sanitize financial amounts', () => {
            expect(sanitization.sanitizeAmount('1000.123456789')).toBe(1000.12345678);
            expect(sanitization.sanitizeAmount('-100')).toBe(0); // Negative amounts should be 0
            expect(sanitization.sanitizeAmount('invalid')).toBeNull();
        });
    });

    describe('Data Encryption', () => {
        test('should encrypt sensitive user data at rest', () => {
            const sensitiveData = 'Personal Information';
            const encrypted = encryption.encrypt(sensitiveData);
            
            expect(encrypted).not.toBe(sensitiveData);
            expect(encrypted).toContain(':'); // Should contain IV:data:tag format
            
            const decrypted = encryption.decrypt(encrypted);
            expect(decrypted).toBe(sensitiveData);
        });

        test('should hash passwords securely', () => {
            const password = 'TestPassword123!';
            const hashedPassword = encryption.hash(password);
            
            expect(hashedPassword).not.toBe(password);
            expect(hashedPassword).toContain(':'); // Should contain salt:hash format
            
            expect(encryption.verifyHash(password, hashedPassword)).toBe(true);
            expect(encryption.verifyHash('wrongpassword', hashedPassword)).toBe(false);
        });
    });

    describe('Session Security', () => {
        test('should create secure sessions with device fingerprinting', async () => {
            const mockReq = {
                ip: '192.168.1.1',
                get: (header) => {
                    const headers = {
                        'User-Agent': 'Mozilla/5.0 Test Browser',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate'
                    };
                    return headers[header];
                }
            };

            const session = await sessionSecurity.createSession(testUser, mockReq);
            
            expect(session.sessionId).toBeDefined();
            expect(session.deviceFingerprint).toBeDefined();
            expect(session.expiresAt).toBeDefined();
        });

        test('should detect suspicious session activity', async () => {
            const mockReq1 = {
                ip: '192.168.1.1',
                get: () => 'Mozilla/5.0 Test Browser'
            };

            const session = await sessionSecurity.createSession(testUser, mockReq1);

            // Simulate IP change
            const mockReq2 = {
                ip: '192.168.1.2',
                get: () => 'Mozilla/5.0 Test Browser'
            };

            const validation = await sessionSecurity.validateSession(session.sessionId, mockReq2);
            expect(validation.valid).toBe(false);
            expect(validation.reason).toBe('SUSPICIOUS_ACTIVITY');
        });
    });

    describe('Security Audit Logging', () => {
        test('should log security events', () => {
            const eventId = securityAudit.logSecurityEvent(
                securityAudit.securityEvents.LOGIN_SUCCESS,
                {
                    user: testUser,
                    ip: '192.168.1.1'
                }
            );

            expect(eventId).toBeDefined();
            expect(typeof eventId).toBe('string');
        });

        test('should classify events by risk level', () => {
            const criticalEvent = securityAudit.determineRiskLevel(
                securityAudit.securityEvents.BRUTE_FORCE_ATTEMPT
            );
            expect(criticalEvent).toBe(securityAudit.riskLevels.CRITICAL);

            const lowEvent = securityAudit.determineRiskLevel(
                securityAudit.securityEvents.LOGIN_SUCCESS
            );
            expect(lowEvent).toBe(securityAudit.riskLevels.LOW);
        });
    });
});

module.exports = {
    testUser,
    authToken,
    refreshToken
};