import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Exception filter that transforms UUID validation errors (BadRequestException)
 * into 404 Not Found responses for RESTful API consistency
 */
@Catch(BadRequestException)
export class UuidValidationFilter implements ExceptionFilter {
  private readonly logger = new Logger(UuidValidationFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // Check if this is a UUID validation error from ParseUUIDPipe
    const message = exception.message || '';

    if (message.includes('uuid is expected') || message.includes('UUID')) {
      const status = HttpStatus.NOT_FOUND;
      const resourceId = this.extractResourceIdFromRequest(request);

      this.logger.warn(
        `Invalid UUID format converted to 404: ${resourceId} (${request.method} ${request.url})`,
      );

      // Return 404 Not Found for UUID validation errors
      return response.status(status).json({
        statusCode: status,
        message: `Resource with id '${resourceId}' not found`,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    // For other BadRequestExceptions, pass through
    return response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: exception.message,
      error: 'Bad Request',
    });
  }

  /**
   * Extract resource ID from request URL parameters
   */
  private extractResourceIdFromRequest(request: any): string {
    // Try to get ID from route params first
    const params = request.params || {};
    if (params.uuid) {
      return params.uuid;
    }

    // Get the last part of the URL path as fallback
    const urlParts = request.url.split('/');
    return urlParts[urlParts.length - 1]?.split('?')[0] || 'unknown';
  }
}
