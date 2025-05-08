import {
  ApiResponseOptions,
  ApiParamOptions,
  ApiQueryOptions,
} from '@nestjs/swagger';
import { OrderStatus } from '../../order/entities/order.entity';

/**
 * Standard API responses for search endpoints
 */
export const SearchSwaggerResponses: Record<string, ApiResponseOptions> = {
  // Success responses
  OrderFound: {
    status: 200,
    description: 'Order found successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        uuid: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        customerId: {
          type: 'string',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
        status: {
          type: 'string',
          enum: Object.values(OrderStatus),
          example: OrderStatus.DELIVERED,
        },
        total: { type: 'number', example: 2500 },
        createdAt: {
          type: 'string',
          format: 'date-time',
          example: '2023-01-15T14:30:00Z',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          example: '2023-01-16T09:45:00Z',
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 101 },
              productId: {
                type: 'string',
                example: '550e8400-e29b-41d4-a716-446655440001',
              },
              productName: { type: 'string', example: 'Product Name' },
              price: { type: 'number', example: 1250 },
              quantity: { type: 'number', example: 2 },
            },
          },
        },
      },
    },
  },

  OrdersFound: {
    status: 200,
    description: 'Orders found successfully',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              uuid: {
                type: 'string',
                example: '123e4567-e89b-12d3-a456-426614174000',
              },
              customerId: {
                type: 'string',
                example: '550e8400-e29b-41d4-a716-446655440000',
              },
              status: {
                type: 'string',
                enum: Object.values(OrderStatus),
                example: OrderStatus.DELIVERED,
              },
              total: { type: 'number', example: 2500 },
              createdAt: {
                type: 'string',
                format: 'date-time',
                example: '2023-01-15T14:30:00Z',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                example: '2023-01-16T09:45:00Z',
              },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number', example: 101 },
                    productId: {
                      type: 'string',
                      example: '550e8400-e29b-41d4-a716-446655440001',
                    },
                    productName: { type: 'string', example: 'Product Name' },
                    price: { type: 'number', example: 1250 },
                    quantity: { type: 'number', example: 2 },
                  },
                },
              },
            },
          },
        },
        total: { type: 'number', example: 42 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
        totalPages: { type: 'number', example: 5 },
      },
    },
  },

  // Error responses
  NotFound: {
    status: 404,
    description: 'Order not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        error: { type: 'string', example: 'Not Found' },
        message: {
          type: 'string',
          example:
            'Order with UUID 123e4567-e89b-12d3-a456-426614174000 not found',
        },
        errorCode: { type: 'string', example: 'RESOURCE_NOT_FOUND' },
      },
    },
  },

  BadRequest: {
    status: 400,
    description: 'Invalid search parameters',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        error: { type: 'string', example: 'Bad Request' },
        message: {
          type: 'string',
          example:
            'Invalid search parameters: Page must be >= 1 and limit must be between 1 and 100',
        },
        errorCode: { type: 'string', example: 'INVALID_SEARCH_PARAMETERS' },
      },
    },
  },

  ServerError: {
    status: 500,
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        error: { type: 'string', example: 'Internal Server Error' },
        message: { type: 'string', example: 'Failed to execute search' },
        errorCode: { type: 'string', example: 'SEARCH_EXECUTION_FAILURE' },
      },
    },
  },

  ServiceUnavailable: {
    status: 503,
    description: 'Search service unavailable',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 503 },
        error: { type: 'string', example: 'Service Unavailable' },
        message: {
          type: 'string',
          example: 'Search service is currently unavailable',
        },
        errorCode: { type: 'string', example: 'SEARCH_SERVICE_UNAVAILABLE' },
      },
    },
  },
};

/**
 * Common API documentation for pagination parameters
 */
export const PaginationApiQueries: ApiQueryOptions[] = [
  {
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  },
  {
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
    example: 10,
  },
];

/**
 * API operation descriptions for search endpoints
 */
export const SearchApiOperations = {
  findByUuid: {
    summary: 'Find order by UUID',
    description: 'Retrieve an order by its unique identifier (UUID)',
  },
  findByStatus: {
    summary: 'Find orders by status',
    description: 'Retrieve all orders with a specific status',
  },
  findByDateRange: {
    summary: 'Find orders by date range',
    description: 'Retrieve orders created within a specific date range',
  },
  findByProductId: {
    summary: 'Find orders containing a specific product',
    description: 'Retrieve orders that contain a specific product by its ID',
  },
  findByProductName: {
    summary: 'Find orders by product name',
    description:
      'Retrieve orders that contain products with names matching the search text',
  },
  findByCustomerId: {
    summary: 'Find orders by customer ID',
    description: 'Retrieve all orders for a specific customer',
  },
};

/**
 * API parameters for search endpoints
 */
export const SearchApiParams: Record<string, ApiParamOptions> = {
  uuid: {
    name: 'uuid',
    description: 'Order UUID',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  },
  status: {
    name: 'status',
    description: 'Order status',
    enum: OrderStatus,
    example: OrderStatus.DELIVERED,
  },
  productId: {
    name: 'productId',
    description: 'Product UUID',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440001',
  },
  customerId: {
    name: 'customerId',
    description: 'Customer UUID',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
  },
};

/**
 * API queries for search endpoints
 */
export const SearchApiQueries: Record<string, ApiQueryOptions> = {
  productName: {
    name: 'q',
    required: true,
    type: String,
    description: 'Product name search text',
    example: 'smartphone',
  },
  dateFrom: {
    name: 'from',
    required: false,
    type: String,
    description: 'Start date (ISO format)',
    example: '2023-01-01T00:00:00.000Z',
  },
  dateTo: {
    name: 'to',
    required: false,
    type: String,
    description: 'End date (ISO format)',
    example: '2023-12-31T23:59:59.999Z',
  },
};

/**
 * Standard API responses for all search endpoints
 */
export const CommonSearchResponses = [
  { status: 400, description: 'Invalid search parameters' },
  { status: 500, description: 'Internal server error' },
];
