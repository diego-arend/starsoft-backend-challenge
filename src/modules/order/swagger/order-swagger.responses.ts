import { getSchemaPath } from '@nestjs/swagger';
import {
  OrderNotFoundException,
  OrderNotModifiableException,
} from '../exceptions/postgres-exceptions';
import { OrderStatus } from '../entities/order.entity';
import { OrderResponseDto } from '../dto/order-response.dto';
import {
  ElasticsearchSearchException,
  ElasticsearchNotFoundException,
} from '../../../common/exceptions/elasticsearch-exceptions';

/**
 * OrderItem example data for Swagger documentation
 */
const orderItemExample = {
  uuid: '123e4567-e89b-12d3-a456-426614174001',
  productId: 'prod-123',
  productName: 'Smartphone XYZ',
  price: 89990,
  quantity: 1,
  subtotal: 89990,
  orderUuid: '123e4567-e89b-12d3-a456-426614174000',
};

/**
 * Order example data for Swagger documentation
 */
const orderExample = {
  uuid: '123e4567-e89b-12d3-a456-426614174000',
  customerId: 'cust-123',
  status: OrderStatus.PENDING,
  total: 89990,
  items: [orderItemExample],
  createdAt: '2023-05-07T10:20:30.123Z',
  updatedAt: '2023-05-07T10:20:30.123Z',
};

/**
 * Paginated response example for Swagger documentation
 */
const paginatedOrdersExample = {
  data: [orderExample],
  total: 10,
  page: 1, // Changed from string to number
  limit: 10, // Changed from string to number
  pages: 1,
};

/**
 * Standardized Swagger responses for order endpoints
 */
export const OrderSwaggerResponses = {
  Create: {
    Success: {
      status: 201,
      description: 'Order created successfully',
      content: {
        'application/json': {
          schema: { $ref: getSchemaPath(OrderResponseDto) },
          example: orderExample,
        },
      },
    },
    BadRequest: {
      status: 400,
      description: 'Invalid order data',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: { type: 'string', example: 'Failed to create order' },
          error: { type: 'string', example: 'Bad Request' },
        },
      },
    },
    ValidationError: {
      status: 400,
      description: 'Validation Error - Invalid order data',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            type: 'string',
            example: 'Failed to create order: Invalid items',
          },
          errorCode: { type: 'string', example: 'ORDER_CREATION_FAILED' },
          timestamp: { type: 'string', example: '2023-05-09T10:00:00.000Z' },
          details: {
            type: 'object',
            example: {
              items: ['At least one item is required', 'Invalid product ID'],
            },
          },
        },
      },
    },
    DatabaseError: {
      status: 400,
      description: 'Database Transaction Error',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            type: 'string',
            example: 'Failed to create order: Database transaction failed',
          },
          errorCode: { type: 'string', example: 'TRANSACTION_FAILED' },
          timestamp: { type: 'string', example: '2023-05-09T10:00:00.000Z' },
        },
      },
    },
    InvalidItems: {
      status: 400,
      description: 'Invalid Order Items',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            type: 'string',
            example: 'Failed to create order: Invalid order items',
          },
          errorCode: { type: 'string', example: 'INVALID_ORDER_ITEMS' },
          timestamp: { type: 'string', example: '2023-05-09T10:00:00.000Z' },
          details: {
            type: 'object',
            example: {
              invalidItems: [{ productId: '123', reason: 'Invalid quantity' }],
            },
          },
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
          message: { type: 'string', example: 'Internal server error' },
          error: { type: 'string', example: 'Internal Server Error' },
        },
      },
    },
  },

  Get: {
    Success: {
      status: 200,
      description: 'Orders retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: getSchemaPath(OrderResponseDto) },
          example: orderExample,
        },
      },
    },
    PaginatedSuccess: {
      status: 200,
      description: 'Orders retrieved successfully with pagination',
      content: {
        'application/json': {
          schema: {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(OrderResponseDto) },
              },
              total: {
                type: 'number',
                description: 'Total number of items',
              },
              page: {
                type: 'number', // Changed from string to number
                description: 'Current page number',
              },
              limit: {
                type: 'number', // Changed from string to number
                description: 'Number of items per page',
              },
              pages: {
                type: 'number',
                description: 'Total number of pages',
              },
            },
          },
          example: paginatedOrdersExample,
        },
      },
    },
    NotFound: {
      status: 404,
      description: 'Order not found',
      type: OrderNotFoundException,
      content: {
        'application/json': {
          example: {
            message:
              'Order with UUID 123e4567-e89b-12d3-a456-426614174000 not found',
            statusCode: 404,
            errorCode: 'ORDER_NOT_FOUND',
            timestamp: '2023-05-07T10:20:30.123Z',
          },
        },
      },
    },
    InvalidUuid: {
      status: 404,
      description: 'Invalid UUID format (treated as not found)',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: {
            type: 'string',
            example:
              "Resource with id '1147b261-d050-4d44-9aba-037836gab6af' not found",
          },
          timestamp: { type: 'string', example: '2023-05-09T15:47:50.000Z' },
          path: {
            type: 'string',
            example: '/orders/1147b261-d050-4d44-9aba-037836gab6af',
          },
        },
      },
    },
    ElasticsearchError: {
      status: 500,
      description: 'Search failed',
      type: ElasticsearchSearchException,
      content: {
        'application/json': {
          example: {
            message: 'Failed to search for orders.',
            statusCode: 500,
            errorCode: 'SEARCH_FAILED',
            timestamp: '2023-05-07T10:20:30.123Z',
          },
        },
      },
    },
  },

  Update: {
    Success: {
      status: 200,
      description: 'Order updated successfully',
      content: {
        'application/json': {
          schema: { $ref: getSchemaPath(OrderResponseDto) },
          example: orderExample,
        },
      },
    },
    NotModifiable: {
      status: 422, // Código 422 para violações de regra de negócio
      description: 'Order cannot be modified due to its current status',
      type: OrderNotModifiableException,
      content: {
        'application/json': {
          example: {
            message: 'Order with status CANCELED cannot be modified',
            statusCode: 422,
            errorCode: 'ORDER_NOT_MODIFIABLE',
            timestamp: '2023-05-07T10:20:30.123Z',
            path: '/orders/123e4567-e89b-12d3-a456-426614174000',
          },
        },
      },
    },
    ValidationError: {
      status: 400,
      description: 'Validation Error - Invalid update data',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            type: 'string',
            example: 'Failed to update order: Invalid data',
          },
          errorCode: { type: 'string', example: 'ORDER_UPDATE_FAILED' },
          timestamp: { type: 'string', example: '2023-05-09T10:00:00.000Z' },
          details: {
            type: 'object',
            example: {
              items: ['Invalid product ID', 'Invalid quantity'],
            },
          },
        },
      },
    },
    DatabaseError: {
      status: 400,
      description: 'Database Transaction Error',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          message: {
            type: 'string',
            example: 'Failed to update order: Database transaction failed',
          },
          errorCode: { type: 'string', example: 'TRANSACTION_FAILED' },
          timestamp: { type: 'string', example: '2023-05-09T10:00:00.000Z' },
        },
      },
    },
    NotFound: {
      status: 404,
      description: 'Order not found',
      type: OrderNotFoundException,
      content: {
        'application/json': {
          example: {
            message:
              'Order with UUID 123e4567-e89b-12d3-a456-426614174000 not found',
            statusCode: 404,
            errorCode: 'ORDER_NOT_FOUND',
            timestamp: '2023-05-07T10:20:30.123Z',
          },
        },
      },
    },
    InvalidUuid: {
      status: 404,
      description: 'Invalid UUID format (treated as not found)',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: {
            type: 'string',
            example:
              "Resource with id '1147b261-d050-4d44-9aba-037836gab6af' not found",
          },
          timestamp: { type: 'string', example: '2023-05-09T15:47:50.000Z' },
          path: {
            type: 'string',
            example: '/orders/1147b261-d050-4d44-9aba-037836gab6af',
          },
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
          message: { type: 'string', example: 'Internal server error' },
          error: { type: 'string', example: 'Internal Server Error' },
        },
      },
    },
  },

  Cancel: {
    Success: {
      status: 200,
      description: 'Order canceled successfully',
      content: {
        'application/json': {
          schema: { $ref: getSchemaPath(OrderResponseDto) },
          example: {
            ...orderExample,
            status: OrderStatus.CANCELED,
          },
        },
      },
    },
    NotModifiable: {
      status: 422, // Código 422 consistente para violações de regra de negócio
      description: 'Order cannot be canceled due to its current status',
      type: OrderNotModifiableException,
      content: {
        'application/json': {
          example: {
            message: 'Order with status DELIVERED cannot be modified',
            statusCode: 422,
            errorCode: 'ORDER_NOT_MODIFIABLE',
            timestamp: '2023-05-07T10:20:30.123Z',
            path: '/orders/123e4567-e89b-12d3-a456-426614174000',
          },
        },
      },
    },
    NotFound: {
      status: 404,
      description: 'Order not found',
      type: OrderNotFoundException,
      content: {
        'application/json': {
          example: {
            message:
              'Order with UUID 123e4567-e89b-12d3-a456-426614174000 not found',
            statusCode: 404,
            errorCode: 'ORDER_NOT_FOUND',
            timestamp: '2023-05-07T10:20:30.123Z',
          },
        },
      },
    },
    InvalidUuid: {
      status: 404,
      description: 'Invalid UUID format (treated as not found)',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          message: {
            type: 'string',
            example:
              "Resource with id '1147b261-d050-4d44-9aba-037836gab6af' not found",
          },
          timestamp: { type: 'string', example: '2023-05-09T15:47:50.000Z' },
          path: {
            type: 'string',
            example: '/orders/1147b261-d050-4d44-9aba-037836gab6af',
          },
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
          message: { type: 'string', example: 'Internal server error' },
          error: { type: 'string', example: 'Internal Server Error' },
        },
      },
    },
  },

  CustomerSearch: {
    Success: {
      status: 200,
      description: 'Customer orders retrieved successfully',
      content: {
        'application/json': {
          schema: {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(OrderResponseDto) },
              },
              total: {
                type: 'number',
                description: 'Total number of items',
              },
              page: {
                type: 'number',
                description: 'Current page number',
              },
              limit: {
                type: 'number',
                description: 'Number of items per page',
              },
              pages: {
                type: 'number',
                description: 'Total number of pages',
              },
            },
          },
          example: paginatedOrdersExample,
        },
      },
    },
    NotFound: {
      status: 404,
      description: 'No orders found for customer',
      type: ElasticsearchNotFoundException, // Adicionado o tipo
      content: {
        'application/json': {
          example: {
            message: 'No orders found for customer ID: cust-123',
            statusCode: 404,
            errorCode: 'CUSTOMER_ORDERS_NOT_FOUND',
            timestamp: '2023-05-07T10:20:30.123Z',
            path: '/orders/customer/cust-123',
          },
        },
      },
    },
    ElasticsearchError: {
      status: 500,
      description: 'Search failed',
      type: ElasticsearchSearchException,
      content: {
        'application/json': {
          example: {
            message: 'Failed to search for orders with customer ID cust-123',
            statusCode: 500,
            errorCode: 'SEARCH_FAILED',
            timestamp: '2023-05-07T10:20:30.123Z',
            path: '/orders/customer/cust-123',
            errorDetails: 'Elasticsearch cluster is not available',
          },
        },
      },
    },
    // Novo exemplo para falha de índice no Elasticsearch
    ElasticsearchIndexError: {
      status: 404,
      description: 'Elasticsearch index not found',
      type: ElasticsearchNotFoundException,
      content: {
        'application/json': {
          example: {
            message: "Elasticsearch index 'orders' not found",
            statusCode: 404,
            errorCode: 'INDEX_NOT_FOUND',
            timestamp: '2023-05-07T10:20:30.123Z',
            path: '/orders/customer/cust-123',
          },
        },
      },
    },
    // Novo exemplo para documento não encontrado no Elasticsearch
    ElasticsearchDocumentNotFound: {
      status: 404,
      description: 'Document not found in Elasticsearch',
      type: ElasticsearchNotFoundException,
      content: {
        'application/json': {
          example: {
            message:
              "Document with ID '123e4567-e89b-12d3-a456-426614174000' not found in index 'orders'",
            statusCode: 404,
            errorCode: 'DOCUMENT_NOT_FOUND',
            timestamp: '2023-05-07T10:20:30.123Z',
            path: '/orders/123e4567-e89b-12d3-a456-426614174000',
          },
        },
      },
    },
  },
};
