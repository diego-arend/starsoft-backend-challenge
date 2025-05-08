import {
  mapElasticsearchResponseToOrders,
  prepareOrderDocument,
  formatElasticsearchErrorMessage,
  mapResponseToOrderEntity,
} from './elasticsearch.helpers';
import { OrderStatus } from '../entities/order.entity';
import { createSampleOrder } from '../test/test.providers';
import { Order } from '../entities/order.entity';
import { OrderDocument } from '../interfaces/order-document.interface';
import { createSampleElasticsearchResponse } from '../test/elasticsearch-test.providers';

describe('Elasticsearch Helpers', () => {
  describe('mapElasticsearchResponseToOrders', () => {
    it('should correctly map Elasticsearch response to Order array', () => {
      const esResponse = createSampleElasticsearchResponse();

      const orders = mapElasticsearchResponseToOrders(esResponse);

      expect(orders).toBeInstanceOf(Array);
      expect(orders.length).toBe(2);
      expect(orders[0]).toBeInstanceOf(Order);
      expect(orders[0].uuid).toBe('order-1');
      expect(orders[0].customerId).toBe('customer-123');
      expect(orders[0].status).toBe(OrderStatus.PENDING);
      expect(orders[0].total).toBe(3000);
      expect(orders[0].items.length).toBe(2);
      expect(orders[0].items[0].productId).toBe('product-1');
      expect(orders[0].items[0].price).toBe(1000);
      expect(orders[0].items[0].quantity).toBe(2);
    });

    it('should handle items when not present in the source', () => {
      const esResponse = {
        hits: {
          hits: [
            {
              _id: '1',
              _source: {
                uuid: 'order-no-items',
                customerId: 'customer-456',
                status: OrderStatus.PENDING,
                total: 0,
                createdAt: '2023-03-01T00:00:00.000Z',
                updatedAt: '2023-03-01T00:00:00.000Z',
              },
            },
          ],
        },
      };

      const orders = mapElasticsearchResponseToOrders(esResponse);

      expect(orders).toBeInstanceOf(Array);
      expect(orders.length).toBe(1);
      expect(orders[0].items).toBeInstanceOf(Array);
      expect(orders[0].items.length).toBe(0);
    });

    it('should handle empty response', () => {
      const esResponse = { hits: { hits: [] } };

      const orders = mapElasticsearchResponseToOrders(esResponse);

      expect(orders).toBeInstanceOf(Array);
      expect(orders.length).toBe(0);
    });
  });

  describe('prepareOrderDocument', () => {
    it('should correctly format Order for Elasticsearch indexing', () => {
      const order = createSampleOrder();
      const createdAt = new Date('2023-01-01T00:00:00.000Z');
      const updatedAt = new Date('2023-01-02T00:00:00.000Z');
      order.createdAt = createdAt;
      order.updatedAt = updatedAt;

      const document = prepareOrderDocument(order);

      expect(document).toBeDefined();
      expect(document.uuid).toBe(order.uuid);
      expect(document.customerId).toBe(order.customerId);
      expect(document.status).toBe(order.status);
      expect(document.total).toBe(order.total);

      const documentCreatedDate =
        typeof document.createdAt === 'string'
          ? new Date(document.createdAt)
          : document.createdAt;

      const documentUpdatedDate =
        typeof document.updatedAt === 'string'
          ? new Date(document.updatedAt)
          : document.updatedAt;

      expect(documentCreatedDate.getTime()).toBe(createdAt.getTime());
      expect(documentUpdatedDate.getTime()).toBe(updatedAt.getTime());

      expect(document.items).toBeInstanceOf(Array);
      expect(document.items.length).toBe(order.items.length);
      expect(document.items[0].uuid).toBe(order.items[0].uuid);
      expect(document.items[0].productId).toBe(order.items[0].productId);
      expect(document.items[0].price).toBe(order.items[0].price);
    });

    it('should handle empty items array', () => {
      const order = createSampleOrder();
      order.items = [];

      const document = prepareOrderDocument(order);

      expect(document).toBeDefined();
      expect(document.items).toBeInstanceOf(Array);
      expect(document.items.length).toBe(0);
    });
  });

  describe('formatElasticsearchErrorMessage', () => {
    it('should format error message with operation and error details', () => {
      const operation = 'index document';
      const error = new Error('Connection refused');

      const message = formatElasticsearchErrorMessage(operation, error);

      expect(message).toBe(
        'Failed to index document in Elasticsearch: Connection refused',
      );
    });

    it('should handle error without message property', () => {
      const operation = 'search';
      const error = {};
      const message = formatElasticsearchErrorMessage(operation, error);

      expect(message).toBe('Failed to search in Elasticsearch: undefined');
    });
  });

  describe('mapResponseToOrderEntity', () => {
    it('should map OrderDocument to Order entity with all fields', () => {
      const dateStr = '2023-04-15T10:30:00.000Z';
      const createdAtDate = new Date(dateStr);
      const updatedAtDate = new Date('2023-04-15T11:45:00.000Z');

      const source: OrderDocument = {
        uuid: 'order-123',
        id: 42,
        customerId: 'customer-456',
        status: OrderStatus.PENDING,
        total: 5000,
        createdAt: createdAtDate,
        updatedAt: updatedAtDate,
        items: [
          {
            uuid: 'item-1',
            id: 101,
            productId: 'product-abc',
            productName: 'Test Product',
            price: 2500,
            quantity: 2,
            subtotal: 5000,
          },
        ],
      };

      const result = mapResponseToOrderEntity(source);

      expect(result).toBeInstanceOf(Order);
      expect(result.uuid).toBe('order-123');
      expect(result.id).toBe(42);
      expect(result.customerId).toBe('customer-456');
      expect(result.status).toBe(OrderStatus.PENDING);
      expect(result.total).toBe(5000);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.createdAt.toISOString()).toBe(dateStr);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.updatedAt.toISOString()).toBe('2023-04-15T11:45:00.000Z');
      expect(result.items.length).toBe(1);
      expect(result.items[0].uuid).toBe('item-1');
      expect(result.items[0].id).toBe(101);
      expect(result.items[0].productId).toBe('product-abc');
      expect(result.items[0].productName).toBe('Test Product');
      expect(result.items[0].price).toBe(2500);
      expect(result.items[0].quantity).toBe(2);
      expect(result.items[0].subtotal).toBe(5000);
    });

    it('should handle null source by returning null', () => {
      const result = mapResponseToOrderEntity(null);
      expect(result).toBeNull();
    });

    it('should handle undefined dates', () => {
      const source: OrderDocument = {
        uuid: 'order-123',
        customerId: 'customer-456',
        status: OrderStatus.PENDING,
        total: 1000,
        items: [],
      } as OrderDocument;

      const result = mapResponseToOrderEntity(source);

      expect(result).toBeInstanceOf(Order);
      expect(result.uuid).toBe('order-123');
      expect(result.createdAt).toBeUndefined();
      expect(result.updatedAt).toBeUndefined();
    });

    it('should handle empty items array', () => {
      const source: OrderDocument = {
        uuid: 'order-empty-items',
        customerId: 'customer-789',
        status: OrderStatus.DELIVERED,
        total: 0,
        createdAt: new Date('2023-05-20T14:00:00.000Z'),
        updatedAt: new Date('2023-05-20T14:00:00.000Z'),
        items: [],
      };

      const result = mapResponseToOrderEntity(source);

      expect(result).toBeInstanceOf(Order);
      expect(result.items).toBeInstanceOf(Array);
      expect(result.items.length).toBe(0);
    });

    it('should handle missing items field', () => {
      const source: OrderDocument = {
        uuid: 'order-no-items',
        customerId: 'customer-321',
        status: OrderStatus.CANCELED,
        total: 0,
        createdAt: new Date('2023-06-10T09:15:00.000Z'),
        updatedAt: new Date('2023-06-10T09:15:00.000Z'),
        items: [],
      };

      const sourceWithoutItems = { ...source };
      delete (sourceWithoutItems as any).items;

      const result = mapResponseToOrderEntity(sourceWithoutItems as any);

      expect(result).toBeInstanceOf(Order);
      expect(result.items).toBeInstanceOf(Array);
      expect(result.items.length).toBe(0);
    });

    it('should convert date strings to Date objects', () => {
      const dateStr = '2023-07-01T12:00:00.000Z';
      const sourceWithStringDates = {
        uuid: 'order-with-dates',
        customerId: 'customer-date-test',
        status: OrderStatus.PENDING,
        total: 1500,
        createdAt: dateStr,
        updatedAt: dateStr,
        items: [],
      };

      const result = mapResponseToOrderEntity(sourceWithStringDates as any);

      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.createdAt.getTime()).toBe(new Date(dateStr).getTime());
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.updatedAt.getTime()).toBe(new Date(dateStr).getTime());
    });
  });
});
