import { NotFoundExceptionFilter } from './not-found-exception.filter';
import { ArgumentsHost, NotFoundException } from '@nestjs/common';
import { Response } from 'express';

describe('NotFoundExceptionFilter', () => {
  let filter: NotFoundExceptionFilter;
  let mockResponse: Partial<Response>;
  let mockRequest: any;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(() => {
    filter = new NotFoundExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/api/nonexistent',
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as any;
  });

  it('should handle NotFoundException with default message', () => {
    const exception = new NotFoundException();
    const fixedDate = new Date('2023-01-01T00:00:00Z');
    jest.spyOn(global, 'Date').mockImplementation(() => fixedDate as any);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 404,
      message: 'Not Found',
      timestamp: fixedDate.toISOString(),
      path: '/api/nonexistent',
    });

    jest.restoreAllMocks();
  });

  it('should handle NotFoundException with custom message', () => {
    const customMessage = 'Resource could not be found';
    const exception = new NotFoundException(customMessage);
    const fixedDate = new Date('2023-01-01T00:00:00Z');
    jest.spyOn(global, 'Date').mockImplementation(() => fixedDate as any);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 404,
      message: customMessage,
      timestamp: fixedDate.toISOString(),
      path: '/api/nonexistent',
    });

    jest.restoreAllMocks();
  });

  it('should format response with object message', () => {
    const messageObject = {
      error: 'Not Found',
      message: 'The requested resource could not be found',
    };
    const exception = new NotFoundException(messageObject);
    const fixedDate = new Date('2023-01-01T00:00:00Z');
    jest.spyOn(global, 'Date').mockImplementation(() => fixedDate as any);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(404);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,

        timestamp: fixedDate.toISOString(),
        path: '/api/nonexistent',
      }),
    );

    const actualCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
    expect(actualCall.statusCode).toBe(404);
    expect(actualCall.timestamp).toBe(fixedDate.toISOString());
    expect(actualCall.path).toBe('/api/nonexistent');

    expect(actualCall.message).toBe(
      'The requested resource could not be found',
    );

    jest.restoreAllMocks();
  });

  it('should handle different URL paths', () => {
    const exception = new NotFoundException();
    const customPath = '/orders/123456';
    mockRequest.url = customPath;
    const fixedDate = new Date('2023-01-01T00:00:00Z');
    jest.spyOn(global, 'Date').mockImplementation(() => fixedDate as any);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 404,
      message: 'Not Found',
      timestamp: fixedDate.toISOString(),
      path: customPath,
    });

    jest.restoreAllMocks();
  });
});
