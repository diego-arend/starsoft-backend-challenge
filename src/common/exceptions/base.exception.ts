import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base exception class for standardized error handling
 */
export class BaseException extends HttpException {
  constructor(
    public readonly message: string,
    public readonly statusCode: HttpStatus,
    public readonly errorCode: string,
    public readonly details?: any,
  ) {
    super(
      {
        message,
        statusCode,
        errorCode,
        details,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }
}
