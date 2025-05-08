import { logOrderError } from './logger.helpers';
import { LoggerService } from '../../../logger/logger.service';

describe('Logger Helpers', () => {
  describe('logOrderError', () => {
    it('should format error message with operation and error details', () => {
      let capturedMessage = '';
      let capturedStack = '';
      let capturedContext = '';

      const mockLogger: LoggerService = {
        error: (message: string, stack?: string, context?: string) => {
          capturedMessage = message;
          capturedStack = stack;
          capturedContext = context;
        },
        warn: jest.fn(),
        log: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
      } as unknown as LoggerService;

      const operation = 'create';
      const errorMessage = 'Database connection failed';
      const errorStack =
        'Error: Database connection failed\n    at line 10\n    at line 20';
      const error = new Error(errorMessage);
      error.stack = errorStack;

      logOrderError(mockLogger, operation, error);

      expect(capturedMessage).toBe(
        `Failed to create order: Database connection failed`,
      );
      expect(capturedStack).toBe(errorStack);
      expect(capturedContext).toBe('OrderService');
    });

    it('should use custom context when provided', () => {
      let capturedContext = '';

      const mockLogger: LoggerService = {
        error: (message: string, stack?: string, context?: string) => {
          capturedContext = context;
        },
        warn: jest.fn(),
        log: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
      } as unknown as LoggerService;

      const operation = 'update';
      const error = new Error('Validation failed');
      const customContext = 'OrderValidator';

      logOrderError(mockLogger, operation, error, customContext);

      expect(capturedContext).toBe(customContext);
    });

    it('should handle errors without stack traces', () => {
      let capturedMessage = '';

      let capturedStack = '';

      const mockLogger: LoggerService = {
        error: (message: string, stack?: string) => {
          capturedMessage = message;
          capturedStack = stack;
        },
        warn: jest.fn(),
        log: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
      } as unknown as LoggerService;

      const operation = 'delete';
      const errorWithoutStack = { message: 'Record not found' };

      logOrderError(mockLogger, operation, errorWithoutStack);

      expect(capturedMessage).toBe(`Failed to delete order: Record not found`);
      expect(capturedStack).toBeUndefined();
    });

    it('should handle errors with malformed messages', () => {
      let capturedMessage = '';

      const mockLogger: LoggerService = {
        error: (message: string) => {
          capturedMessage = message;
        },
        warn: jest.fn(),
        log: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
      } as unknown as LoggerService;

      const operation = 'process';

      const errorWithNullMessage = { message: null };
      logOrderError(mockLogger, operation, errorWithNullMessage);
      expect(capturedMessage).toBe(`Failed to process order: null`);

      const errorWithObjectMessage = { message: { reason: 'Complex error' } };
      logOrderError(mockLogger, operation, errorWithObjectMessage);
      expect(capturedMessage).toBe(`Failed to process order: [object Object]`);
    });
  });
});
