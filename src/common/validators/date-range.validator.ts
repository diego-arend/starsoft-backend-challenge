import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Validator to check if a date range is valid:
 * - At least one of 'from' or 'to' must be provided
 * - If both dates are provided, 'from' must be before 'to'
 */
@ValidatorConstraint({ name: 'isValidDateRange', async: false })
export class IsValidDateRange implements ValidatorConstraintInterface {
  /**
   * Validates a date range
   *
   * @param value - The date range object with from and to properties
   * @returns true if the date range is valid, false otherwise
   */
  validate(value: any): boolean {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const { from, to } = value;

    if (!from && !to) {
      return false;
    }

    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);

      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return false;
      }

      return fromDate <= toDate;
    }

    return true;
  }

  /**
   * Provides a default error message
   *
   * @returns Error message
   */
  defaultMessage(): string {
    return 'At least one date is required, and if both dates are provided, "from" date must be before or equal to "to" date';
  }
}
