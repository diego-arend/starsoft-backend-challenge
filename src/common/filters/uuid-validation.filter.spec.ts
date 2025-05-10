import { UuidValidationFilter } from './uuid-validation.filter';
import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

describe('UuidValidationFilter', () => {
  let filter: UuidValidationFilter;
  let mockResponse: Partial<Response>;
  let mockRequest: any;
  let mockArgumentsHost: ArgumentsHost;
  let originalLoggerWarn: any;

  beforeAll(() => {
    originalLoggerWarn = Logger.prototype.warn;
    Logger.prototype.warn = jest.fn();
  });

  afterAll(() => {
    Logger.prototype.warn = originalLoggerWarn;
  });

  beforeEach(() => {
    filter = new UuidValidationFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/api/resource/123e4567-e89b-12d3-a456-426614174000',
      method: 'GET',
      params: {},
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as any;
  });

  describe('catch', () => {
    it('should transform UUID validation error to 404 response', () => {
      const exception = new BadRequestException(
        'Validation failed (uuid is expected)',
      );
      const fixedDate = new Date('2023-01-01T00:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => fixedDate as any);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        message:
          "Resource with id '123e4567-e89b-12d3-a456-426614174000' not found",
        timestamp: fixedDate.toISOString(),
        path: '/api/resource/123e4567-e89b-12d3-a456-426614174000',
      });

      jest.restoreAllMocks();
    });

    it('should transform error message containing "UUID" to 404 response', () => {
      const exception = new BadRequestException('Invalid UUID format');
      const fixedDate = new Date('2023-01-01T00:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => fixedDate as any);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        message:
          "Resource with id '123e4567-e89b-12d3-a456-426614174000' not found",
        timestamp: fixedDate.toISOString(),
        path: '/api/resource/123e4567-e89b-12d3-a456-426614174000',
      });

      jest.restoreAllMocks();
    });

    it('should pass through other BadRequestExceptions unchanged', () => {
      const exception = new BadRequestException('Some other validation error');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Some other validation error',
        error: 'Bad Request',
      });
    });

    it('should handle undefined error message', () => {
      const exception = new BadRequestException();

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Bad Request',
        error: 'Bad Request',
      });
    });
  });

  describe('extractResourceIdFromRequest', () => {
    it('should extract UUID from request params', () => {
      mockRequest.params = { uuid: '123e4567-e89b-12d3-a456-426614174000' };

      const result = (filter as any).extractResourceIdFromRequest(mockRequest);

      expect(result).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should extract ID from last URL segment as fallback', () => {
      mockRequest.params = {};
      mockRequest.url = '/api/orders/invalid-uuid-format';

      const result = (filter as any).extractResourceIdFromRequest(mockRequest);

      expect(result).toBe('invalid-uuid-format');
    });

    it('should handle query parameters in URL when extracting ID', () => {
      mockRequest.params = {};
      mockRequest.url = '/api/resource/abc123?sort=desc';

      const result = (filter as any).extractResourceIdFromRequest(mockRequest);

      expect(result).toBe('abc123');
    });

    it('should return "unknown" when URL has no segments', () => {
      mockRequest.params = {};
      mockRequest.url = '';

      const result = (filter as any).extractResourceIdFromRequest(mockRequest);

      expect(result).toBe('unknown');
    });

    it('should handle undefined params', () => {
      mockRequest.params = undefined;

      const result = (filter as any).extractResourceIdFromRequest(mockRequest);

      expect(result).toBe('123e4567-e89b-12d3-a456-426614174000');
    });
  });
});
