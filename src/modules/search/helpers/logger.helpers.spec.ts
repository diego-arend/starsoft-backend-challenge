import { Logger } from '@nestjs/common';
import { logSearchError, logSearchSuccess } from '../helpers/logger.helpers';

describe('Logger Helpers', () => {
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as any;
  });

  describe('logSearchError', () => {
    it('should log error with correct format', () => {
      const operation = 'findByUuid';
      const error = new Error('Something went wrong');
      const context = 'TestContext';

      logSearchError(mockLogger, operation, error, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Search ${operation} failed: ${error.message}`,
        error.stack,
        context,
      );
    });

    it('should use default context if not provided', () => {
      const operation = 'findByStatus';
      const error = new Error('Database connection failed');

      logSearchError(mockLogger, operation, error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Search ${operation} failed: ${error.message}`,
        error.stack,
        'SearchService',
      );
    });
  });

  describe('logSearchSuccess', () => {
    it('should log success with correct format', () => {
      const operation = 'findByUuid';
      const details = 'UUID: 123, found';
      const context = 'TestContext';

      logSearchSuccess(mockLogger, operation, details, context);

      expect(mockLogger.log).toHaveBeenCalledWith(
        `Search ${operation} succeeded: ${details}`,
        context,
      );
    });

    it('should use default context if not provided', () => {
      const operation = 'findByStatus';
      const details = 'Status: DELIVERED, found: 5 orders';

      logSearchSuccess(mockLogger, operation, details);

      expect(mockLogger.log).toHaveBeenCalledWith(
        `Search ${operation} succeeded: ${details}`,
        'SearchService',
      );
    });
  });
});
