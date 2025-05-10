import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({
    description: 'Código HTTP do erro',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Mensagem descritiva do erro',
    example: 'Parâmetro inválido',
  })
  message: string;

  @ApiProperty({
    description: 'Tipo do erro',
    example: 'Bad Request',
  })
  error: string;

  @ApiProperty({
    description: 'Timestamp de quando o erro ocorreu',
    example: '2023-09-15T14:30:22.123Z',
  })
  timestamp?: string;

  @ApiProperty({
    description: 'Caminho da requisição que gerou o erro',
    example: '/api/orders/123',
  })
  path?: string;
}
