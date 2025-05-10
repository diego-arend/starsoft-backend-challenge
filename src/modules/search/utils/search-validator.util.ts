import {
  InvalidDateRangeException,
  InvalidItemsQueryException,
} from '../exceptions/search-exceptions';
import { DateRangeParams } from '../types/search.types';

/**
 * Utility class for search validations
 */
export class SearchValidator {
  /**
   * Validates date range parameters
   * @param dateRange Date range parameters to validate
   * @throws InvalidDateRangeException if the date range is invalid
   */
  static validateDateRange(dateRange: DateRangeParams): void {
    if (!dateRange.from && !dateRange.to) {
      throw new InvalidDateRangeException(
        'At least one date (from or to) must be provided',
      );
    }

    if (dateRange.from && !this.isValidDate(dateRange.from)) {
      throw new InvalidDateRangeException(
        `Invalid 'from' date format: ${dateRange.from}`,
      );
    }

    if (dateRange.to && !this.isValidDate(dateRange.to)) {
      throw new InvalidDateRangeException(
        `Invalid 'to' date format: ${dateRange.to}`,
      );
    }
  }

  /**
   * Validates items query string
   * @param itemsQuery Items query string to validate
   * @returns Array of parsed item terms
   * @throws InvalidItemsQueryException if the items query is invalid
   */
  static validateAndParseItemsQuery(itemsQuery: string): string[] {
    if (!itemsQuery || !itemsQuery.trim()) {
      throw new InvalidItemsQueryException('Items query cannot be empty');
    }

    const items = itemsQuery
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (items.length === 0) {
      throw new InvalidItemsQueryException('No valid items provided in query');
    }

    return items;
  }

  /**
   * Validates if a string is a valid date format (YYYY-MM-DD) and represents a real date
   * @param dateString The date string to validate
   * @returns True if the date is valid, false otherwise
   */
  static isValidDate(dateString: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }

    const parts = dateString.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    if (month < 1 || month > 12) {
      return false;
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
      return false;
    }

    return true;
  }

  /**
   * Creates a human-readable description of a date range
   * @param dateRange The date range object
   * @returns A string describing the date range
   */
  static getDateRangeDescription(dateRange: DateRangeParams): string {
    if (dateRange.from && dateRange.to) {
      return `from ${dateRange.from} to ${dateRange.to}`;
    }

    if (dateRange.from) {
      return `from ${dateRange.from}`;
    }

    if (dateRange.to) {
      return `until ${dateRange.to}`;
    }

    return '(unspecified)';
  }
}
