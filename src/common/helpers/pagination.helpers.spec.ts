import {
  createEmptyPaginatedResult,
  createPaginatedResult,
} from './pagination.helpers';
import { PaginationDto } from '../dto/pagination.dto';

describe('Pagination Helpers', () => {
  describe('createEmptyPaginatedResult', () => {
    it('should create an empty result with default pagination', () => {
      const emptyPagination: PaginationDto = {};
      const result = createEmptyPaginatedResult<any>(emptyPagination);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.pages).toBe(0);
    });

    it('should create an empty result with custom pagination', () => {
      const customPagination: PaginationDto = { page: 3, limit: 25 };
      const result = createEmptyPaginatedResult<any>(customPagination);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(3);
      expect(result.limit).toBe(25);
      expect(result.pages).toBe(0);
    });

    it('should handle null or undefined pagination', () => {
      const resultWithNull = createEmptyPaginatedResult<any>(null);
      expect(resultWithNull.data).toEqual([]);
      expect(resultWithNull.page).toBe(1);
      expect(resultWithNull.limit).toBe(10);
      expect(resultWithNull.pages).toBe(0);

      const resultWithUndefined = createEmptyPaginatedResult<any>(undefined);
      expect(resultWithUndefined.data).toEqual([]);
      expect(resultWithUndefined.page).toBe(1);
      expect(resultWithUndefined.limit).toBe(10);
      expect(resultWithUndefined.pages).toBe(0);

      const resultWithEmptyObject = createEmptyPaginatedResult<any>({});
      expect(resultWithEmptyObject.data).toEqual([]);
      expect(resultWithEmptyObject.page).toBe(1);
      expect(resultWithEmptyObject.limit).toBe(10);
      expect(resultWithEmptyObject.pages).toBe(0);
    });
  });

  describe('createPaginatedResult', () => {
    it('should create a paginated result with data', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const total = 10;
      const pagination: PaginationDto = { page: 1, limit: 2 };

      const result = createPaginatedResult(items, total, pagination);

      expect(result.data).toEqual(items);
      expect(result.data.length).toBe(2);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.pages).toBe(5);
    });

    it('should handle the last page with fewer items', () => {
      const items = [{ id: 21 }];
      const total = 21;
      const pagination: PaginationDto = { page: 3, limit: 10 };

      const result = createPaginatedResult(items, total, pagination);

      expect(result.data.length).toBe(1);
      expect(result.total).toBe(21);
      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.pages).toBe(3);
    });

    it('should calculate correct page count for exact division', () => {
      const items = createTestItems(10);
      const total = 100;
      const pagination: PaginationDto = { page: 1, limit: 10 };

      const result = createPaginatedResult(items, total, pagination);

      expect(result.pages).toBe(10);
    });

    it('should use default pagination when not provided', () => {
      const items = createTestItems(5);
      const total = 5;

      const result = createPaginatedResult(items, total, {});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.pages).toBe(1);
    });

    it('should handle empty items array', () => {
      const items: any[] = [];
      const total = 0;
      const pagination: PaginationDto = { page: 1, limit: 10 };

      const result = createPaginatedResult(items, total, pagination);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.pages).toBe(0);
    });

    it('should round up page count for fractional results', () => {
      const items = createTestItems(3);
      const total = 11;
      const pagination: PaginationDto = { page: 1, limit: 5 };

      const result = createPaginatedResult(items, total, pagination);

      expect(result.pages).toBe(3);
    });
  });
});

/**
 * Helper function to create test items
 */
function createTestItems(count: number): any[] {
  const items: any[] = [];
  for (let i = 0; i < count; i++) {
    items.push({ id: i, value: `test-${i}` });
  }
  return items;
}
