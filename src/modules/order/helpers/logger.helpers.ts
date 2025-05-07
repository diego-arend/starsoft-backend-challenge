import { LoggerService } from '../../../logger/logger.service';

/**
 * Logs an error with standardized format
 *
 * @param logger Logger service instance
 * @param operation Operation that failed
 * @param error Error
 * @param context Context for the log
 */
export function logOrderError(
  logger: LoggerService,
  operation: string,
  error: any,
  context: string = 'OrderService',
): void {
  logger.error(
    `Failed to ${operation} order: ${error.message}`,
    error.stack,
    context,
  );
}
