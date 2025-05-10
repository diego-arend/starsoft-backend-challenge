import { IsValidDateRange } from './date-range.validator';

describe('IsValidDateRange', () => {
  let validator: IsValidDateRange;

  beforeEach(() => {
    validator = new IsValidDateRange();
  });

  describe('validate', () => {
    it('should return false for null value', () => {
      expect(validator.validate(null)).toBe(false);
    });

    it('should return false for undefined value', () => {
      expect(validator.validate(undefined)).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(validator.validate('string')).toBe(false);
      expect(validator.validate(123)).toBe(false);
      expect(validator.validate([])).toBe(false);
    });

    it('should return false when both from and to are missing', () => {
      expect(validator.validate({})).toBe(false);
    });

    it('should return true when only from date is provided', () => {
      expect(validator.validate({ from: '2023-01-01' })).toBe(true);
    });

    it('should return true when only to date is provided', () => {
      expect(validator.validate({ to: '2023-01-01' })).toBe(true);
    });

    it('should return true when from date is before to date', () => {
      expect(
        validator.validate({
          from: '2023-01-01',
          to: '2023-01-02',
        }),
      ).toBe(true);
    });

    it('should return true when from date equals to date', () => {
      expect(
        validator.validate({
          from: '2023-01-01',
          to: '2023-01-01',
        }),
      ).toBe(true);
    });

    it('should return false when from date is after to date', () => {
      expect(
        validator.validate({
          from: '2023-01-02',
          to: '2023-01-01',
        }),
      ).toBe(false);
    });

    it('should return false when from date is invalid', () => {
      expect(
        validator.validate({
          from: 'invalid-date',
          to: '2023-01-01',
        }),
      ).toBe(false);
    });

    it('should return false when to date is invalid', () => {
      expect(
        validator.validate({
          from: '2023-01-01',
          to: 'invalid-date',
        }),
      ).toBe(false);
    });

    it('should return false when both dates are invalid', () => {
      expect(
        validator.validate({
          from: 'invalid-from',
          to: 'invalid-to',
        }),
      ).toBe(false);
    });

    it('should handle different date formats', () => {
      // ISO format
      expect(
        validator.validate({
          from: '2023-01-01T00:00:00Z',
          to: '2023-01-02T00:00:00Z',
        }),
      ).toBe(true);

      // US format
      expect(
        validator.validate({
          from: '01/01/2023',
          to: '01/02/2023',
        }),
      ).toBe(true);
    });
  });

  describe('defaultMessage', () => {
    it('should return a descriptive error message', () => {
      const message = validator.defaultMessage();

      expect(message).toContain('At least one date is required');
      expect(message).toContain(
        '"from" date must be before or equal to "to" date',
      );
    });
  });
});
