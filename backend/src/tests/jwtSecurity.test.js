const request = require('supertest');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('../app'); // Adjust path as needed
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const tokenBlacklistService = require('../services/tokenBlacklistService');

describe('JWT Security Tests', () => {
    let mongoServer;
    let testUser;
    let validToken;
    let refreshToken;

    beforeAll(async () => {
        // Setup in-memory MongoDB
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);

        // Create test user
        testUser = new User({
            username: 'testuser',
            email: 'test@example.com',
            password: 'TestPassword123!',
            fullName: 'Test User',
            role: 'customer',
            isActive: true
        });
        await testUser.save();

        // Generate valid token
        validToken = jwt.sign(
            {
                userId: testUser._id,
                email: testUser.email,
                role: testUser.role,
                iat: Math.floor(Date.now() / 1000)
            },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );

        // Create refresh token
        refreshToken = require('crypto').randomBytes(64).toString('hex');
        await RefreshToken.create({
            userId: testUser._id,
            token: refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        // Clear blacklist before each test
        if (tokenBlacklistService.memoryBlacklist) {
            tokenBlacklistService.memoryBlacklist.clear();
        }
        if (tokenBlacklistService.userBlacklist) {
            tokenBlacklistService.userBlacklist.clear();
        }
    });

    describe('Token Blacklist Security', () => {
        test('should reject blacklisted tokens', async () => {
            // Blacklist the token
            await tokenBlacklistService.blacklistToken(validToken);

            // Try to use blacklisted token
            const response = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(401);
            expect(response.body.message).toContain('revoked');
        });

        test('should reject tokens after user blacklist', async () => {
            // Blacklist all user tokens
            await tokenBlacklistService.blacklistUserTokens(testUser._id);

            // Try to use token
            const response = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(401);
            expect(response.body.message).toContain('revoked for security reasons');
        });

        test('should blacklist token on logout', async () => {
            const response = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ refreshToken });

            expect(response.status).toBe(200);

            // Token should now be blacklisted
            const isBlacklisted = await tokenBlacklistService.isTokenBlacklisted(validToken);
            expect(isBlacklisted).toBe(true);
        });
    });

    describe('Replay Attack Protection', () => {
        test('should prevent replay attacks with expired tokens', async () => {
            // Create an expired token
            const expiredToken = jwt.sign(
                {
                    userId: testUser._id,
                    email: testUser.email,
                    role: testUser.role,
                    iat: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
                },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1s' } // Very short expiration
            );

            // Wait for token to expire
            await new Promise(resolve => setTimeout(resolve, 2000));

            const response = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${expiredToken}`);

            expect(response.status).toBe(401);
            expect(response.body.message).toContain('expired');
        });

        test('should prevent token reuse after logout', async () => {
            // Use token normally
            let response = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${validToken}`);
            expect(response.status).toBe(200);

            // Logout
            response = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${validToken}`)
                .send({ refreshToken });
            expect(response.status).toBe(200);

            // Try to reuse token after logout
            response = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${validToken}`);
            expect(response.status).toBe(401);
        });

        test('should prevent simultaneous session replay', async () => {
            // Multiple requests with same token should work initially
            const promises = Array(5).fill().map(() =>
                request(app)
                    .get('/api/auth/profile')
                    .set('Authorization', `Bearer ${validToken}`)
            );

            const responses = await Promise.all(promises);
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });

            // But after blacklisting, all should fail
            await tokenBlacklistService.blacklistToken(validToken);

            const failedPromises = Array(5).fill().map(() =>
                request(app)
                    .get('/api/auth/profile')
                    .set('Authorization', `Bearer ${validToken}`)
            );

            const failedResponses = await Promise.all(failedPromises);
            failedResponses.forEach(response => {
                expect(response.status).toBe(401);
            });
        });
    });

    describe('Refresh Token Security', () => {
        test('should reject invalid refresh tokens', async () => {
            const response = await request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken: 'invalid-refresh-token' });

            expect(response.status).toBe(401);
            expect(response.body.message).toContain('Invalid refresh token');
        });

        test('should reject expired refresh tokens', async () => {
            // Create expired refresh token
            const expiredRefreshToken = require('crypto').randomBytes(64).toString('hex');
            await RefreshToken.create({
                userId: testUser._id,
                token: expiredRefreshToken,
                expiresAt: new Date(Date.now() - 1000) // Already expired
            });

            const response = await request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken: expiredRefreshToken });

            expect(response.status).toBe(401);
            expect(response.body.message).toContain('expired');

            // Should be cleaned up from database
            const tokenExists = await RefreshToken.findOne({ token: expiredRefreshToken });
            expect(tokenExists).toBeNull();
        });

        test('should generate new access token with valid refresh token', async () => {
            const response = await request(app)
                .post('/api/auth/refresh')
                .send({ refreshToken });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.accessToken).toBeDefined();

            // Verify new token is valid
            const decoded = jwt.verify(response.body.accessToken, process.env.JWT_SECRET || 'test-secret');
            expect(decoded.userId).toBe(testUser._id.toString());
        });
    });

    describe('Session Management', () => {
        test('should logout all sessions', async () => {
            // Create multiple refresh tokens (sessions)
            const tokens = [];
            for (let i = 0; i < 3; i++) {
                const token = require('crypto').randomBytes(64).toString('hex');
                await RefreshToken.create({
                    userId: testUser._id,
                    token,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                });
                tokens.push(token);
            }

            const response = await request(app)
                .post('/api/auth/logout-all')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(200);

            // All refresh tokens should be removed
            const remainingTokens = await RefreshToken.find({ userId: testUser._id });
            expect(remainingTokens).toHaveLength(0);
        });

        test('should get active sessions', async () => {
            // Create test sessions
            for (let i = 0; i < 2; i++) {
                const token = require('crypto').randomBytes(64).toString('hex');
                await RefreshToken.create({
                    userId: testUser._id,
                    token,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                });
            }

            const response = await request(app)
                .get('/api/auth/sessions')
                .set('Authorization', `Bearer ${validToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.sessions).toBeDefined();
            expect(response.body.data.total).toBeGreaterThan(0);
        });
    });

    describe('Token Structure Validation', () => {
        test('should reject malformed tokens', async () => {
            const malformedTokens = [
                'not.a.token',
                'Bearer invalid',
                '',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
                null,
                undefined
            ];

            for (const token of malformedTokens) {
                const response = await request(app)
                    .get('/api/auth/profile')
                    .set('Authorization', token ? `Bearer ${token}` : '');

                expect(response.status).toBe(401);
            }
        });

        test('should reject tokens with invalid signature', async () => {
            const invalidToken = jwt.sign(
                {
                    userId: testUser._id,
                    email: testUser.email,
                    role: testUser.role
                },
                'wrong-secret',
                { expiresIn: '1h' }
            );

            const response = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${invalidToken}`);

            expect(response.status).toBe(401);
            expect(response.body.message).toContain('Invalid token');
        });

        test('should validate token payload structure', async () => {
            const incompleteToken = jwt.sign(
                { someField: 'value' }, // Missing required fields
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );

            const response = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${incompleteToken}`);

            expect(response.status).toBe(401);
        });
    });
});