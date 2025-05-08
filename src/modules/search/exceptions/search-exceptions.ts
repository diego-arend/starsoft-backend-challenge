import { HttpStatus } from '@nestjs/common';
import { BaseException } from '../../../common/exceptions/base.exception';

/**
 * Thrown when search query parameters are invalid
 */
export class InvalidSearchParametersException extends BaseException {
  constructor(message?: string) {
    super(
      'Invalid search parameters',
      HttpStatus.BAD_REQUEST,
      'INVALID_SEARCH_PARAMETERS',
      message,
    );
  }
}

/**
 * Thrown when search execution fails
 */
export class SearchExecutionException extends BaseException {
  constructor(message?: string) {
    super(
      'Failed to execute search',
      HttpStatus.INTERNAL_SERVER_ERROR,
      'SEARCH_EXECUTION_FAILURE',
      message,
    );
  }
}

/**
 * Thrown when search results cannot be processed
 */
export class SearchResultProcessingException extends BaseException {
  constructor(message?: string) {
    super(
      'Failed to process search results',
      HttpStatus.INTERNAL_SERVER_ERROR,
      'SEARCH_RESULTS_PROCESSING_FAILURE',
      message,
    );
  }
}

/**
 * Thrown when search service is unavailable
 */
export class SearchServiceUnavailableException extends BaseException {
  constructor(message?: string) {
    super(
      'Search service is currently unavailable',
      HttpStatus.SERVICE_UNAVAILABLE,
      'SEARCH_SERVICE_UNAVAILABLE',
      message,
    );
  }
}
