import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

interface ExceptionResponse {
  statusCode: number;
  message: string;
  errorCode: string;
  timestamp?: string;
  details?: any;
}

class TestException extends BaseException {
  constructor() {
    super('Mensagem de teste', HttpStatus.BAD_REQUEST, 'CODIGO_TESTE');
  }
}

describe('BaseException', () => {
  it('deve retornar o status code correto', () => {
    const exception = new TestException();
    expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
  });

  it('deve retornar resposta formatada com errorCode', () => {
    const exception = new TestException();

    const response = exception.getResponse() as ExceptionResponse;

    expect(response).toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Mensagem de teste',
      errorCode: 'CODIGO_TESTE',
    });

    expect(response).toHaveProperty('timestamp');

    expect(response).toHaveProperty('details');
  });
});
