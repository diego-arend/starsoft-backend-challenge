import { Logger } from '@nestjs/common';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import {
  prepareOrderDocument,
  extractMostRecentOrderState,
  mapElasticsearchResponseToOrders,
  getTotalCount,
  executeKeywordSearch,
  executeManualFiltering,
} from './elasticsearch.helpers';
import { createSampleOrder } from '../test/test.providers';

describe('Elasticsearch Helpers', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('prepareOrderDocument', () => {
    it('should prepare a document for indexing in Elasticsearch', () => {
      const order = createSampleOrder();

      const document = prepareOrderDocument(order);

      expect(document.uuid).toBe(order.uuid);
      expect(document.customerId).toBe(order.customerId);
      expect(document.status).toBe(order.status);
      expect(document.total).toBe(order.total);

      expect(document.items.length).toEqual(order.items.length);
      expect(document.items[0].productId).toEqual(order.items[0].productId);

      expect(document.items[0].order).toBeUndefined();
    });

    it('should handle undefined items', () => {
      const order = createSampleOrder();
      order.items = undefined;

      const document = prepareOrderDocument(order);

      expect(document.items).toEqual([]);
    });
  });

  describe('extractMostRecentOrderState', () => {
    it('should extract an Order from an Elasticsearch document', () => {
      const hitSource = {
        uuid: 'test-uuid',
        customerId: 'customer-123',
        status: OrderStatus.PENDING,
        total: 1000,
        createdAt: '2023-01-01T12:00:00Z',
        updatedAt: '2023-01-02T12:00:00Z',
        items: [
          {
            id: 1,
            productId: 'product-1',
            productName: 'Product One',
            quantity: 2,
            price: 300,
          },
        ],
      };

      const order = extractMostRecentOrderState(hitSource);

      expect(order).toBeInstanceOf(Order);
      expect(order.uuid).toBe('test-uuid');
      expect(order.customerId).toBe('customer-123');
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.items.length).toBe(1);
      expect(order.items[0]).toBeInstanceOf(OrderItem);

      expect(order.items[0].order).toBe(order);
    });

    it('should accept partial data without default values', () => {
      const partialSource = {
        uuid: 'test-uuid',
      };

      const order = extractMostRecentOrderState(partialSource);

      expect(order).toBeInstanceOf(Order);
      expect(order.uuid).toBe('test-uuid');
      expect(order.customerId).toBeUndefined();
      expect(order.status).toBeUndefined();
      expect(order.items).toBeUndefined();
    });

    it('should throw error for completely invalid data', () => {
      const completelyInvalidSource = null;

      expect(() =>
        extractMostRecentOrderState(completelyInvalidSource),
      ).toThrow();
    });
  });

  describe('mapElasticsearchResponseToOrders', () => {
    it('should map Elasticsearch response to array of Orders', () => {
      const response = {
        hits: {
          total: { value: 2 },
          hits: [
            {
              _source: {
                uuid: 'order-1',
                customerId: 'customer-1',
                status: OrderStatus.PENDING,
                total: 500,
                createdAt: '2023-01-01T10:00:00Z',
                updatedAt: '2023-01-01T10:00:00Z',
                items: [],
              },
            },
            {
              _source: {
                uuid: 'order-2',
                customerId: 'customer-2',
                status: OrderStatus.DELIVERED,
                total: 1200,
                createdAt: '2023-01-02T10:00:00Z',
                updatedAt: '2023-01-02T10:00:00Z',
                items: [],
              },
            },
          ],
        },
      };

      const orders = mapElasticsearchResponseToOrders(response);

      expect(orders.length).toBe(2);
      expect(orders[0]).toBeInstanceOf(Order);
      expect(orders[0].uuid).toBe('order-1');
      expect(orders[1].uuid).toBe('order-2');
    });

    it('should return empty array for invalid responses', () => {
      expect(mapElasticsearchResponseToOrders({})).toEqual([]);
      expect(mapElasticsearchResponseToOrders(null)).toEqual([]);
      expect(mapElasticsearchResponseToOrders({ hits: { hits: [] } })).toEqual(
        [],
      );
    });
  });

  describe('getTotalCount', () => {
    it('should extract total count correctly', () => {
      expect(getTotalCount(42)).toBe(42);

      expect(getTotalCount({ value: 100, relation: 'eq' })).toBe(100);
    });
  });

  describe('executeKeywordSearch', () => {
    it('should search orders by customer ID and return paginated results', async () => {
      const mockResponse = {
        hits: {
          total: { value: 2 },
          hits: [
            {
              _source: {
                uuid: 'order-1',
                customerId: 'customer-123',
                status: OrderStatus.PENDING,
                items: [],
              },
            },
            {
              _source: {
                uuid: 'order-2',
                customerId: 'customer-123',
                status: OrderStatus.DELIVERED,
                items: [],
              },
            },
          ],
        },
      };

      const elasticsearchService = {
        search: jest.fn().mockResolvedValue(mockResponse),
      };

      const result = await executeKeywordSearch(
        elasticsearchService as any,
        'orders',
        'customer-123',
        new PaginationDto(),
        new Logger(),
      );

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.data[0].uuid).toBe('order-1');
      expect(result.data[1].uuid).toBe('order-2');
    });

    it('should return empty results when error occurs', async () => {
      const elasticsearchService = {
        search: jest.fn().mockRejectedValue(new Error('Connection error')),
      };

      const result = await executeKeywordSearch(
        elasticsearchService as any,
        'orders',
        'customer-123',
        new PaginationDto(),
        new Logger(),
      );

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('executeManualFiltering', () => {
    it('should filter orders by customer ID', async () => {
      const mockResponse = {
        hits: {
          total: { value: 3 },
          hits: [
            {
              _source: {
                uuid: 'order-1',
                customerId: 'customer-123',
                items: [],
              },
            },
            {
              _source: {
                uuid: 'order-2',
                customerId: 'customer-456',
                items: [],
              },
            },
            {
              _source: {
                uuid: 'order-3',
                customerId: 'customer-123',
                items: [],
              },
            },
          ],
        },
      };

      const elasticsearchService = {
        search: jest.fn().mockResolvedValue(mockResponse),
      };

      const result = await executeManualFiltering(
        elasticsearchService as any,
        'orders',
        'customer-123',
        new PaginationDto(),
        new Logger(),
      );

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.data[0].customerId).toBe('customer-123');
      expect(result.data[1].customerId).toBe('customer-123');
    });

    it('should apply pagination correctly', async () => {
      const mockHits = [];
      for (let i = 1; i <= 15; i++) {
        mockHits.push({
          _source: {
            uuid: `order-${i}`,
            customerId: 'customer-123',
            items: [],
          },
        });
      }

      const elasticsearchService = {
        search: jest.fn().mockResolvedValue({
          hits: {
            total: { value: mockHits.length },
            hits: mockHits,
          },
        }),
      };

      const paginationDto = new PaginationDto();
      paginationDto.page = 2;
      paginationDto.limit = 5;

      const result = await executeManualFiltering(
        elasticsearchService as any,
        'orders',
        'customer-123',
        paginationDto,
        new Logger(),
      );

      expect(result.data.length).toBe(5);
      expect(result.total).toBe(15);
      expect(result.page).toBe(2);
      expect(result.pages).toBe(3);
      expect(result.data[0].uuid).toBe('order-6');
    });

    it('should return empty results when no orders found for the customer', async () => {
      const mockResponse = {
        hits: {
          total: { value: 2 },
          hits: [
            {
              _source: {
                uuid: 'order-1',
                customerId: 'customer-456',
                items: [],
              },
            },
            {
              _source: {
                uuid: 'order-2',
                customerId: 'customer-456',
                items: [],
              },
            },
          ],
        },
      };

      const elasticsearchService = {
        search: jest.fn().mockResolvedValue(mockResponse),
      };

      const result = await executeManualFiltering(
        elasticsearchService as any,
        'orders',
        'customer-123',
        new PaginationDto(),
        new Logger(),
      );

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
