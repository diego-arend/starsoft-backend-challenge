import { OrderStatus } from '../../order/entities/order.entity';
import { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';

/**
 * Creates a mock order for testing
 *
 * @param overrides Object with properties to override default values
 * @returns A mock order object
 */
export function createMockOrder(overrides = {}) {
  return {
    uuid: `order-${Math.random().toString(36).substring(2, 8)}`,
    customerId: `customer-${Math.random().toString(36).substring(2, 8)}`,
    status: OrderStatus.PENDING,
    total: Math.floor(Math.random() * 1000) + 1,
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock Elasticsearch search response with specified items and total
 *
 * @param items Array of items to include in the response
 * @param total Total number of hits
 * @returns Mock Elasticsearch search response object
 */
export function createMockSearchResponse(items = [], total = 0) {
  return {
    hits: {
      hits: items.map((item, index) => ({
        _index: 'orders',
        _id: `id-${index}`,
        _score: 1.0,
        _source: item,
      })),
      total: createMockTotalHits(total),
    },
  };
}

/**
 * Creates a mock Elasticsearch total hits object
 *
 * @param value The total count value
 * @returns Total hits object in Elasticsearch format
 */
function createMockTotalHits(value: number): SearchTotalHits {
  return {
    value,
    relation: 'eq',
  };
}

/**
 * Creates a mock empty Elasticsearch search response
 *
 * @returns Empty search response object
 */
export function createEmptySearchResponse() {
  return {
    hits: {
      hits: [],
      total: createMockTotalHits(0),
    },
  };
}

/**
 * Creates a mock Elasticsearch search error response
 *
 * @returns Function that throws an error when called
 */
export function createSearchErrorResponse() {
  return jest.fn().mockImplementation(() => {
    throw new Error('Elasticsearch search error');
  });
}
