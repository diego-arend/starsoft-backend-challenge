import { getSchemaPath } from '@nestjs/swagger';
import {
  OrderNotFoundException,
  OrderNotModifiableException,
  OrderCreationFailedException,
  DatabaseTransactionFailedException,
} from '../exceptions/postgres-exceptions';
import { ElasticsearchSearchException } from '../exceptions/elasticsearch-exceptions';

/**
 * Standardized Swagger responses for order endpoints
 */
export const OrderSwaggerResponses = {
  // Creation responses
  Create: {
    Success: {
      status: 201,
      description: 'Order created successfully',
    },
    BadRequest: {
      status: 400,
      description: 'Bad request',
      schema: {
        allOf: [
          { $ref: getSchemaPath(OrderCreationFailedException) },
          {
            properties: {
              message: {
                type: 'string',
                example: 'Failed to create order',
              },
              statusCode: {
                type: 'number',
                example: 400,
              },
              errorCode: {
                type: 'string',
                example: 'ORDER_CREATION_FAILED',
              },
              timestamp: {
                type: 'string',
                example: '2023-05-07T10:20:30.123Z',
              },
              details: {
                type: 'object',
                example: {
                  items: 'Items array cannot be empty',
                },
              },
            },
          },
        ],
      },
    },
    ServerError: {
      status: 500,
      description: 'Internal server error',
      schema: {
        allOf: [
          { $ref: getSchemaPath(DatabaseTransactionFailedException) },
          {
            properties: {
              message: {
                type: 'string',
                example: 'Transaction failed during order creation',
              },
              statusCode: {
                type: 'number',
                example: 500,
              },
              errorCode: {
                type: 'string',
                example: 'TRANSACTION_FAILED',
              },
              timestamp: {
                type: 'string',
                example: '2023-05-07T10:20:30.123Z',
              },
            },
          },
        ],
      },
    },
  },

  // Retrieval responses
  Get: {
    Success: {
      status: 200,
      description: 'Orders retrieved successfully',
    },
    NotFound: {
      status: 404,
      description: 'Order not found',
      schema: {
        allOf: [
          { $ref: getSchemaPath(OrderNotFoundException) },
          {
            properties: {
              message: {
                type: 'string',
                example:
                  'Order with UUID 123e4567-e89b-12d3-a456-426614174000 not found',
              },
              statusCode: {
                type: 'number',
                example: 404,
              },
              errorCode: {
                type: 'string',
                example: 'ORDER_NOT_FOUND',
              },
              timestamp: {
                type: 'string',
                example: '2023-05-07T10:20:30.123Z',
              },
            },
          },
        ],
      },
    },
    ElasticsearchError: {
      status: 500,
      description: 'Search failed',
      schema: {
        allOf: [
          { $ref: getSchemaPath(ElasticsearchSearchException) },
          {
            properties: {
              message: {
                type: 'string',
                example: 'Failed to search for orders.',
              },
              statusCode: {
                type: 'number',
                example: 500,
              },
              errorCode: {
                type: 'string',
                example: 'SEARCH_FAILED',
              },
              timestamp: {
                type: 'string',
                example: '2023-05-07T10:20:30.123Z',
              },
            },
          },
        ],
      },
    },
  },

  // Update responses
  Update: {
    Success: {
      status: 200,
      description: 'Order updated successfully',
    },
    NotModifiable: {
      status: 400,
      description: 'Order cannot be modified',
      schema: {
        allOf: [
          { $ref: getSchemaPath(OrderNotModifiableException) },
          {
            properties: {
              message: {
                type: 'string',
                example: 'Order with status DELIVERED cannot be modified',
              },
              statusCode: {
                type: 'number',
                example: 400,
              },
              errorCode: {
                type: 'string',
                example: 'ORDER_NOT_MODIFIABLE',
              },
              timestamp: {
                type: 'string',
                example: '2023-05-07T10:20:30.123Z',
              },
            },
          },
        ],
      },
    },
  },

  // Customer search responses
  CustomerSearch: {
    Success: {
      status: 200,
      description: 'Return customer orders',
    },
    ElasticsearchError: {
      status: 500,
      description: 'Search failed',
      schema: {
        allOf: [
          { $ref: getSchemaPath(ElasticsearchSearchException) },
          {
            properties: {
              message: {
                type: 'string',
                example: 'Failed to search for customer orders.',
              },
              statusCode: {
                type: 'number',
                example: 500,
              },
              errorCode: {
                type: 'string',
                example: 'SEARCH_FAILED',
              },
              timestamp: {
                type: 'string',
                example: '2023-05-07T10:20:30.123Z',
              },
            },
          },
        ],
      },
    },
  },
};
