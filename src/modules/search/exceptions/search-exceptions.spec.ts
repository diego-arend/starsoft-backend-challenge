import { HttpStatus } from '@nestjs/common';
import {
  InvalidSearchParametersException,
  SearchExecutionException,
  SearchResultProcessingException,
  SearchServiceUnavailableException,
  SearchValidationException,
  InvalidDateRangeException,
  SearchResultNotFoundException,
  InvalidStatusException,
  InvalidItemsQueryException,
} from './search-exceptions';

describe('Search Exceptions', () => {
  describe('InvalidSearchParametersException', () => {
    it('should create an exception with the correct message and status', () => {
      const message = 'Invalid search parameters: missing required field';
      const exception = new InvalidSearchParametersException(message);

      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('SearchExecutionException', () => {
    it('should create an exception with proper formatted message', () => {
      const message = 'database connection timeout';
      const exception = new SearchExecutionException(message);

      expect(exception.message).toBe(`Search execution failed: ${message}`);
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('SearchResultProcessingException', () => {
    it('should create an exception with default message when no message provided', () => {
      const exception = new SearchResultProcessingException();

      expect(exception.message).toBe('Failed to process search results');
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should create an exception with message detail when provided', () => {
      const message = 'Error parsing product data';
      const exception = new SearchResultProcessingException(message);

      expect(exception.message).toBe('Failed to process search results');
    });
  });

  describe('SearchServiceUnavailableException', () => {
    it('should create an exception with formatted message', () => {
      const message = 'Elasticsearch cluster is down';
      const exception = new SearchServiceUnavailableException(message);

      expect(exception.message).toBe(`Search service unavailable: ${message}`);
      expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    });
  });

  describe('SearchValidationException', () => {
    it('should create an exception with formatted validation message', () => {
      const message = 'Date range is invalid';
      const exception = new SearchValidationException(message);

      expect(exception.message).toBe(`Search validation error: ${message}`);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('InvalidDateRangeException', () => {
    it('should create an exception with default message', () => {
      const exception = new InvalidDateRangeException();

      expect(exception.message).toBe('Invalid date format or range');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should create an exception with custom message', () => {
      const message = 'Start date must be before end date';
      const exception = new InvalidDateRangeException(message);

      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('SearchResultNotFoundException', () => {
    it('should create an exception with formatted message including search criteria', () => {
      const criteria = 'products=smartphone';
      const exception = new SearchResultNotFoundException(criteria);

      expect(exception.message).toBe(`No search results found for ${criteria}`);
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
    });
  });

  describe('InvalidStatusException', () => {
    it('should create an exception with generic message when no status provided', () => {
      const exception = new InvalidStatusException();

      expect(exception.message).toBe('Invalid status');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should create an exception with specific status in message', () => {
      const status = 'UNKNOWN_STATUS';
      const exception = new InvalidStatusException(status);

      expect(exception.message).toBe(`Invalid status: ${status}`);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('InvalidItemsQueryException', () => {
    it('should create an exception with default message', () => {
      const exception = new InvalidItemsQueryException();

      expect(exception.message).toBe('Invalid items query');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should create an exception with custom message', () => {
      const message = 'Items must be comma-separated values';
      const exception = new InvalidItemsQueryException(message);

      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });
  });
});
