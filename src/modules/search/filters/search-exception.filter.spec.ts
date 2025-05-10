import { SearchExceptionFilter } from './search-exception.filter';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response, Request } from 'express';
import {
  InvalidDateRangeException,
  InvalidStatusException,
  InvalidItemsQueryException,
} from '../exceptions/search-exceptions';
import { ElasticsearchSearchException } from '../../../common/exceptions/elasticsearch-exceptions';

describe('SearchExceptionFilter', () => {
  let filter: SearchExceptionFilter;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new SearchExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/api/search',
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnThis(),
      getResponse: jest.fn().mockReturnValue(mockResponse),
      getRequest: jest.fn().mockReturnValue(mockRequest),
    } as unknown as ArgumentsHost;
  });

  it('should handle InvalidStatusException', () => {
    const exception = new InvalidStatusException('INVALID_STATUS');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid status',
        error: 'Bad Request',
        path: '/api/search',
      }),
    );
  });

  it('should handle InvalidDateRangeException', () => {
    const exception = new InvalidDateRangeException('Invalid date format');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid date format or range',
        error: 'Bad Request',
        path: '/api/search',
      }),
    );
  });

  it('should handle InvalidItemsQueryException with custom message', () => {
    const customMessage = 'Items must be comma-separated';
    const exception = new InvalidItemsQueryException(customMessage);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: customMessage,
        error: 'Bad Request',
        path: '/api/search',
      }),
    );
  });

  it('should handle InvalidItemsQueryException with default message', () => {
    const exception = new InvalidItemsQueryException();

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid items query',
        error: 'Bad Request',
        path: '/api/search',
      }),
    );
  });

  it('should handle ElasticsearchSearchException', () => {
    const exception = new ElasticsearchSearchException('Elasticsearch error');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        error: 'Internal Server Error',
        path: '/api/search',
      }),
    );
  });

  it('should handle standard HttpException', () => {
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Forbidden',
        path: '/api/search',
      }),
    );
  });

  it('should handle unknown exceptions as internal server error', () => {
    const exception = new Error('Unknown error');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Unknown error',
        error: 'Error',
        path: '/api/search',
      }),
    );
  });

  it('should handle exceptions without message', () => {
    const exception = {};

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        error: 'Error',
        path: '/api/search',
      }),
    );
  });

  it('should include timestamp in response', () => {
    const exception = new Error('Test error');

    const fixedDate = new Date('2023-01-01T00:00:00Z');
    jest.spyOn(global, 'Date').mockImplementation(() => fixedDate as any);

    filter.catch(exception, mockHost);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: fixedDate.toISOString(),
      }),
    );

    jest.restoreAllMocks();
  });
});
