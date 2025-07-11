// tests/simple-security.test.js - Simple Tests for Enhanced Security Features
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

// Mock mongoose for testing
jest.mock('mongoose', () => ({
  Schema: function() { return this; },
  model: jest.fn(),
  connect: jest.fn(),
  connection: {
    close: jest.fn()
  }
}));

describe('Enhanced Security Features - Unit Tests', () => {
  
  beforeAll(() => {
    // Set test environment variables
    process.env.JWT_SECRET = 'test-jwt-secret-key';
    process.env.JWT_ACCESS_SECRET = 'test-access-secret-key';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
    process.env.ENCRYPTION_KEY = 'dGVzdC1lbmNyeXB0aW9uLWtleS0zMi1ieXRlcy1sb25n';
  });

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
      expect(tokens.accessToken.split('.').length).toBe(3); // JWT has 3 parts
      expect(tokens.refreshToken.split('.').length).toBe(3);
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

    test('should generate secure cookie options', () => {
      const cookieOptions = tokenManager.getCookieOptions(true);
      
      expect(cookieOptions).toHaveProperty('httpOnly', true);
      expect(cookieOptions).toHaveProperty('secure', true);
      expect(cookieOptions).toHaveProperty('sameSite', 'strict');
      expect(cookieOptions).toHaveProperty('maxAge');
    });
  });

  describe('Two-Factor Authentication', () => {
    test('should generate 2FA secret with QR code', async () => {
      const result = await twoFactorAuthService.generateSecret('test@example.com', '507f1f77bcf86cd799439011');

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('manualEntryKey');
      expect(result.qrCode).toMatch(/^data:image\/png;base64,/);
      expect(result.secret.length).toBeGreaterThan(0);
    });

    test('should verify TOTP token with valid secret', () => {
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
        expect(code.length).toBe(8);
      });
    });

    test('should determine 2FA requirement for roles', () => {
      // Mock environment variable
      process.env.ENFORCE_2FA_FOR_ADMINS = 'true';
      
      expect(twoFactorAuthService.is2FARequired('super_admin')).toBe(true);
      expect(twoFactorAuthService.is2FARequired('tenant_admin')).toBe(true);
      expect(twoFactorAuthService.is2FARequired('customer')).toBe(false);
      expect(twoFactorAuthService.is2FARequired('staff')).toBe(false);
    });

    test('should hash backup codes consistently', () => {
      const code = 'ABCD1234';
      const hash1 = twoFactorAuthService.hashBackupCode(code);
      const hash2 = twoFactorAuthService.hashBackupCode(code);
      
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA-256 produces 64-character hex string
    });
  });

  describe('Encryption Service', () => {
    test('should encrypt and decrypt data successfully', () => {
      const plaintext = 'sensitive data';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(encrypted).toHaveProperty('encrypted');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('authTag');
      expect(encrypted).toHaveProperty('keyName');
      expect(encrypted).toHaveProperty('algorithm');
      expect(decrypted).toBe(plaintext);
    });

    test('should encrypt personal information fields', () => {
      const personalInfo = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        email: 'john@example.com', // Should not be encrypted
        dateOfBirth: '1990-01-01'
      };

      const encrypted = encryptionService.encryptPersonalInfo(personalInfo);
      
      expect(encrypted.firstName).toHaveProperty('encrypted');
      expect(encrypted.lastName).toHaveProperty('encrypted');
      expect(encrypted.phone).toHaveProperty('encrypted');
      expect(encrypted.dateOfBirth).toHaveProperty('encrypted');
      expect(encrypted.email).toBe('john@example.com'); // Not in sensitive fields
    });

    test('should encrypt and decrypt financial data', () => {
      const financialData = {
        accountNumber: '1234567890',
        balance: '1000.00',
        routingNumber: '987654321',
        description: 'Test account' // Should not be encrypted
      };

      const encrypted = encryptionService.encryptFinancialData(financialData);
      const decrypted = encryptionService.decryptFinancialData(encrypted);

      expect(encrypted.accountNumber).toHaveProperty('encrypted');
      expect(encrypted.balance).toHaveProperty('encrypted');
      expect(encrypted.routingNumber).toHaveProperty('encrypted');
      expect(encrypted.description).toBe('Test account');
      
      expect(decrypted.accountNumber).toBe('1234567890');
      expect(decrypted.balance).toBe('1000.00');
      expect(decrypted.routingNumber).toBe('987654321');
      expect(decrypted.description).toBe('Test account');
    });

    test('should encrypt API keys and secrets', () => {
      const apiData = {
        key: 'api_key_12345',
        secret: 'api_secret_67890',
        name: 'Test API', // Should not be encrypted
        token: 'bearer_token_xyz'
      };

      const encrypted = encryptionService.encryptApiKeys(apiData);
      const decrypted = encryptionService.decryptApiKeys(encrypted);

      expect(encrypted.key).toHaveProperty('encrypted');
      expect(encrypted.secret).toHaveProperty('encrypted');
      expect(encrypted.token).toHaveProperty('encrypted');
      expect(encrypted.name).toBe('Test API');

      expect(decrypted.key).toBe('api_key_12345');
      expect(decrypted.secret).toBe('api_secret_67890');
      expect(decrypted.token).toBe('bearer_token_xyz');
    });

    test('should handle encryption errors gracefully', () => {
      expect(() => encryptionService.encrypt('')).toThrow('No data provided for encryption');
      expect(() => encryptionService.decrypt({})).toThrow('Invalid encrypted data format');
      expect(() => encryptionService.decrypt({ encrypted: 'invalid' })).toThrow();
    });

    test('should verify data integrity', () => {
      const plaintext = 'test data';
      const encrypted = encryptionService.encrypt(plaintext);
      
      expect(encryptionService.verifyIntegrity(encrypted)).toBe(true);
      
      // Corrupt the data
      const corrupted = { ...encrypted, encrypted: 'corrupted' };
      expect(encryptionService.verifyIntegrity(corrupted)).toBe(false);
    });

    test('should generate encryption keys', () => {
      const key = encryptionService.generateKey();
      expect(typeof key).toBe('string');
      expect(key.length).toBe(44); // Base64 encoded 32-byte key
      expect(key).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 pattern
    });

    test('should hash data consistently', () => {
      const data = 'test data';
      const hash1 = encryptionService.hashData(data);
      const hash2 = encryptionService.hashData(data);
      
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA-256 hex string
    });
  });

  describe('Security Configuration', () => {
    test('should have proper environment variables set', () => {
      expect(process.env.JWT_SECRET).toBeDefined();
      expect(process.env.JWT_ACCESS_SECRET).toBeDefined();
      expect(process.env.JWT_REFRESH_SECRET).toBeDefined();
      expect(process.env.ENCRYPTION_KEY).toBeDefined();
    });

    test('should use different secrets for access and refresh tokens', () => {
      expect(process.env.JWT_ACCESS_SECRET).not.toBe(process.env.JWT_REFRESH_SECRET);
      expect(process.env.JWT_ACCESS_SECRET).not.toBe(process.env.JWT_SECRET);
    });
  });
});