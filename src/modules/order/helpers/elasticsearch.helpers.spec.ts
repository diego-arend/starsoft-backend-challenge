import {
  mapElasticsearchResponseToOrders,
  prepareOrderDocument,
  formatElasticsearchErrorMessage,
} from './elasticsearch.helpers';
import { OrderStatus } from '../entities/order.entity';
import { createSampleOrder } from '../test/test.providers';
import { Order } from '../entities/order.entity';
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
      expect(document.createdAt).toBe(createdAt.toISOString());
      expect(document.updatedAt).toBe(updatedAt.toISOString());
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
});
