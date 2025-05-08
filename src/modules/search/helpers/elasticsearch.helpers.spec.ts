import {
  extractOrdersFromResponse,
  extractTotalFromResponse,
  createUuidSearchRequest,
  createStatusSearchRequest,
  createDateRangeSearchRequest,
  createProductIdSearchRequest,
  createProductNameSearchRequest,
  createCustomerIdSearchRequest,
} from './elasticsearch.helpers';
import { mockOrders } from '../../../test/mocks/order-mock';
import { OrderStatus } from '../../order/entities/order.entity';

describe('Elasticsearch Helpers', () => {
  describe('extractOrdersFromResponse', () => {
    it('should extract orders from Elasticsearch 7+ response format', () => {
      const response = {
        hits: {
          hits: [{ _source: mockOrders[0] }, { _source: mockOrders[1] }],
        },
      };

      const result = extractOrdersFromResponse(response);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockOrders[0]);
      expect(result[1]).toEqual(mockOrders[1]);
    });

    it('should extract orders from older Elasticsearch response format', () => {
      const response = {
        body: {
          hits: {
            hits: [{ _source: mockOrders[0] }, { _source: mockOrders[1] }],
          },
        },
      };

      const result = extractOrdersFromResponse(response);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockOrders[0]);
      expect(result[1]).toEqual(mockOrders[1]);
    });

    it('should return empty array for invalid response format', () => {
      const response = {};
      const result = extractOrdersFromResponse(response);
      expect(result).toEqual([]);
    });
  });

  describe('extractTotalFromResponse', () => {
    it('should extract total count from Elasticsearch 7+ response with number', () => {
      const response = {
        hits: {
          total: 42,
        },
      };

      const result = extractTotalFromResponse(response);
      expect(result).toEqual(42);
    });

    it('should extract total count from Elasticsearch 7+ response with object', () => {
      const response = {
        hits: {
          total: {
            value: 42,
            relation: 'eq',
          },
        },
      };

      const result = extractTotalFromResponse(response);
      expect(result).toEqual(42);
    });

    it('should extract total count from older Elasticsearch response with number', () => {
      const response = {
        body: {
          hits: {
            total: 42,
          },
        },
      };

      const result = extractTotalFromResponse(response);
      expect(result).toEqual(42);
    });

    it('should extract total count from older Elasticsearch response with object', () => {
      const response = {
        body: {
          hits: {
            total: {
              value: 42,
              relation: 'eq',
            },
          },
        },
      };

      const result = extractTotalFromResponse(response);
      expect(result).toEqual(42);
    });

    it('should return 0 for invalid response format', () => {
      const response = {};
      const result = extractTotalFromResponse(response);
      expect(result).toEqual(0);
    });
  });

  describe('createUuidSearchRequest', () => {
    it('should create a search request for UUID', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const indexName = 'orders';
      const result = createUuidSearchRequest(uuid, indexName);

      expect(result).toEqual({
        index: indexName,
        query: {
          term: { uuid },
        },
      });
    });
  });

  describe('createStatusSearchRequest', () => {
    it('should create a search request for status with pagination', () => {
      const status = OrderStatus.DELIVERED;
      const indexName = 'orders';
      const page = 2;
      const limit = 20;
      const result = createStatusSearchRequest(status, indexName, page, limit);

      expect(result).toEqual({
        index: indexName,
        query: {
          term: { status },
        },
        sort: [{ createdAt: { order: 'desc' } }],
        from: (page - 1) * limit,
        size: limit,
      });
    });
  });

  describe('createDateRangeSearchRequest', () => {
    it('should create a search request for date range with both dates', () => {
      const dateRange = {
        from: '2023-01-01T00:00:00Z',
        to: '2023-12-31T23:59:59Z',
      };
      const indexName = 'orders';
      const page = 1;
      const limit = 10;
      const result = createDateRangeSearchRequest(
        dateRange,
        indexName,
        page,
        limit,
      );

      expect(result).toEqual({
        index: indexName,
        query: {
          range: {
            createdAt: {
              gte: dateRange.from,
              lte: dateRange.to,
            },
          },
        },
        sort: [{ createdAt: { order: 'desc' } }],
        from: 0,
        size: limit,
      });
    });

    it('should create a search request for date range with only from date', () => {
      const dateRange = {
        from: '2023-01-01T00:00:00Z',
      };
      const indexName = 'orders';
      const page = 1;
      const limit = 10;
      const result = createDateRangeSearchRequest(
        dateRange,
        indexName,
        page,
        limit,
      );

      expect(result).toEqual({
        index: indexName,
        query: {
          range: {
            createdAt: {
              gte: dateRange.from,
            },
          },
        },
        sort: [{ createdAt: { order: 'desc' } }],
        from: 0,
        size: limit,
      });
    });

    it('should create a search request for date range with only to date', () => {
      const dateRange = {
        to: '2023-12-31T23:59:59Z',
      };
      const indexName = 'orders';
      const page = 1;
      const limit = 10;
      const result = createDateRangeSearchRequest(
        dateRange,
        indexName,
        page,
        limit,
      );

      expect(result).toEqual({
        index: indexName,
        query: {
          range: {
            createdAt: {
              lte: dateRange.to,
            },
          },
        },
        sort: [{ createdAt: { order: 'desc' } }],
        from: 0,
        size: limit,
      });
    });
  });

  // Testes para os outros helpers...
  describe('createProductIdSearchRequest', () => {
    it('should create a search request for product ID', () => {
      const productId = '550e8400-e29b-41d4-a716-446655440001';
      const indexName = 'orders';
      const page = 1;
      const limit = 10;
      const result = createProductIdSearchRequest(
        productId,
        indexName,
        page,
        limit,
      );

      expect(result).toEqual({
        index: indexName,
        query: {
          nested: {
            path: 'items',
            query: {
              term: { 'items.productId': productId },
            },
          },
        },
        sort: [{ createdAt: { order: 'desc' } }],
        from: 0,
        size: limit,
      });
    });
  });

  describe('createProductNameSearchRequest', () => {
    it('should create a search request for product name', () => {
      const productName = 'Smartphone';
      const indexName = 'orders';
      const page = 1;
      const limit = 10;
      const result = createProductNameSearchRequest(
        productName,
        indexName,
        page,
        limit,
      );

      expect(result).toEqual({
        index: indexName,
        query: {
          nested: {
            path: 'items',
            query: {
              match: { 'items.productName': productName },
            },
          },
        },
        sort: [{ createdAt: { order: 'desc' } }],
        from: 0,
        size: limit,
      });
    });
  });

  describe('createCustomerIdSearchRequest', () => {
    it('should create a search request for customer ID', () => {
      const customerId = '550e8400-e29b-41d4-a716-446655440000';
      const indexName = 'orders';
      const page = 1;
      const limit = 10;
      const result = createCustomerIdSearchRequest(
        customerId,
        indexName,
        page,
        limit,
      );

      expect(result).toEqual({
        index: indexName,
        query: {
          term: { customerId },
        },
        sort: [{ createdAt: { order: 'desc' } }],
        from: 0,
        size: limit,
      });
    });
  });
});
