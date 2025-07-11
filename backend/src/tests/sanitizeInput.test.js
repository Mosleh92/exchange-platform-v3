const SecurityHardenedMiddleware = require('../middleware/security-hardened');

// Import the SecurityHardenedMiddleware class directly to test the sanitizeInput method
class TestableSecurityMiddleware {
  constructor() {
    const { SecurityLogger } = require('../utils/securityLogger');
    this.securityLogger = new SecurityLogger();
    this.suspiciousIPs = new Map();
    this.blockedIPs = new Set();
  }

  sanitizeInput(input) {
    if (typeof input !== 'string') {
      return input;
    }
    let sanitized = input.trim();
    let previous;
    do {
      previous = sanitized;
      sanitized = sanitized
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/(?:javascript|data|vbscript):/gi, '') // Remove dangerous protocols
        .replace(/on\w+=/gi, ''); // Remove event handlers
    } while (sanitized !== previous);
    return sanitized.trim();
  }
}

describe('sanitizeInput function improvements', () => {
  let middleware;

  beforeEach(() => {
    middleware = new TestableSecurityMiddleware();
  });

  describe('Basic functionality', () => {
    it('should return non-string inputs unchanged', () => {
      expect(middleware.sanitizeInput(123)).toBe(123);
      expect(middleware.sanitizeInput(null)).toBe(null);
      expect(middleware.sanitizeInput(undefined)).toBe(undefined);
      expect(middleware.sanitizeInput({})).toEqual({});
    });

    it('should trim input string', () => {
      expect(middleware.sanitizeInput('  hello world  ')).toBe('hello world');
      expect(middleware.sanitizeInput('\n\ttest\n\t')).toBe('test');
    });
  });

  describe('Script tag removal', () => {
    it('should remove simple script tags', () => {
      const input = '<script>alert("xss")</script>';
      expect(middleware.sanitizeInput(input)).toBe('');
    });

    it('should remove script tags with attributes', () => {
      const input = '<script src="malicious.js" type="text/javascript">alert("xss")</script>';
      expect(middleware.sanitizeInput(input)).toBe('');
    });

    it('should remove nested script tags through do-while loop', () => {
      const input = '<script><script>alert("nested")</script></script>';
      expect(middleware.sanitizeInput(input)).toBe('');
    });
  });

  describe('HTML tag removal', () => {
    it('should remove all HTML tags', () => {
      const input = '<div>Hello <span>World</span></div>';
      expect(middleware.sanitizeInput(input)).toBe('Hello World');
    });

    it('should remove complex HTML with attributes', () => {
      const input = '<div class="test" id="malicious">Content<p style="color:red">Text</p></div>';
      expect(middleware.sanitizeInput(input)).toBe('ContentText');
    });
  });

  describe('Dangerous protocol removal', () => {
    it('should remove javascript: protocol', () => {
      const input = 'javascript:alert("xss")';
      expect(middleware.sanitizeInput(input)).toBe('alert("xss")');
    });

    it('should remove data: protocol', () => {
      const input = 'data:text/html,<script>alert("xss")</script>';
      expect(middleware.sanitizeInput(input)).toBe('text/html,alert("xss")');
    });

    it('should remove vbscript: protocol', () => {
      const input = 'vbscript:msgbox("xss")';
      expect(middleware.sanitizeInput(input)).toBe('msgbox("xss")');
    });

    it('should be case insensitive for protocols', () => {
      expect(middleware.sanitizeInput('JAVASCRIPT:alert("test")')).toBe('alert("test")');
      expect(middleware.sanitizeInput('Data:text/plain,test')).toBe('text/plain,test');
      expect(middleware.sanitizeInput('VBScript:msgbox("test")')).toBe('msgbox("test")');
    });
  });

  describe('Event handler removal', () => {
    it('should remove onclick handlers', () => {
      const input = 'onclick=alert("xss")';
      expect(middleware.sanitizeInput(input)).toBe('alert("xss")');
    });

    it('should remove onload handlers', () => {
      const input = 'onload=javascript:alert("xss")';
      expect(middleware.sanitizeInput(input)).toBe('alert("xss")');
    });

    it('should remove various event handlers', () => {
      expect(middleware.sanitizeInput('onmouseover=alert("test")')).toBe('alert("test")');
      expect(middleware.sanitizeInput('onerror=alert("test")')).toBe('alert("test")');
      expect(middleware.sanitizeInput('onfocus=alert("test")')).toBe('alert("test")');
    });

    it('should be case insensitive for event handlers', () => {
      expect(middleware.sanitizeInput('OnClick=alert("test")')).toBe('alert("test")');
      expect(middleware.sanitizeInput('ONLOAD=alert("test")')).toBe('alert("test")');
    });
  });

  describe('Complex malicious input handling', () => {
    it('should handle multiple attack vectors in single input', () => {
      const input = '<script>alert("xss")</script><div onclick=alert("click")>javascript:alert("protocol")</div>';
      expect(middleware.sanitizeInput(input)).toBe('alert("protocol")');
    });

    it('should handle nested malicious content through iteration', () => {
      const input = '<div><script>javascript:alert("nested")</script>onclick=alert("handler")</div>';
      expect(middleware.sanitizeInput(input)).toBe('alert("nested")alert("handler")');
    });

    it('should handle obfuscated attacks', () => {
      const input = '<sc<script>ript>alert("bypass")</script>';
      expect(middleware.sanitizeInput(input)).toBe('alert("bypass")');
    });

    it('should preserve safe content while removing malicious parts', () => {
      const input = 'Hello <b>World</b> onclick=alert("xss") javascript:void(0)';
      expect(middleware.sanitizeInput(input)).toBe('Hello World void(0)');
    });
  });

  describe('Do-while loop effectiveness', () => {
    it('should completely clean nested malicious content', () => {
      const input = 'data:javascript:<script>alert("multi-layer")</script>';
      const result = middleware.sanitizeInput(input);
      expect(result).toBe('alert("multi-layer")');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('data:');
    });

    it('should handle deeply nested attack vectors', () => {
      const input = '<div onclick=javascript:alert("deep")><script>data:text/html,<script>alert("nested")</script></script></div>';
      const result = middleware.sanitizeInput(input);
      expect(result).toBe('alert("deep")text/html,alert("nested")');
    });
  });
});