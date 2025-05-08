import { Logger } from '@nestjs/common';

/**
 * Logs search errors with consistent format
 */
export function logSearchError(
  logger: Logger,
  operation: string,
  error: any,
  context?: string,
): void {
  logger.error(
    `Search ${operation} failed: ${error.message}`,
    error.stack,
    context || 'SearchService',
  );
}

/**
 * Logs search success with consistent format
 */
export function logSearchSuccess(
  logger: Logger,
  operation: string,
  details: string,
  context?: string,
): void {
  logger.log(
    `Search ${operation} succeeded: ${details}`,
    context || 'SearchService',
  );
}
