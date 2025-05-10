import { getSchemaPath } from '@nestjs/swagger';
import { OrderStatus } from '../../order/entities/order.entity';
import { OrderResponseDto } from '../../order/dto/order-response.dto';
import { ErrorResponseDto } from '../../../common/dto/error-response.dto';

export const SwaggerParams = {
  Status: {
    name: 'status',
    enum: OrderStatus,
    example: OrderStatus.PENDING,
    description: 'Order status to filter by',
  },

  DateFrom: {
    name: 'from',
    type: String,
    example: '2023-01-01',
    required: false,
    description: 'Start date in YYYY-MM-DD format',
  },

  DateTo: {
    name: 'to',
    type: String,
    example: '2023-12-31',
    required: false,
    description: 'End date in YYYY-MM-DD format',
  },

  Items: {
    name: 'items',
    type: String,
    example: 'pizza,soda,dessert',
    description: 'Comma-separated list of items to search for in orders',
  },

  Page: {
    name: 'page',
    type: Number,
    example: 1,
    required: false,
    description: 'Page number (starts at 1)',
  },

  Limit: {
    name: 'limit',
    type: Number,
    example: 10,
    required: false,
    description: 'Items per page (max 100)',
  },
};

export const SwaggerOperations = {
  FindByStatus: {
    summary: 'Search orders by status',
    description:
      'Returns a paginated list of orders filtered by the specified status. Returns an empty list if no orders are found.',
  },

  FindByDateRange: {
    summary: 'Search orders by date range',
    description:
      'Returns a paginated list of orders within the specified date range. Returns an empty list if no orders are found.',
  },

  FindByItems: {
    summary: 'Search orders by items contained',
    description:
      'Returns a paginated list of orders that contain the specified items. Returns an empty list if no orders are found.',
  },
};

export const ElasticsearchErrorResponse = {
  status: 500,
  description: 'Error searching in Elasticsearch',
  content: {
    'application/json': {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      },
    },
  },
};

export const ElasticsearchDateErrorResponse = {
  status: 500,
  description: 'Error searching in Elasticsearch with date parameters',
  content: {
    'application/json': {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      },
    },
  },
};

export const ElasticsearchItemsErrorResponse = {
  status: 500,
  description: 'Error searching in Elasticsearch with items parameters',
  content: {
    'application/json': {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      },
    },
  },
};

export const invalidStatusErrorSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number', example: 400 },
    message: { type: 'string', example: 'Invalid status' },
    error: { type: 'string', example: 'Bad Request' },
  },
};

export const invalidDateErrorSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number', example: 400 },
    message: { type: 'string', example: 'Invalid date format or range' },
    error: { type: 'string', example: 'Bad Request' },
  },
};

export const SearchSwaggerResponses = {
  FindByStatus: {
    Success: {
      status: 200,
      description: 'Orders found successfully or empty list if none found',
      schema: {
        allOf: [
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(OrderResponseDto) },
                description:
                  'List of orders. May be empty if no orders are found.',
              },
              total: { type: 'number', example: 42 },
              page: { type: 'number', example: 2 },
              limit: { type: 'number', example: 10 },
              pages: { type: 'number', example: 5 },
            },
          },
        ],
      },
    },

    BadRequest: {
      status: 400,
      description: 'Invalid status',
      type: ErrorResponseDto,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ErrorResponseDto) },
          {
            properties: {
              statusCode: { example: 400 },
              message: { example: 'Invalid status' },
              error: { example: 'Bad Request' },
            },
          },
        ],
      },
    },

    ElasticsearchError: {
      status: 500,
      description: 'Error searching in Elasticsearch',
      content: {
        'application/json': {
          example: {
            statusCode: 500,
            message: 'Internal server error',
            error: 'Internal Server Error',
            timestamp: '2023-09-15T14:30:22.123Z',
            path: '/api/search/by-status',
          },
          schema: {
            type: 'object',
            properties: {
              statusCode: {
                type: 'number',
                example: 500,
              },
              message: {
                type: 'string',
                example: 'Internal server error',
              },
              error: {
                type: 'string',
                example: 'Internal Server Error',
              },
              timestamp: {
                type: 'string',
                example: '2023-09-15T14:30:22.123Z',
              },
              path: {
                type: 'string',
                example: '/api/search/by-status',
              },
            },
          },
        },
      },
    },
  },

  FindByDateRange: {
    Success: {
      status: 200,
      description: 'Orders found successfully or empty list if none found',
      schema: {
        allOf: [
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(OrderResponseDto) },
                description:
                  'List of orders. May be empty if no orders are found.',
              },
              total: { type: 'number', example: 42 },
              page: { type: 'number', example: 2 },
              limit: { type: 'number', example: 10 },
              pages: { type: 'number', example: 5 },
            },
          },
        ],
      },
    },

    BadRequest: {
      status: 400,
      description: 'Invalid date parameters',
      type: ErrorResponseDto,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ErrorResponseDto) },
          {
            properties: {
              statusCode: { example: 400 },
              message: { example: 'Invalid date format or range' },
              error: { example: 'Bad Request' },
            },
          },
        ],
      },
    },

    ElasticsearchError: {
      status: 500,
      description: 'Error searching in Elasticsearch',
      content: {
        'application/json': {
          example: {
            statusCode: 500,
            message: 'Internal server error',
            error: 'Internal Server Error',
            timestamp: '2023-09-15T14:30:22.123Z',
            path: '/api/search/by-date',
          },
          schema: {
            type: 'object',
            properties: {
              statusCode: {
                type: 'number',
                example: 500,
              },
              message: {
                type: 'string',
                example: 'Internal server error',
              },
              error: {
                type: 'string',
                example: 'Internal Server Error',
              },
              timestamp: {
                type: 'string',
                example: '2023-09-15T14:30:22.123Z',
              },
              path: {
                type: 'string',
                example: '/api/search/by-date',
              },
            },
          },
        },
      },
    },
  },

  FindByItems: {
    Success: {
      status: 200,
      description: 'Orders found successfully or empty list if none found',
      schema: {
        allOf: [
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(OrderResponseDto) },
                description:
                  'List of orders. May be empty if no orders are found.',
              },
              total: { type: 'number', example: 42 },
              page: { type: 'number', example: 2 },
              limit: { type: 'number', example: 10 },
              pages: { type: 'number', example: 5 },
            },
          },
        ],
      },
    },

    BadRequest: {
      status: 400,
      description: 'Invalid items query',
      type: ErrorResponseDto,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ErrorResponseDto) },
          {
            properties: {
              statusCode: { example: 400 },
              message: { example: 'Invalid items query' },
              error: { example: 'Bad Request' },
            },
          },
        ],
      },
    },
  },
};
