import { OrderStatus } from '../entities/order.entity';
import { SearchTotalHitsRelation } from '@elastic/elasticsearch/lib/api/types';

/**
 * Creates a mock Elasticsearch service for testing
 *
 * @returns A mocked instance of ElasticsearchService with predefined method implementations
 */
export const createMockElasticsearchService = () => ({
  index: jest.fn().mockResolvedValue({ result: 'created' }),
  update: jest.fn().mockResolvedValue({ result: 'updated' }),
  delete: jest.fn().mockResolvedValue({ result: 'deleted' }),
  exists: jest.fn().mockResolvedValue(true),
  search: jest.fn().mockResolvedValue({
    took: 5,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      failed: 0,
      skipped: 0,
    },
    hits: {
      total: { value: 2, relation: 'eq' as SearchTotalHitsRelation },
      max_score: 1.0,
      hits: [
        {
          _index: 'orders',
          _id: '123e4567-e89b-12d3-a456-426614174000',
          _score: 1.0,
          _source: {
            uuid: '123e4567-e89b-12d3-a456-426614174000',
            customerId: '550e8400-e29b-41d4-a716-446655440000',
            status: OrderStatus.PENDING,
            total: 4500,
            createdAt: '2023-05-07T12:00:00.000Z',
            updatedAt: '2023-05-07T12:00:00.000Z',
            items: [
              {
                uuid: '123e4567-e89b-12d3-a456-426614174001',
                productId: '550e8400-e29b-41d4-a716-446655440001',
                productName: 'Product 1',
                price: 1500,
                quantity: 2,
                subtotal: 3000,
              },
              {
                uuid: '123e4567-e89b-12d3-a456-426614174002',
                productId: '550e8400-e29b-41d4-a716-446655440002',
                productName: 'Product 2',
                price: 1500,
                quantity: 1,
                subtotal: 1500,
              },
            ],
          },
        },
        {
          _index: 'orders',
          _id: '123e4567-e89b-12d3-a456-426614174003',
          _score: 0.9,
          _source: {
            uuid: '123e4567-e89b-12d3-a456-426614174003',
            customerId: '550e8400-e29b-41d4-a716-446655440000',
            status: OrderStatus.SHIPPED,
            total: 5000,
            createdAt: '2023-05-08T12:00:00.000Z',
            updatedAt: '2023-05-08T12:00:00.000Z',
            items: [
              {
                uuid: '123e4567-e89b-12d3-a456-426614174004',
                productId: '550e8400-e29b-41d4-a716-446655440001',
                productName: 'Product 1',
                price: 1500,
                quantity: 2,
                subtotal: 3000,
              },
              {
                uuid: '123e4567-e89b-12d3-a456-426614174005',
                productId: '550e8400-e29b-41d4-a716-446655440003',
                productName: 'Product 3',
                price: 2000,
                quantity: 1,
                subtotal: 2000,
              },
            ],
          },
        },
      ],
    },
  }),
});

/**
 * Creates a mock response for an empty Elasticsearch search result
 *
 * @returns An Elasticsearch search response with zero hits
 */
export const createEmptySearchResponse = () => ({
  took: 1,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    failed: 0,
    skipped: 0,
  },
  hits: {
    total: { value: 0, relation: 'eq' as SearchTotalHitsRelation },
    max_score: null,
    hits: [],
  },
});

/**
 * Creates a function that simulates an Elasticsearch search error
 *
 * @returns A function that throws an Elasticsearch error when called
 */
export const createSearchErrorResponse = () => {
  return () => {
    throw new Error('Elasticsearch search error');
  };
};
