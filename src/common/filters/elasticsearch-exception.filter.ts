import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ElasticsearchNotFoundException } from '../exceptions/elasticsearch-exceptions';

/**
 * Exception filter to handle Elasticsearch not found exceptions
 * and convert them to 404 responses
 */
@Catch(ElasticsearchNotFoundException)
export class ElasticsearchExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ElasticsearchExceptionFilter.name);

  catch(exception: ElasticsearchNotFoundException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const status = HttpStatus.NOT_FOUND;

    // Get the resource ID from the URL parameters
    const resourceId = this.extractResourceIdFromRequest(request);

    this.logger.warn(
      `Resource not found: ${exception.message} (${request.method} ${request.url})`,
    );

    // Return a standard 404 response
    response.status(status).json({
      statusCode: status,
      message: `Resource with id '${resourceId}' not found`,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  /**
   * Extract resource ID from request URL parameters
   */
  private extractResourceIdFromRequest(request: any): string {
    // Try to get ID from route params
    const params = request.params || {};

    // Look for common parameter names like id, uuid, etc.
    const commonIdFields = ['id', 'uuid', 'resourceId'];
    for (const field of commonIdFields) {
      if (params[field]) {
        return params[field];
      }
    }

    // If no ID is found in params, return a placeholder
    return 'unknown';
  }
}
