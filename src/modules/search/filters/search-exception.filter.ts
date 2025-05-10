import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import {
  InvalidDateRangeException,
  InvalidStatusException,
  InvalidItemsQueryException,
} from '../exceptions/search-exceptions';
import { ElasticsearchSearchException } from '../../../common/exceptions/elasticsearch-exceptions';

@Catch()
export class SearchExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SearchExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof InvalidStatusException) {
      return response.status(400).json({
        statusCode: 400,
        message: 'Invalid status',
        error: 'Bad Request',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    if (exception instanceof InvalidDateRangeException) {
      return response.status(400).json({
        statusCode: 400,
        message: 'Invalid date format or range',
        error: 'Bad Request',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    if (exception instanceof InvalidItemsQueryException) {
      return response.status(400).json({
        statusCode: 400,
        message: exception.message || 'Invalid items query',
        error: 'Bad Request',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    if (exception instanceof ElasticsearchSearchException) {
      return response.status(500).json({
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse = {
      statusCode: status,
      message: exception.message || 'Internal server error',
      error: exception.response?.error || 'Error',
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorResponse);
  }
}
