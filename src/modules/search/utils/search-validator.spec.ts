import { SearchValidator } from './search-validator.util';
import {
  InvalidDateRangeException,
  InvalidItemsQueryException,
} from '../exceptions/search-exceptions';

describe('SearchValidator', () => {
  describe('validateDateRange', () => {
    it('should not throw for valid date range', () => {
      const validRanges = [
        { from: '2023-01-01', to: '2023-12-31' },
        { from: '2023-01-01' },
        { to: '2023-12-31' },
      ];

      validRanges.forEach((range) => {
        expect(() => SearchValidator.validateDateRange(range)).not.toThrow();
      });
    });

    it('should throw for empty date range', () => {
      expect(() => SearchValidator.validateDateRange({})).toThrow(
        InvalidDateRangeException,
      );
    });

    it('should throw for invalid from date format', () => {
      expect(() =>
        SearchValidator.validateDateRange({ from: '01-01-2023' }),
      ).toThrow(InvalidDateRangeException);
    });

    it('should throw for invalid to date format', () => {
      expect(() =>
        SearchValidator.validateDateRange({ to: '31-12-2023' }),
      ).toThrow(InvalidDateRangeException);
    });
  });

  describe('validateAndParseItemsQuery', () => {
    it('should return array of items for valid query', () => {
      const result =
        SearchValidator.validateAndParseItemsQuery('item1,item2, item3');
      expect(result).toEqual(['item1', 'item2', 'item3']);
    });

    it('should throw for empty query', () => {
      expect(() => SearchValidator.validateAndParseItemsQuery('')).toThrow(
        InvalidItemsQueryException,
      );
    });

    it('should throw for query with only spaces or commas', () => {
      expect(() => SearchValidator.validateAndParseItemsQuery('  , ')).toThrow(
        InvalidItemsQueryException,
      );
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid date formats', () => {
      const validDates = ['2023-01-01', '2023-12-31', '2023-02-28'];
      validDates.forEach((date) => {
        expect(SearchValidator.isValidDate(date)).toBe(true);
      });
    });

    it('should return false for invalid date formats', () => {
      const invalidDates = [
        '01-01-2023',
        '2023/01/01',
        '01/01/2023',
        'not-a-date',
      ];
      invalidDates.forEach((date) => {
        expect(SearchValidator.isValidDate(date)).toBe(false);
      });
    });

    it('should return false for invalid dates', () => {
      const invalidDates = ['2023-02-30', '2023-13-01'];
      invalidDates.forEach((date) => {
        expect(SearchValidator.isValidDate(date)).toBe(false);
      });
    });
  });

  describe('getDateRangeDescription', () => {
    it('should format date range with from and to', () => {
      const range = { from: '2023-01-01', to: '2023-12-31' };
      expect(SearchValidator.getDateRangeDescription(range)).toBe(
        'from 2023-01-01 to 2023-12-31',
      );
    });

    it('should format date range with only from', () => {
      const range = { from: '2023-01-01' };
      expect(SearchValidator.getDateRangeDescription(range)).toBe(
        'from 2023-01-01',
      );
    });

    it('should format date range with only to', () => {
      const range = { to: '2023-12-31' };
      expect(SearchValidator.getDateRangeDescription(range)).toBe(
        'until 2023-12-31',
      );
    });

    it('should return default message for empty range', () => {
      const range = {};
      expect(SearchValidator.getDateRangeDescription(range)).toBe(
        '(unspecified)',
      );
    });
  });
});
