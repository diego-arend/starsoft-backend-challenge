import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  OrderNotFoundException,
  OrderNotModifiableException,
} from '../exceptions/postgres-exceptions';
import { ElasticsearchNotFoundException } from '../../../common/exceptions/elasticsearch-exceptions';

/**
 * Exception filter that handles all order-related exceptions
 * and returns consistent REST responses with detailed information.
 */
@Catch(
  OrderNotFoundException,
  ElasticsearchNotFoundException,
  OrderNotModifiableException,
)
export class OrderExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(OrderExceptionFilter.name);

  /**
   * Catches order exceptions and formats them into standardized responses
   *
   * @param exception - The exception that was thrown
   * @param host - Arguments host object containing the request and response
   */
  catch(
    exception:
      | OrderNotFoundException
      | ElasticsearchNotFoundException
      | OrderNotModifiableException,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let statusCode = HttpStatus.NOT_FOUND;
    let errorCode = 'RESOURCE_NOT_FOUND';
    let logMessage = `Resource not found: ${request.method} ${request.url} - ${exception.message}`;

    if (exception instanceof OrderNotModifiableException) {
      statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
      errorCode = 'ORDER_NOT_MODIFIABLE';
      logMessage = `Order modification error: ${request.method} ${request.url} - ${exception.message}`;
    }

    this.logger.log(logMessage);

    let timestamp = new Date().toISOString();
    let responseErrorCode = errorCode;

    if (typeof (exception as any).getResponse === 'function') {
      const exceptionResponse = (exception as any).getResponse();
      responseErrorCode = exceptionResponse?.errorCode || errorCode;
      timestamp = exceptionResponse?.timestamp || timestamp;
    }

    response.status(statusCode).json({
      statusCode: statusCode,
      errorCode: responseErrorCode,
      message: exception.message,
      timestamp: timestamp,
      path: request.url,
    });
  }
}
