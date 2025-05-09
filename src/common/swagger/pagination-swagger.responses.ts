import { ApiQueryOptions } from '@nestjs/swagger';

/**
 * Common pagination API query parameters for Swagger documentation
 */
export const PaginationApiQueries: ApiQueryOptions[] = [
  {
    name: 'page',
    required: false,
    description: 'Número da página (começa em 1)',
    type: Number,
    example: 1,
  },
  {
    name: 'limit',
    required: false,
    description: 'Quantidade de itens por página',
    type: Number,
    example: 10,
  },
];
