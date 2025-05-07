import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseException } from './base.exception';

/**
 * Global exception filter to handle all exceptions in a standardized way
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Log the exception
    this.logException(exception, request);

    // Handle client response
    this.handleResponse(exception, response, request);
  }

  private logException(exception: unknown, request: Request): void {
    const message = this.getExceptionMessage(exception);
    const stack = this.getExceptionStack(exception);
    const statusCode = this.getStatusCode(exception);
    const path = request.url;
    const method = request.method;

    // Log detailed exception information
    this.logger.error(`[${method}] ${path} - ${statusCode}: ${message}`, stack);
  }

  private handleResponse(
    exception: unknown,
    response: Response,
    request: Request,
  ): void {
    const statusCode = this.getStatusCode(exception);
    const errorResponse = this.formatErrorResponse(exception, request);

    response.status(statusCode).json(errorResponse);
  }

  private getStatusCode(exception: unknown): number {
    return exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getExceptionMessage(exception: unknown): string {
    if (exception instanceof BaseException) {
      return exception.message;
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'object' && 'message' in response) {
        return response['message'] as string;
      }
      return exception.message;
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return 'Internal server error';
  }

  private getExceptionStack(exception: unknown): string | undefined {
    return exception instanceof Error ? exception.stack : undefined;
  }

  private formatErrorResponse(exception: unknown, request: Request): any {
    const statusCode = this.getStatusCode(exception);
    const message = this.getExceptionMessage(exception);

    // If it's a custom exception, use its response format
    if (exception instanceof BaseException) {
      return exception.getResponse();
    }

    // For NestJS exceptions
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'object') {
        return {
          ...response,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }
    }

    // For any other type of exception
    return {
      statusCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      errorCode:
        statusCode === HttpStatus.INTERNAL_SERVER_ERROR
          ? 'INTERNAL_SERVER_ERROR'
          : 'UNKNOWN_ERROR',
    };
  }
}
