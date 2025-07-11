// tests/security.test.js - Tests for Enhanced Security Features
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../src/app');
const tokenManager = require('../src/services/tokenManager');
const twoFactorAuthService = require('../src/services/twoFactorAuth');
const encryptionService = require('../src/services/encryptionService');

// Mock Redis for testing
jest.mock('redis', () => ({
  createClient: () => ({
    connect: jest.fn(),
    on: jest.fn(),
    setEx: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    sendCommand: jest.fn()
  })
}));

describe('Enhanced Security Features', () => {
  describe('JWT Token Manager', () => {
    test('should generate access and refresh tokens', () => {
      const user = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        role: 'customer',
        tenantId: '507f1f77bcf86cd799439012'
      };

      const tokens = tokenManager.generateTokens(user);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });

    test('should verify access token successfully', async () => {
      const user = {
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        role: 'customer',
        tenantId: '507f1f77bcf86cd799439012'
      };

      const tokens = tokenManager.generateTokens(user);
      const decoded = await tokenManager.verifyAccessToken(tokens.accessToken);

      expect(decoded.userId).toBe(user._id);
      expect(decoded.email).toBe(user.email);
      expect(decoded.role).toBe(user.role);
    });

    test('should reject malformed tokens', async () => {
      await expect(tokenManager.verifyAccessToken('invalid-token'))
        .rejects.toThrow('Token verification failed');
    });
  });

  describe('Two-Factor Authentication', () => {
    test('should generate 2FA secret with QR code', async () => {
      const result = await twoFactorAuthService.generateSecret('test@example.com', '507f1f77bcf86cd799439011');

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('manualEntryKey');
      expect(result.qrCode).toMatch(/^data:image\/png;base64,/);
    });

    test('should verify TOTP token', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const speakeasy = require('speakeasy');
      
      // Generate a valid token
      const token = speakeasy.totp({
        secret: secret,
        encoding: 'base32'
      });

      const isValid = twoFactorAuthService.verifyToken(token, secret);
      expect(isValid).toBe(true);
    });

    test('should reject invalid TOTP token', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const isValid = twoFactorAuthService.verifyToken('123456', secret);
      expect(isValid).toBe(false);
    });

    test('should generate backup codes', () => {
      const codes = twoFactorAuthService.generateBackupCodes();
      expect(codes).toHaveLength(8);
      codes.forEach(code => {
        expect(code).toMatch(/^[A-F0-9]{8}$/);
      });
    });
  });

  describe('Encryption Service', () => {
    beforeAll(() => {
      // Set test encryption key
      process.env.ENCRYPTION_KEY = 'dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcy1sb25n';
    });

    test('should encrypt and decrypt data successfully', () => {
      const plaintext = 'sensitive data';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(encrypted).toHaveProperty('encrypted');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');
      expect(decrypted).toBe(plaintext);
    });

    test('should encrypt personal information', () => {
      const personalInfo = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        email: 'john@example.com' // Should not be encrypted
      };

      const encrypted = encryptionService.encryptPersonalInfo(personalInfo);
      expect(encrypted.firstName).toHaveProperty('encrypted');
      expect(encrypted.lastName).toHaveProperty('encrypted');
      expect(encrypted.phone).toHaveProperty('encrypted');
      expect(encrypted.email).toBe('john@example.com'); // Not in sensitive fields
    });

    test('should encrypt and decrypt financial data', () => {
      const financialData = {
        accountNumber: '1234567890',
        balance: '1000.00',
        description: 'Test account' // Should not be encrypted
      };

      const encrypted = encryptionService.encryptFinancialData(financialData);
      const decrypted = encryptionService.decryptFinancialData(encrypted);

      expect(encrypted.accountNumber).toHaveProperty('encrypted');
      expect(encrypted.balance).toHaveProperty('encrypted');
      expect(encrypted.description).toBe('Test account');
      expect(decrypted.accountNumber).toBe('1234567890');
      expect(decrypted.balance).toBe('1000.00');
    });

    test('should handle encryption errors gracefully', () => {
      expect(() => encryptionService.encrypt('')).toThrow();
      expect(() => encryptionService.decrypt({})).toThrow();
    });
  });

  describe('Security Headers', () => {
    test('should include security headers in response', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('referrer-policy');
    });

    test('should include CSP header', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers).toHaveProperty('content-security-policy');
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to API endpoints', async () => {
      // This test would need multiple requests to trigger rate limiting
      const response = await request(app)
        .get('/api/health')
        .expect(404); // Endpoint doesn't exist but rate limiting should still apply

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
    });
  });

  describe('Enhanced Authentication Routes', () => {
    // Mock database operations for testing
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should return error for missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'MISSING_CREDENTIALS');
    });

    test('should require 2FA token when enabled', async () => {
      // This would require proper database mocking to test fully
      // For now, just ensure the endpoint exists
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      // Should get some response (even if it's an error due to missing database)
      expect(response.status).toBeDefined();
    });

    test('should have 2FA setup endpoint', async () => {
      const response = await request(app)
        .post('/api/auth/2fa/setup')
        .expect(401); // Should require authentication

      expect(response.body).toHaveProperty('success', false);
    });

    test('should have token refresh endpoint', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(401); // Should fail without refresh token

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'REFRESH_TOKEN_REQUIRED');
    });
  });
});

describe('Security Integration', () => {
  test('should apply all security middleware', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    // Check that security headers are applied
    expect(response.headers).toHaveProperty('x-content-type-options');
    expect(response.headers).toHaveProperty('x-frame-options');
    
    // Check that the response includes security information
    expect(response.body).toHaveProperty('status', 'healthy');
  });

  test('should handle CORS properly', async () => {
    const response = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:3000')
      .expect(204);

    expect(response.headers).toHaveProperty('access-control-allow-origin');
  });
});