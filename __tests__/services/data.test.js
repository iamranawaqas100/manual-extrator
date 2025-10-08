/**
 * Unit tests for data service
 */

const dataService = require('../../src/main/services/data');

describe('Data Service', () => {
  beforeEach(() => {
    // Initialize fresh storage before each test
    dataService.initializeStorage();
  });

  describe('initializeStorage', () => {
    test('initializes empty storage', () => {
      dataService.initializeStorage();
      const data = dataService.getAllData();
      expect(data).toEqual([]);
    });
  });

  describe('saveData', () => {
    test('saves new item with auto-increment ID', () => {
      const item = {
        url: 'https://example.com',
        title: 'Test Item',
        description: 'Test Description',
        image: 'test.jpg',
        price: '$10',
      };

      const saved = dataService.saveData(item);

      expect(saved.id).toBe(1);
      expect(saved.title).toBe('Test Item');
      expect(saved.verified).toBe(false);
      expect(saved.created_at).toBeDefined();
      expect(saved.updated_at).toBeDefined();
    });

    test('increments ID for multiple items', () => {
      const item1 = { title: 'Item 1' };
      const item2 = { title: 'Item 2' };

      const saved1 = dataService.saveData(item1);
      const saved2 = dataService.saveData(item2);

      expect(saved1.id).toBe(1);
      expect(saved2.id).toBe(2);
    });

    test('adds timestamps', () => {
      const item = { title: 'Test' };
      const saved = dataService.saveData(item);

      expect(saved.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(saved.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('getAllData', () => {
    test('returns empty array initially', () => {
      const data = dataService.getAllData();
      expect(data).toEqual([]);
    });

    test('returns all saved items', () => {
      dataService.saveData({ title: 'Item 1' });
      dataService.saveData({ title: 'Item 2' });

      const data = dataService.getAllData();
      expect(data).toHaveLength(2);
    });

    test('returns items sorted by creation date (newest first)', (done) => {
      const item1 = dataService.saveData({ title: 'First' });
      // Small delay to ensure different timestamps
      setTimeout(() => {
        const item2 = dataService.saveData({ title: 'Second' });

        const data = dataService.getAllData();
        expect(data[0].id).toBe(item2.id);
        expect(data[1].id).toBe(item1.id);
        done();
      }, 10);
    });
  });

  describe('updateData', () => {
    test('updates existing item', () => {
      const saved = dataService.saveData({ title: 'Original' });

      const updated = dataService.updateData(saved.id, {
        title: 'Updated',
        verified: true,
      });

      expect(updated.title).toBe('Updated');
      expect(updated.verified).toBe(true);
    });

    test('throws error for non-existent ID', () => {
      expect(() => {
        dataService.updateData(999, { title: 'Test' });
      }).toThrow('Item with id 999 not found');
    });

    test('updates timestamp', () => {
      const saved = dataService.saveData({ title: 'Test' });
      const originalTimestamp = saved.updated_at;

      // Small delay
      setTimeout(() => {
        const updated = dataService.updateData(saved.id, { title: 'Updated' });
        expect(updated.updated_at).not.toBe(originalTimestamp);
      }, 10);
    });
  });

  describe('deleteData', () => {
    test('deletes existing item', () => {
      const saved = dataService.saveData({ title: 'Test' });

      const result = dataService.deleteData(saved.id);
      expect(result).toBe(true);

      const data = dataService.getAllData();
      expect(data).toHaveLength(0);
    });

    test('throws error for non-existent ID', () => {
      expect(() => {
        dataService.deleteData(999);
      }).toThrow('Item with id 999 not found');
    });
  });

  describe('clearAllData', () => {
    test('clears all data', () => {
      dataService.saveData({ title: 'Item 1' });
      dataService.saveData({ title: 'Item 2' });

      dataService.clearAllData();

      const data = dataService.getAllData();
      expect(data).toEqual([]);
    });
  });
});
