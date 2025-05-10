import { logSearchError } from './logger.helpers';

describe('Logger Helpers', () => {
  describe('logSearchError', () => {
    it('should correctly format error messages', () => {
      const mockLogger = {
        error: jest.fn().mockImplementation((message, trace, context) => {
          mockLogger.lastCall = { message, trace, context };
        }),
        lastCall: null,
      } as any;

      const testError = new Error('Test error message');
      const operation = 'execute';

      logSearchError(mockLogger, operation, testError);

      expect(mockLogger.lastCall.message).toBe(
        'Failed to execute search: Test error message',
      );

      expect(mockLogger.lastCall.trace).toBe(testError.stack);

      expect(mockLogger.lastCall.context).toBe('SearchService');
    });

    it('should use custom context when provided', () => {
      const mockLogger = {
        error: jest.fn().mockImplementation((message, trace, context) => {
          mockLogger.lastCall = { message, trace, context };
        }),
        lastCall: null,
      } as any;

      const testError = new Error('Database connection failed');
      const operation = 'connect to';
      const customContext = 'ElasticsearchConnector';

      logSearchError(mockLogger, operation, testError, customContext);

      expect(mockLogger.lastCall.message).toBe(
        'Failed to connect to search: Database connection failed',
      );

      expect(mockLogger.lastCall.context).toBe(customContext);
    });

    it('should handle error without stack trace', () => {
      const mockLogger = {
        error: jest.fn().mockImplementation((message, trace, context) => {
          mockLogger.lastCall = { message, trace, context };
        }),
        lastCall: null,
      } as any;

      const simpleError = { message: 'Simple error object' };
      const operation = 'process';

      logSearchError(mockLogger, operation, simpleError);

      expect(mockLogger.lastCall.message).toBe(
        'Failed to process search: Simple error object',
      );

      expect(mockLogger.lastCall.trace).toBeUndefined();
    });

    it('should handle string as error message', () => {
      const mockLogger = {
        error: jest.fn().mockImplementation((message, trace, context) => {
          mockLogger.lastCall = { message, trace, context };
        }),
        lastCall: null,
      } as any;

      const stringError = 'Something went wrong';
      const operation = 'validate';

      logSearchError(mockLogger, operation, stringError);

      expect(mockLogger.lastCall.message).toBe(
        'Failed to validate search: undefined',
      );

      expect(mockLogger.lastCall.trace).toBe(undefined);
    });
  });
});
