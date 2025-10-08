/**
 * Unit tests for export service
 */

const exportService = require('../../src/main/services/export');

describe('Export Service', () => {
  const sampleData = [
    {
      id: 1,
      url: 'https://example.com/1',
      title: 'Item 1',
      description: 'Description 1',
      image: 'image1.jpg',
      price: '$10',
      verified: true,
      created_at: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 2,
      url: 'https://example.com/2',
      title: 'Item 2',
      description: 'Description 2',
      image: 'image2.jpg',
      price: '$20',
      verified: false,
      created_at: '2024-01-02T00:00:00.000Z',
    },
  ];

  describe('toJSON', () => {
    test('converts data to JSON string', () => {
      const json = exportService.toJSON(sampleData);
      expect(typeof json).toBe('string');
      expect(JSON.parse(json)).toEqual(sampleData);
    });

    test('formats JSON with indentation', () => {
      const json = exportService.toJSON(sampleData);
      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });
  });

  describe('toCSV', () => {
    test('converts data to CSV format', () => {
      const csv = exportService.toCSV(sampleData);
      expect(typeof csv).toBe('string');
      expect(csv).toContain('ID,URL,Title');
    });

    test('includes all required headers', () => {
      const csv = exportService.toCSV(sampleData);
      expect(csv).toContain('ID');
      expect(csv).toContain('URL');
      expect(csv).toContain('Title');
      expect(csv).toContain('Description');
      expect(csv).toContain('Image');
      expect(csv).toContain('Price');
      expect(csv).toContain('Verified');
      expect(csv).toContain('Created At');
    });

    test('escapes quotes in values', () => {
      const dataWithQuotes = [{
        id: 1,
        title: 'Item with "quotes"',
        description: 'Description',
        url: '',
        image: '',
        price: '',
        verified: false,
        created_at: '2024-01-01T00:00:00.000Z',
      }];

      const csv = exportService.toCSV(dataWithQuotes);
      expect(csv).toContain('""quotes""');
    });

    test('converts verified boolean to Yes/No', () => {
      const csv = exportService.toCSV(sampleData);
      expect(csv).toContain('Yes');
      expect(csv).toContain('No');
    });
  });
});
