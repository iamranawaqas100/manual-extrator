/**
 * Unit tests for validation utilities
 */

describe('Validation Utilities', () => {
  // Helper functions from renderer
  const isEmpty = (str) => !str || str.trim().length === 0;

  const normalizeUrl = (url) => {
    if (!url) return '';
    const trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  const isItemEmpty = (item) => {
    const contentFields = ['title', 'description', 'image', 'price'];
    return contentFields.every((field) => isEmpty(item[field]));
  };

  describe('isEmpty', () => {
    test('returns true for null', () => {
      expect(isEmpty(null)).toBe(true);
    });

    test('returns true for undefined', () => {
      expect(isEmpty(undefined)).toBe(true);
    });

    test('returns true for empty string', () => {
      expect(isEmpty('')).toBe(true);
    });

    test('returns true for whitespace only', () => {
      expect(isEmpty('   ')).toBe(true);
      expect(isEmpty('\t\n')).toBe(true);
    });

    test('returns false for non-empty string', () => {
      expect(isEmpty('hello')).toBe(false);
      expect(isEmpty(' hello ')).toBe(false);
    });
  });

  describe('normalizeUrl', () => {
    test('adds https to bare URLs', () => {
      expect(normalizeUrl('example.com')).toBe('https://example.com');
    });

    test('adds https to www URLs', () => {
      expect(normalizeUrl('www.example.com')).toBe('https://www.example.com');
    });

    test('preserves http protocol', () => {
      expect(normalizeUrl('http://example.com')).toBe('http://example.com');
    });

    test('preserves https protocol', () => {
      expect(normalizeUrl('https://example.com')).toBe('https://example.com');
    });

    test('handles null/undefined', () => {
      expect(normalizeUrl(null)).toBe('');
      expect(normalizeUrl(undefined)).toBe('');
    });

    test('trims whitespace', () => {
      expect(normalizeUrl('  example.com  ')).toBe('https://example.com');
    });

    test('handles URLs with paths', () => {
      expect(normalizeUrl('example.com/path')).toBe('https://example.com/path');
    });
  });

  describe('isItemEmpty', () => {
    test('returns true for completely empty item', () => {
      const item = {
        title: '', description: '', image: '', price: '',
      };
      expect(isItemEmpty(item)).toBe(true);
    });

    test('returns true for item with only whitespace', () => {
      const item = {
        title: '  ', description: '\n', image: '', price: '\t',
      };
      expect(isItemEmpty(item)).toBe(true);
    });

    test('returns false if title has content', () => {
      const item = {
        title: 'Test', description: '', image: '', price: '',
      };
      expect(isItemEmpty(item)).toBe(false);
    });

    test('returns false if any field has content', () => {
      const item = {
        title: '', description: '', image: '', price: '$10',
      };
      expect(isItemEmpty(item)).toBe(false);
    });

    test('returns false if all fields have content', () => {
      const item = {
        title: 'Product',
        description: 'Description',
        image: 'image.jpg',
        price: '$10',
      };
      expect(isItemEmpty(item)).toBe(false);
    });
  });
});
