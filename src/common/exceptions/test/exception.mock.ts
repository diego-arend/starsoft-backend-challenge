import { HttpException, HttpStatus } from '@nestjs/common';
import { BaseException } from '../base.exception';

/**
 * Mock HTTP exception for testing
 */
export class MockHttpException extends HttpException {
  constructor(message: string, status: number) {
    super(message, status);
  }
}

/**
 * Mock exception with message response
 */
export class MessageResponseHttpException extends HttpException {
  constructor(message: string, status: number) {
    super({ message }, status);
  }
}

/**
 * Mock custom exception extending BaseException
 */
export class MockCustomException extends BaseException {
  constructor(message: string, errorCode: string) {
    super(message, HttpStatus.BAD_REQUEST, errorCode);
  }
}

/**
 * Mock standard Error
 */
export class MockStandardError extends Error {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Mock exception that throws something other than an Error object
 */
export const createNonErrorException = () => {
  return 'This is a string exception';
};
