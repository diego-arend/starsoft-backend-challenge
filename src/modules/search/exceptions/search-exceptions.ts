import { HttpStatus } from '@nestjs/common';
import { BaseException } from '../../../common/exceptions/base.exception';
import { BadRequestException } from '@nestjs/common';

/**
 * Exception thrown when search query parameters are invalid
 */
export class InvalidSearchParametersException extends BaseException {
  /**
   * Create a new invalid search parameters exception
   *
   * @param message - Details about the invalid parameters
   */
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST, 'INVALID_SEARCH_PARAMETERS', {
      message,
    });
  }
}

/**
 * Exception thrown when search execution fails
 */
export class SearchExecutionException extends BaseException {
  /**
   * Create a new search execution exception
   *
   * @param message - Details about the execution failure
   */
  constructor(message: string) {
    super(
      `Search execution failed: ${message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'SEARCH_EXECUTION_FAILED',
      { message },
    );
  }
}

/**
 * Exception thrown when search results cannot be processed
 */
export class SearchResultProcessingException extends BaseException {
  /**
   * Create a new search result processing exception
   *
   * @param message - Details about the processing failure
   */
  constructor(message?: string) {
    super(
      'Failed to process search results',
      HttpStatus.INTERNAL_SERVER_ERROR,
      'SEARCH_RESULTS_PROCESSING_FAILURE',
      { message },
    );
  }
}

/**
 * Exception thrown when search service is unavailable
 */
export class SearchServiceUnavailableException extends BaseException {
  /**
   * Create a new search service unavailable exception
   *
   * @param message - Details about the service unavailability
   */
  constructor(message: string) {
    super(
      `Search service unavailable: ${message}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      'SEARCH_SERVICE_UNAVAILABLE',
      { message },
    );
  }
}

/**
 * Exception thrown when a search validation error occurs
 */
export class SearchValidationException extends BaseException {
  /**
   * Create a new search validation exception
   *
   * @param message - The validation error message
   */
  constructor(message: string) {
    super(
      `Search validation error: ${message}`,
      HttpStatus.BAD_REQUEST,
      'SEARCH_VALIDATION_ERROR',
      { message },
    );
  }
}

/**
 * Exception thrown when a search date range is invalid
 */
export class InvalidDateRangeException extends BadRequestException {
  /**
   * Create a new invalid date range exception
   *
   * @param message - Details about the invalid date range
   */
  constructor(message: string = 'Invalid date format or range') {
    super(message);
  }
}

/**
 * Exception thrown when no search results are found
 */
export class SearchResultNotFoundException extends BaseException {
  /**
   * Create a new search result not found exception
   *
   * @param criteria - The search criteria that produced no results
   */
  constructor(criteria: string) {
    super(
      `No search results found for ${criteria}`,
      HttpStatus.NOT_FOUND,
      'SEARCH_RESULTS_NOT_FOUND',
      { criteria },
    );
  }
}

export class InvalidStatusException extends BadRequestException {
  constructor(status?: string) {
    super(`Invalid status${status ? `: ${status}` : ''}`);
  }
}

export class InvalidItemsQueryException extends BadRequestException {
  constructor(message: string = 'Invalid items query') {
    super(message);
  }
}
