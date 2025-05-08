import {
  validatePagination,
  validateSearchText,
  validateDateRange,
} from '../helpers/validation.helpers';
import { InvalidSearchParametersException } from '../exceptions/search-exceptions';

describe('Validation Helpers', () => {
  describe('validatePagination', () => {
    it('should not throw error for valid pagination parameters', () => {
      expect(() => validatePagination(1, 10)).not.toThrow();
      expect(() => validatePagination(5, 50)).not.toThrow();
      expect(() => validatePagination(100, 100)).not.toThrow();
    });

    it('should throw InvalidSearchParametersException for page < 1', () => {
      expect(() => validatePagination(0, 10)).toThrow(
        InvalidSearchParametersException,
      );
      expect(() => validatePagination(-1, 10)).toThrow(
        InvalidSearchParametersException,
      );
    });

    it('should throw InvalidSearchParametersException for limit < 1', () => {
      expect(() => validatePagination(1, 0)).toThrow(
        InvalidSearchParametersException,
      );
      expect(() => validatePagination(1, -10)).toThrow(
        InvalidSearchParametersException,
      );
    });

    it('should throw InvalidSearchParametersException for limit > 100', () => {
      expect(() => validatePagination(1, 101)).toThrow(
        InvalidSearchParametersException,
      );
      expect(() => validatePagination(1, 500)).toThrow(
        InvalidSearchParametersException,
      );
    });
  });

  describe('validateSearchText', () => {
    it('should not throw error for valid search text', () => {
      expect(() =>
        validateSearchText('smartphone', 'Product name'),
      ).not.toThrow();
      expect(() => validateSearchText('a', 'Product name')).not.toThrow();
    });

    it('should throw InvalidSearchParametersException for empty text', () => {
      expect(() => validateSearchText('', 'Product name')).toThrow(
        InvalidSearchParametersException,
      );
      expect(() => validateSearchText('   ', 'Product name')).toThrow(
        InvalidSearchParametersException,
      );
    });

    it('should throw InvalidSearchParametersException for undefined text', () => {
      expect(() => validateSearchText(undefined, 'Product name')).toThrow(
        InvalidSearchParametersException,
      );
    });
  });

  describe('validateDateRange', () => {
    it('should not throw error when at least one date is provided', () => {
      expect(() => validateDateRange('2023-01-01', undefined)).not.toThrow();
      expect(() => validateDateRange(undefined, '2023-12-31')).not.toThrow();
      expect(() => validateDateRange('2023-01-01', '2023-12-31')).not.toThrow();
    });

    it('should throw InvalidSearchParametersException when both dates are missing', () => {
      expect(() => validateDateRange(undefined, undefined)).toThrow(
        InvalidSearchParametersException,
      );
      expect(() => validateDateRange('', '')).toThrow(
        InvalidSearchParametersException,
      );
    });
  });
});
