import { ElasticsearchExceptionFilter } from './elasticsearch-exception.filter';
import { ElasticsearchNotFoundException } from '../exceptions/elasticsearch-exceptions';
import { ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

describe('ElasticsearchExceptionFilter', () => {
  let filter: ElasticsearchExceptionFilter;
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
    filter = new ElasticsearchExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/api/resource/123',
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
    it('should handle ElasticsearchNotFoundException with ID from params', () => {
      const exception = new ElasticsearchNotFoundException(
        'Document not found',
      );
      mockRequest.params = { id: '123' };

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        message: "Resource with id '123' not found",
        timestamp: expect.any(String),
        path: '/api/resource/123',
      });
    });

    it('should handle ElasticsearchNotFoundException with uuid param', () => {
      const exception = new ElasticsearchNotFoundException(
        'Document not found',
      );
      mockRequest.params = { uuid: '550e8400-e29b-41d4-a716-446655440000' };

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        message:
          "Resource with id '550e8400-e29b-41d4-a716-446655440000' not found",
        timestamp: expect.any(String),
        path: '/api/resource/123',
      });
    });

    it('should handle ElasticsearchNotFoundException with resourceId param', () => {
      const exception = new ElasticsearchNotFoundException(
        'Document not found',
      );
      mockRequest.params = { resourceId: 'doc_abc123' };

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        message: "Resource with id 'doc_abc123' not found",
        timestamp: expect.any(String),
        path: '/api/resource/123',
      });
    });

    it('should return "unknown" when no ID is found in request params', () => {
      const exception = new ElasticsearchNotFoundException(
        'Document not found',
      );
      mockRequest.params = {}; // Empty params

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        message: "Resource with id 'unknown' not found",
        timestamp: expect.any(String),
        path: '/api/resource/123',
      });
    });

    it('should handle case when request.params is undefined', () => {
      const exception = new ElasticsearchNotFoundException(
        'Document not found',
      );
      mockRequest.params = undefined;

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        message: "Resource with id 'unknown' not found",
        timestamp: expect.any(String),
        path: '/api/resource/123',
      });
    });
  });

  describe('extractResourceIdFromRequest', () => {
    it('should extract ID from id field', () => {
      const request = {
        params: {
          id: '123',
          otherField: 'value',
        },
      };

      // Acessando o método privado para teste
      const result = (filter as any).extractResourceIdFromRequest(request);
      expect(result).toBe('123');
    });

    it('should extract ID from uuid field when id is not present', () => {
      const request = {
        params: {
          uuid: 'abc-123',
          otherField: 'value',
        },
      };

      const result = (filter as any).extractResourceIdFromRequest(request);
      expect(result).toBe('abc-123');
    });

    it('should extract ID from resourceId field when other IDs are not present', () => {
      const request = {
        params: {
          resourceId: 'res_456',
          otherField: 'value',
        },
      };

      const result = (filter as any).extractResourceIdFromRequest(request);
      expect(result).toBe('res_456');
    });

    it('should return "unknown" when no ID fields are present', () => {
      const request = {
        params: {
          someOtherField: 'value',
        },
      };

      const result = (filter as any).extractResourceIdFromRequest(request);
      expect(result).toBe('unknown');
    });

    it('should return "unknown" when params is undefined', () => {
      const request = {};

      const result = (filter as any).extractResourceIdFromRequest(request);
      expect(result).toBe('unknown');
    });
  });
});
