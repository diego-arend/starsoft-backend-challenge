import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { OrderExceptionFilter } from './order-exception.filter';
import { OrderNotFoundException } from '../exceptions/postgres-exceptions';
import { ElasticsearchNotFoundException } from '../../../common/exceptions/elasticsearch-exceptions';
import { MessageResponseHttpException } from '../../../common/exceptions/test/exception.mock';

describe('OrderExceptionFilter', () => {
  let filter: OrderExceptionFilter;
  let httpContext: any;
  let capturedResponse: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderExceptionFilter],
    }).compile();

    filter = module.get<OrderExceptionFilter>(OrderExceptionFilter);

    capturedResponse = {};

    httpContext = {
      switchToHttp: () => ({
        getResponse: () => ({
          status: (code: number) => {
            capturedResponse.statusCode = code;
            return {
              json: (data: any) => {
                capturedResponse.body = data;
                return data;
              },
            };
          },
        }),
        getRequest: () => ({
          url: '/orders/test-uuid',
          method: 'GET',
        }),
      }),
    };
  });

  describe('Exception Handling', () => {
    it('should format OrderNotFoundException correctly', () => {
      const uuid = 'test-uuid-123';
      const exception = new OrderNotFoundException(uuid);

      filter.catch(exception, httpContext as ArgumentsHost);

      expect(capturedResponse.statusCode).toBe(HttpStatus.NOT_FOUND);
      expect(capturedResponse.body).toEqual({
        statusCode: HttpStatus.NOT_FOUND,
        errorCode: 'ORDER_NOT_FOUND',
        message: `Order with UUID ${uuid} not found`,
        timestamp: expect.any(String),
        path: '/orders/test-uuid',
      });
    });

    it('should format ElasticsearchNotFoundException correctly', () => {
      const docId = 'es-doc-123';
      const exception = new ElasticsearchNotFoundException(docId);

      filter.catch(exception, httpContext as ArgumentsHost);

      expect(capturedResponse.statusCode).toBe(HttpStatus.NOT_FOUND);
      expect(capturedResponse.body).toEqual({
        statusCode: HttpStatus.NOT_FOUND,
        errorCode: 'RESOURCE_NOT_FOUND',
        message: `Resource with id '${docId}' not found`,
        timestamp: expect.any(String),
        path: '/orders/test-uuid',
      });
    });

    it('should use default errorCode for exceptions without specific code', () => {
      const exception = new MessageResponseHttpException(
        'Resource not found',
        HttpStatus.NOT_FOUND,
      );

      filter.catch(exception as any, httpContext as ArgumentsHost);

      expect(capturedResponse.body.errorCode).toBe('RESOURCE_NOT_FOUND');
    });

    it('should generate timestamp if exception does not provide one', () => {
      const exception = new MessageResponseHttpException(
        'Error without timestamp',
        HttpStatus.NOT_FOUND,
      );
      const beforeTest = new Date();

      filter.catch(exception as any, httpContext as ArgumentsHost);

      const timestamp = new Date(capturedResponse.body.timestamp);
      const afterTest = new Date();

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp >= beforeTest).toBeTruthy();
      expect(timestamp <= afterTest).toBeTruthy();
    });

    it('should correctly include request path', () => {
      const customUrl = '/orders/customer/456/items';
      const customHttpContext = {
        ...httpContext,
        switchToHttp: () => ({
          ...httpContext.switchToHttp(),
          getRequest: () => ({
            url: customUrl,
            method: 'GET',
          }),
        }),
      };

      const exception = new OrderNotFoundException('456');

      filter.catch(exception, customHttpContext as ArgumentsHost);

      expect(capturedResponse.body.path).toBe(customUrl);
    });
  });
});
