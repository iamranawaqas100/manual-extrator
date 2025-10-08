/**
 * Unit tests for security utilities
 */

const security = require('../../src/main/utils/security');

describe('Security Utilities', () => {
  describe('sanitizeHtml', () => {
    test('escapes HTML special characters', () => {
      expect(security.sanitizeHtml('<script>alert("xss")</script>'))
        .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });

    test('handles null/undefined', () => {
      expect(security.sanitizeHtml(null)).toBe('');
      expect(security.sanitizeHtml(undefined)).toBe('');
    });

    test('escapes quotes', () => {
      expect(security.sanitizeHtml('"test"')).toBe('&quot;test&quot;');
      expect(security.sanitizeHtml("'test'")).toBe('&#x27;test&#x27;');
    });
  });

  describe('sanitizeUrl', () => {
    test('allows http and https', () => {
      expect(security.sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(security.sanitizeUrl('http://example.com')).toBe('http://example.com');
    });

    test('blocks javascript: protocol', () => {
      // eslint-disable-next-line no-script-url
      expect(security.sanitizeUrl('javascript:alert(1)')).toBe('');
    });

    test('blocks data: protocol', () => {
      expect(security.sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    });

    test('blocks vbscript: protocol', () => {
      expect(security.sanitizeUrl('vbscript:alert(1)')).toBe('');
    });

    test('blocks file: protocol', () => {
      expect(security.sanitizeUrl('file:///etc/passwd')).toBe('');
    });
  });

  describe('sanitizeFilePath', () => {
    test('removes path traversal attempts', () => {
      expect(security.sanitizeFilePath('../../../etc/passwd')).toBe('etc/passwd');
    });

    test('removes dangerous characters', () => {
      expect(security.sanitizeFilePath('file<>:"|?*.txt')).toBe('file.txt');
    });
  });

  describe('isValidEmail', () => {
    test('validates correct emails', () => {
      expect(security.isValidEmail('test@example.com')).toBe(true);
      expect(security.isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    test('rejects invalid emails', () => {
      expect(security.isValidEmail('invalid')).toBe(false);
      expect(security.isValidEmail('test@')).toBe(false);
      expect(security.isValidEmail('@example.com')).toBe(false);
      expect(security.isValidEmail('')).toBe(false);
      expect(security.isValidEmail(null)).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    test('validates http/https URLs', () => {
      expect(security.isValidUrl('https://example.com')).toBe(true);
      expect(security.isValidUrl('http://example.com')).toBe(true);
    });

    test('rejects invalid URLs', () => {
      expect(security.isValidUrl('not a url')).toBe(false);
      // eslint-disable-next-line no-script-url
      expect(security.isValidUrl('javascript:alert(1)')).toBe(false);
      expect(security.isValidUrl('')).toBe(false);
      expect(security.isValidUrl(null)).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    test('rejects weak passwords', () => {
      expect(security.validatePasswordStrength('').valid).toBe(false);
      expect(security.validatePasswordStrength('short').valid).toBe(false);
      expect(security.validatePasswordStrength('alllowercase123').valid).toBe(false);
      expect(security.validatePasswordStrength('ALLUPPERCASE123').valid).toBe(false);
      expect(security.validatePasswordStrength('NoNumbers!').valid).toBe(false);
    });

    test('accepts strong passwords', () => {
      expect(security.validatePasswordStrength('StrongPass123').valid).toBe(true);
      expect(security.validatePasswordStrength('MyP@ssw0rd').valid).toBe(true);
    });
  });

  describe('sanitizeForLogging', () => {
    test('redacts sensitive fields', () => {
      const obj = {
        username: 'user',
        password: 'secret123',
        apiKey: 'abc123',
        data: 'public',
      };

      const sanitized = security.sanitizeForLogging(obj);

      expect(sanitized.username).toBe('user');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.data).toBe('public');
    });

    test('handles nested objects', () => {
      const obj = {
        user: {
          name: 'John',
          token: 'secret',
        },
      };

      const sanitized = security.sanitizeForLogging(obj);

      expect(sanitized.user.name).toBe('John');
      expect(sanitized.user.token).toBe('[REDACTED]');
    });
  });
});
