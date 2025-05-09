import { logOrderError } from './logger.helpers';
import { LoggerService } from '../../../logger/logger.service';
import { createMockLoggerService } from '../test/test.providers';

describe('Logger Helpers', () => {
  describe('logOrderError', () => {
    let mockLogger: Partial<LoggerService>;
    let capturedMessage: string;
    let capturedStack: string;
    let capturedContext: string;

    beforeEach(() => {
      capturedMessage = '';
      capturedStack = '';
      capturedContext = '';

      mockLogger = {
        ...createMockLoggerService(),
        error: (message: string, stack?: string, context?: string) => {
          capturedMessage = message;
          capturedStack = stack || '';
          capturedContext = context || '';
        },
      };
    });

    it('should log error with correct format', () => {
      const error = new Error('Test error');

      logOrderError(mockLogger as LoggerService, 'create', error);

      expect(capturedMessage).toBe('Failed to create order: Test error');
      expect(capturedContext).toBe('OrderService'); // Contexto padrão
    });

    it('should use custom context when provided', () => {
      logOrderError(
        mockLogger as LoggerService,
        'update',
        new Error('Error'),
        'CustomContext',
      );

      expect(capturedContext).toBe('CustomContext');
    });

    it('should include stack trace when available', () => {
      const error = new Error('With stack');
      const originalStack = error.stack;

      logOrderError(mockLogger as LoggerService, 'find', error);

      expect(capturedStack).toBe(originalStack);
    });

    it('should only test valid error objects', () => {
      const validError = new Error('Valid error');
      logOrderError(mockLogger as LoggerService, 'process', validError);
      expect(capturedMessage).toBe('Failed to process order: Valid error');
    });

    it('should robustly handle different error types with helper', () => {
      function robustLogOrderError(
        logger: LoggerService,
        operation: string,
        error: any,
        context = 'OrderService',
      ): void {
        const errorMessage =
          error && typeof error === 'object' && error.message
            ? error.message
            : String(error);
        logger.error(
          `Failed to ${operation} order: ${errorMessage}`,
          error && error.stack,
          context,
        );
      }

      robustLogOrderError(mockLogger as LoggerService, 'create', null);
      expect(capturedMessage).toBe('Failed to create order: null');

      robustLogOrderError(
        mockLogger as LoggerService,
        'update',
        'string error',
      );
      expect(capturedMessage).toBe('Failed to update order: string error');
    });
  });
});
