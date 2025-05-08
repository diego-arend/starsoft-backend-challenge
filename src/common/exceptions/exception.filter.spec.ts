import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from './exception.filter';
import { BaseException } from './base.exception';

class TestCustomException extends BaseException {
  constructor() {
    super('Custom error', HttpStatus.BAD_REQUEST, 'TEST_ERROR_CODE');
  }
}

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockRequest = {
      url: '/test/url',
      method: 'GET',
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;

    filter = new GlobalExceptionFilter();

    jest.spyOn(filter['logger'], 'error').mockImplementation(() => ({}));
  });

  it('deve retornar 400 para HttpException', () => {
    const exception = new HttpException(
      'Dados inválidos',
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Dados inválidos',
      }),
    );
  });

  it('deve retornar 500 para Error padrão', () => {
    const exception = new Error('Erro interno');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Erro interno',
        errorCode: 'INTERNAL_SERVER_ERROR',
      }),
    );
  });

  it('deve manter o formato de resposta da BaseException', () => {
    const exception = new TestCustomException();

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Custom error',
        errorCode: 'TEST_ERROR_CODE',
      }),
    );

    const jsonArg = mockResponse.json.mock.calls[0][0];
    expect(jsonArg).toHaveProperty('timestamp');
  });

  it('deve tratar exceção não-Error', () => {
    const exception = 'Isso não é um Error';

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      }),
    );
  });

  it('deve incluir informações de caminho e timestamp para HttpException', () => {
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

    filter.catch(exception, mockHost);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/test/url',
        timestamp: expect.any(String),
      }),
    );
  });
});
