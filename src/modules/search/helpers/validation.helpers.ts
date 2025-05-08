import { InvalidSearchParametersException } from '../exceptions/search-exceptions';

/**
 * Validates pagination parameters
 */
export function validatePagination(page: number, limit: number): void {
  if (page < 1 || limit < 1 || limit > 100) {
    throw new InvalidSearchParametersException(
      'Page must be >= 1 and limit must be between 1 and 100',
    );
  }
}

/**
 * Validates that a text search parameter is not empty
 */
export function validateSearchText(text: string, paramName: string): void {
  if (!text || text.trim() === '') {
    throw new InvalidSearchParametersException(
      `${paramName} search text must not be empty`,
    );
  }
}

/**
 * Validates that at least one date parameter is provided
 */
export function validateDateRange(from?: string, to?: string): void {
  if (!from && !to) {
    throw new InvalidSearchParametersException(
      'At least one date parameter (from or to) must be provided',
    );
  }
}
