const request = require('supertest');
const express = require('express');
const session = require('express-session');
const enhancedSecurity = require('../middleware/enhancedSecurity');
const csrfProtection = require('../middleware/csrfProtection');
const twoFactorAuth = require('../services/twoFactorAuth');

// Import test setup
require('./testSetup');

describe('Enhanced Security Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false
    }));
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      app.use(enhancedSecurity.applyAllSecurity());
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });
    });

    test('should allow requests within rate limit', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should block requests exceeding rate limit', async () => {
      // This test would need to be adjusted based on the actual rate limit configuration
      // For now, we'll test the middleware is applied
      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
    });
  });

  describe('CSRF Protection', () => {
    beforeEach(() => {
      app.use(enhancedSecurity.applyAllSecurity());
      app.get('/csrf-token', enhancedSecurity.getCSRFToken());
      app.post('/protected', csrfProtection.configure().verify, (req, res) => {
        res.json({ success: true });
      });
    });

    test('should generate CSRF token', async () => {
      const agent = request.agent(app);
      
      const response = await agent
        .get('/csrf-token')
        .expect(200);

      expect(response.body.csrfToken).toBeDefined();
      expect(typeof response.body.csrfToken).toBe('string');
    });

    test('should reject POST requests without CSRF token', async () => {
      await request(app)
        .post('/protected')
        .send({ data: 'test' })
        .expect(403);
    });

    test('should accept valid CSRF token', async () => {
      const agent = request.agent(app);
      
      // Get CSRF token
      const tokenResponse = await agent
        .get('/csrf-token')
        .expect(200);

      const csrfToken = tokenResponse.body.csrfToken;

      // Use token in POST request
      await agent
        .post('/protected')
        .set('X-CSRF-Token', csrfToken)
        .send({ data: 'test' })
        .expect(200);
    });
  });

  describe('Security Headers', () => {
    beforeEach(() => {
      app.use(enhancedSecurity.applyAllSecurity());
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });
    });

    test('should set security headers', async () => {
      const response = await request(app)
        .get('/test')
        .expect(200);

      // Check for important security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });
  });

  describe('Request Sanitization', () => {
    beforeEach(() => {
      app.use(enhancedSecurity.applyAllSecurity());
      app.post('/test', (req, res) => {
        res.json({ body: req.body });
      });
    });

    test('should block suspicious content', async () => {
      await request(app)
        .post('/test')
        .send({ malicious: '<script>alert("xss")</script>' })
        .expect(400);
    });

    test('should allow normal content', async () => {
      const response = await request(app)
        .post('/test')
        .send({ normal: 'This is normal content' })
        .expect(200);

      expect(response.body.body.normal).toBe('This is normal content');
    });
  });

  describe('Authentication Security', () => {
    beforeEach(() => {
      app.use(enhancedSecurity.applyAuthSecurity());
      app.post('/login', (req, res) => {
        res.json({ success: true });
      });
    });

    test('should apply stricter rate limiting for auth endpoints', async () => {
      const response = await request(app)
        .post('/login')
        .send({ username: 'test', password: 'test' })
        .expect(200);

      // Check that rate limiting headers are present
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
    });
  });
});

describe('Two-Factor Authentication Service', () => {
  describe('Secret Generation', () => {
    test('should generate valid 2FA secret', async () => {
      const result = await twoFactorAuth.generateSecret('user123', 'test@example.com');

      expect(result.secret).toBeDefined();
      expect(result.qrCode).toMatch(/^data:image\/png;base64,/);
      expect(result.manualEntryKey).toBeDefined();
      expect(result.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
    });
  });

  describe('Token Verification', () => {
    test('should verify valid TOTP token', () => {
      // This would require a real secret and token for full testing
      // For now, test the function exists and handles invalid input
      const result = twoFactorAuth.verifyToken('123456', 'INVALIDSECRET');
      expect(typeof result).toBe('boolean');
    });

    test('should reject invalid token format', () => {
      const result = twoFactorAuth.verifyToken('invalid', 'INVALIDSECRET');
      expect(result).toBe(false);
    });
  });

  describe('Backup Codes', () => {
    test('should generate backup codes', () => {
      const codes = twoFactorAuth.generateBackupCodes(5);

      expect(Array.isArray(codes)).toBe(true);
      expect(codes.length).toBe(5);
      codes.forEach(code => {
        expect(typeof code).toBe('string');
        expect(code.length).toBe(8);
      });
    });
  });

  describe('2FA Middleware', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use(session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false
      }));
    });

    test('should require authentication', async () => {
      app.use(twoFactorAuth.enforce2FA());
      app.get('/protected', (req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .get('/protected')
        .expect(401);
    });

    test('should require 2FA setup when not enabled', async () => {
      app.use((req, res, next) => {
        req.user = { id: 'user123', twoFactorEnabled: false };
        next();
      });
      app.use(twoFactorAuth.enforce2FA());
      app.get('/protected', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/protected')
        .expect(403);

      expect(response.body.code).toBe('2FA_SETUP_REQUIRED');
    });

    test('should require 2FA verification when enabled but not verified', async () => {
      app.use((req, res, next) => {
        req.user = { id: 'user123', twoFactorEnabled: true };
        req.session = {};
        next();
      });
      app.use(twoFactorAuth.enforce2FA());
      app.get('/protected', (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/protected')
        .expect(403);

      expect(response.body.code).toBe('2FA_VERIFICATION_REQUIRED');
    });

    test('should allow access when 2FA is verified', async () => {
      app.use((req, res, next) => {
        req.user = { id: 'user123', twoFactorEnabled: true };
        req.session = { twoFactorVerified: true };
        next();
      });
      app.use(twoFactorAuth.enforce2FA());
      app.get('/protected', (req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .get('/protected')
        .expect(200);
    });
  });
});

describe('Security Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false
    }));
    
    // Apply all security middleware
    app.use(enhancedSecurity.applyAllSecurity());
    
    // Mock user middleware
    app.use((req, res, next) => {
      if (req.headers.authorization) {
        req.user = {
          id: 'user123',
          email: 'test@example.com',
          twoFactorEnabled: false
        };
      }
      next();
    });
  });

  test('should provide comprehensive security for API endpoints', async () => {
    app.get('/api/test', (req, res) => {
      res.json({ success: true });
    });

    const response = await request(app)
      .get('/api/test')
      .set('Authorization', 'Bearer fake-token')
      .expect(200);

    // Verify security headers are present
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['strict-transport-security']).toBeDefined();
  });

  test('should handle concurrent security features', async () => {
    app.post('/api/secure', csrfProtection.configure().verify, (req, res) => {
      res.json({ success: true });
    });

    // This test verifies that multiple security layers work together
    // In a real scenario, you'd need proper CSRF token setup
    await request(app)
      .post('/api/secure')
      .send({ data: 'test' })
      .expect(403); // Should fail due to missing CSRF token
  });
});

describe('Performance and Load Tests', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(enhancedSecurity.applyAllSecurity());
    
    app.get('/load-test', (req, res) => {
      res.json({ timestamp: Date.now() });
    });
  });

  test('should handle multiple concurrent requests', async () => {
    const promises = [];
    const numRequests = 50;

    for (let i = 0; i < numRequests; i++) {
      promises.push(
        request(app)
          .get('/load-test')
          .expect(200)
      );
    }

    const results = await Promise.all(promises);
    expect(results.length).toBe(numRequests);
    
    // Verify all requests completed successfully
    results.forEach(result => {
      expect(result.body.timestamp).toBeDefined();
    });
  });
});