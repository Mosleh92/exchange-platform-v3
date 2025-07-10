const EnvironmentValidationService = require('../services/environmentValidationService');

describe('Environment Validation Service (Unit Tests)', () => {
    let originalEnv;

    beforeEach(() => {
        // Save original environment
        originalEnv = { ...process.env };
    });

    afterEach(() => {
        // Restore original environment
        process.env = originalEnv;
    });

    describe('JWT Secret Validation', () => {
        test('should fail with missing JWT_SECRET', () => {
            delete process.env.JWT_SECRET;
            
            const validator = new EnvironmentValidationService();
            const result = validator.validateJWTConfiguration();
            
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('JWT_SECRET environment variable is required');
        });

        test('should fail with default JWT_SECRET in production', () => {
            process.env.NODE_ENV = 'production';
            process.env.JWT_SECRET = 'your-secret-key-here';
            
            const validator = new EnvironmentValidationService();
            const result = validator.validateJWTConfiguration();
            
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('JWT_SECRET cannot use default value in production environment');
        });

        test('should warn with default JWT_SECRET in development', () => {
            process.env.NODE_ENV = 'development';
            process.env.JWT_SECRET = 'your-secret-key-here';
            
            const validator = new EnvironmentValidationService();
            const result = validator.validateJWTConfiguration();
            
            expect(result.warnings).toContain('JWT_SECRET is using a default value - change for production');
        });

        test('should fail with short JWT_SECRET', () => {
            process.env.JWT_SECRET = 'short';
            
            const validator = new EnvironmentValidationService();
            const result = validator.validateJWTConfiguration();
            
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('JWT_SECRET must be at least 32 characters long for security');
        });

        test('should pass with secure JWT_SECRET', () => {
            process.env.JWT_SECRET = 'this-is-a-very-secure-jwt-secret-with-at-least-32-characters-long';
            
            const validator = new EnvironmentValidationService();
            const result = validator.validateJWTConfiguration();
            
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });

    describe('Generate Secure Secret', () => {
        test('should generate secure random secret', () => {
            const secret = EnvironmentValidationService.generateSecureSecret();
            
            expect(secret).toHaveLength(128); // 64 bytes = 128 hex chars
            expect(secret).toMatch(/^[a-f0-9]+$/); // Only hex characters
        });

        test('should generate secret with custom length', () => {
            const secret = EnvironmentValidationService.generateSecureSecret(32);
            
            expect(secret).toHaveLength(64); // 32 bytes = 64 hex chars
        });
    });
});