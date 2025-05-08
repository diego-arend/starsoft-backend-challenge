import { Test, TestingModule } from '@nestjs/testing';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { LoggerService } from '../../../logger/logger.service';
import { OrderEventListener } from './order-event.listener';
import { OrderEventType, OrderEvent } from '../types/order-events.types';
import { Order, OrderStatus } from '../entities/order.entity';
import { createSampleOrder } from '../test/test.providers';

describe('OrderEventListener', () => {
  let listener: OrderEventListener;
  let elasticsearchService: ElasticsearchService;

  let elasticsearchOperations: {
    operation: string;
    params: any;
  }[] = [];

  let sampleOrder: Order;
  let sampleEvent: OrderEvent;

  beforeEach(async () => {
    elasticsearchOperations = [];

    sampleOrder = createSampleOrder();

    sampleEvent = {
      type: OrderEventType.CREATED,
      orderUuid: sampleOrder.uuid,
      payload: sampleOrder,
    };

    const mockElasticsearchService = {
      index: jest.fn().mockImplementation((params) => {
        elasticsearchOperations.push({ operation: 'index', params });
        return Promise.resolve({ result: 'created' });
      }),
      update: jest.fn().mockImplementation((params) => {
        elasticsearchOperations.push({ operation: 'update', params });
        return Promise.resolve({ result: 'updated' });
      }),
      delete: jest.fn().mockImplementation((params) => {
        elasticsearchOperations.push({ operation: 'delete', params });
        return Promise.resolve({ result: 'deleted' });
      }),
    };

    const mockLoggerService = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderEventListener,
        {
          provide: ElasticsearchService,
          useValue: mockElasticsearchService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    listener = module.get<OrderEventListener>(OrderEventListener);
    elasticsearchService =
      module.get<ElasticsearchService>(ElasticsearchService);
  });

  describe('handleOrderCreatedEvent', () => {
    it('should index a new order document in Elasticsearch', async () => {
      await listener.handleOrderCreatedEvent(sampleEvent);

      expect(elasticsearchOperations.length).toBe(1);
      expect(elasticsearchOperations[0].operation).toBe('index');

      const indexParams = elasticsearchOperations[0].params;
      expect(indexParams.index).toBe('orders');
      expect(indexParams.id).toBe(sampleOrder.uuid);

      const document = indexParams.document;
      expect(document.uuid).toBe(sampleOrder.uuid);
      expect(document.customerId).toBe(sampleOrder.customerId);
      expect(document.status).toBe(sampleOrder.status);
      expect(document.total).toBe(sampleOrder.total);

      expect(document.items.length).toBe(sampleOrder.items.length);
      expect(document.items[0].productId).toBe(sampleOrder.items[0].productId);
      expect(document.items[0].price).toBe(sampleOrder.items[0].price);
    });

    it('should handle errors from Elasticsearch during indexing', async () => {
      jest
        .spyOn(elasticsearchService, 'index')
        .mockRejectedValueOnce(new Error('Indexing failed'));

      await expect(
        listener.handleOrderCreatedEvent(sampleEvent),
      ).resolves.not.toThrow();
    });
  });

  describe('handleOrderUpdatedEvent', () => {
    it('should update an existing order document in Elasticsearch', async () => {
      sampleOrder.status = OrderStatus.PROCESSING;
      sampleEvent = {
        type: OrderEventType.UPDATED,
        orderUuid: sampleOrder.uuid,
        payload: sampleOrder,
      };

      await listener.handleOrderUpdatedEvent(sampleEvent);

      expect(elasticsearchOperations.length).toBe(1);
      expect(elasticsearchOperations[0].operation).toBe('update');

      const updateParams = elasticsearchOperations[0].params;
      expect(updateParams.index).toBe('orders');
      expect(updateParams.id).toBe(sampleOrder.uuid);

      const doc = updateParams.doc;
      expect(doc.status).toBe(OrderStatus.PROCESSING);
    });

    it('should handle errors from Elasticsearch during update', async () => {
      jest
        .spyOn(elasticsearchService, 'update')
        .mockRejectedValueOnce(new Error('Update failed'));

      await expect(
        listener.handleOrderUpdatedEvent(sampleEvent),
      ).resolves.not.toThrow();
    });
  });

  describe('handleOrderCanceledEvent', () => {
    it('should update an order with CANCELED status in Elasticsearch', async () => {
      sampleOrder.status = OrderStatus.CANCELED;
      sampleEvent = {
        type: OrderEventType.CANCELED,
        orderUuid: sampleOrder.uuid,
        payload: sampleOrder,
      };

      await listener.handleOrderCanceledEvent(sampleEvent);

      expect(elasticsearchOperations.length).toBe(1);
      expect(elasticsearchOperations[0].operation).toBe('update');

      const updateParams = elasticsearchOperations[0].params;
      expect(updateParams.doc.status).toBe(OrderStatus.CANCELED);
    });
  });

  describe('handleOrderDeletedEvent', () => {
    it('should remove an order document from Elasticsearch', async () => {
      sampleEvent = {
        type: OrderEventType.DELETED,
        orderUuid: sampleOrder.uuid,
        payload: sampleOrder,
      };

      await listener.handleOrderDeletedEvent(sampleEvent);

      expect(elasticsearchOperations.length).toBe(1);
      expect(elasticsearchOperations[0].operation).toBe('delete');

      const deleteParams = elasticsearchOperations[0].params;
      expect(deleteParams.index).toBe('orders');
      expect(deleteParams.id).toBe(sampleOrder.uuid);
    });

    it('should handle errors from Elasticsearch during deletion', async () => {
      jest
        .spyOn(elasticsearchService, 'delete')
        .mockRejectedValueOnce(new Error('Deletion failed'));

      sampleEvent = {
        type: OrderEventType.DELETED,
        orderUuid: sampleOrder.uuid,
        payload: sampleOrder,
      };

      await expect(
        listener.handleOrderDeletedEvent(sampleEvent),
      ).resolves.not.toThrow();
    });
  });

  describe('prepareOrderDocument', () => {
    it('should properly format the order document for Elasticsearch', async () => {
      await listener.handleOrderCreatedEvent(sampleEvent);

      const document = elasticsearchOperations[0].params.document;

      expect(document).toHaveProperty('uuid');
      expect(document).toHaveProperty('customerId');
      expect(document).toHaveProperty('status');
      expect(document).toHaveProperty('total');
      expect(document).toHaveProperty('createdAt');
      expect(document).toHaveProperty('updatedAt');
      expect(document).toHaveProperty('items');

      document.items.forEach((item: any, index: number) => {
        expect(item).toHaveProperty('uuid');
        expect(item).toHaveProperty('productId');
        expect(item).toHaveProperty('productName');
        expect(item).toHaveProperty('price');
        expect(item).toHaveProperty('quantity');
        expect(item).toHaveProperty('subtotal');

        expect(item.productId).toBe(sampleOrder.items[index].productId);
        expect(item.price).toBe(sampleOrder.items[index].price);
        expect(item.quantity).toBe(sampleOrder.items[index].quantity);
      });
    });
  });
});
