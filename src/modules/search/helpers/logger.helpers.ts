import { LoggerService } from '../../../logger/logger.service';

/**
 * Logs a search error with standardized format
 *
 * @param logger Logger service instance
 * @param operation Operation that failed
 * @param error Error
 * @param context Context for the log
 */
export function logSearchError(
  logger: LoggerService,
  operation: string,
  error: any,
  context: string = 'SearchService',
): void {
  logger.error(
    `Failed to ${operation} search: ${error.message}`,
    error.stack,
    context,
  );
}
