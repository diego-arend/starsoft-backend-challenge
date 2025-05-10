import { Test, TestingModule } from '@nestjs/testing';
import { OrderEventsService } from './order-events.service';
import { KafkaProducerService } from '../../../kafka/kafka-producer.service';
import { OrderStatus } from '../entities/order.entity';
import {
  OrderCreatedEvent,
  OrderStatusUpdatedEvent,
} from '../events/order-events.interface';
import { createSampleOrder } from '../test/test.providers';
import { v4 as uuidv4 } from 'uuid';
import { OrderItem } from '../entities/order-item.entity';

describe('OrderEventsService', () => {
  let service: OrderEventsService;
  let kafkaProducer: MockKafkaProducer;

  class MockKafkaProducer {
    publishedMessages: Array<{ topic: string; payload: any; key?: string }> =
      [];

    async publish(topic: string, payload: any, key?: string): Promise<void> {
      this.publishedMessages.push({ topic, payload, key });
      return Promise.resolve();
    }

    reset() {
      this.publishedMessages = [];
    }
  }

  beforeEach(async () => {
    kafkaProducer = new MockKafkaProducer();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderEventsService,
        {
          provide: KafkaProducerService,
          useValue: kafkaProducer,
        },
      ],
    }).compile();

    service = module.get<OrderEventsService>(OrderEventsService);
  });

  afterEach(() => {
    kafkaProducer.reset();
    jest.clearAllMocks();
  });

  describe('publishOrderCreated', () => {
    it('should publish an order_created event with correct data structure', async () => {
      const order = createSampleOrder();
      order.id = 1001;
      order.uuid = uuidv4();
      order.customerId = 'customer-123';
      order.status = OrderStatus.PENDING;
      order.total = 150.75;

      // Create a proper OrderItem
      const orderItem = new OrderItem();
      orderItem.id = 1;
      orderItem.uuid = uuidv4();
      orderItem.productId = 'prod-1';
      orderItem.productName = 'Test Product';
      orderItem.quantity = 2;
      orderItem.price = 75.5;
      orderItem.subtotal = 151.0;
      orderItem.orderUuid = order.uuid;

      order.items = [orderItem];

      await service.publishOrderCreated(order);

      expect(kafkaProducer.publishedMessages.length).toBe(1);

      const message = kafkaProducer.publishedMessages[0];
      expect(message.topic).toBe('order-events');
      expect(message.key).toBe(`order-${order.id}`);

      const payload = message.payload as OrderCreatedEvent;
      expect(payload.event_type).toBe('order_created');
      expect(payload.order_id).toBe(String(order.id));
      expect(payload.customer_id).toBe(order.customerId);
      expect(payload.status).toBe(order.status);
      expect(payload.total).toBe(order.total);
      expect(payload.items_count).toBe(order.items.length);
      expect(payload.metadata).toBeDefined();
      expect(payload.metadata.source).toBe('order-service');
      expect(payload.metadata.version).toBe('1.0');
    });

    it('should handle an order with no items', async () => {
      const order = createSampleOrder();
      order.items = undefined;

      await service.publishOrderCreated(order);

      const message = kafkaProducer.publishedMessages[0];
      const payload = message.payload as OrderCreatedEvent;
      expect(payload.items_count).toBe(0);
    });

    it('should handle errors during event publishing', async () => {
      const order = createSampleOrder();
      const errorSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation();

      jest.spyOn(kafkaProducer, 'publish').mockImplementation(() => {
        throw new Error('Kafka connection error');
      });

      await service.publishOrderCreated(order);

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('publishOrderStatusUpdated', () => {
    it('should publish an order_status_updated event with correct data structure', async () => {
      const order = createSampleOrder();
      order.id = 1002;
      order.uuid = uuidv4();
      order.customerId = 'customer-456';
      order.status = OrderStatus.PROCESSING;
      const previousStatus = OrderStatus.PENDING;

      await service.publishOrderStatusUpdated(order, previousStatus);

      expect(kafkaProducer.publishedMessages.length).toBe(1);

      const message = kafkaProducer.publishedMessages[0];
      expect(message.topic).toBe('order-events');
      expect(message.key).toBe(`order-${order.id}`);

      const payload = message.payload as OrderStatusUpdatedEvent;
      expect(payload.event_type).toBe('order_status_updated');
      expect(payload.order_id).toBe(String(order.id));
      expect(payload.customer_id).toBe(order.customerId);
      expect(payload.previous_status).toBe(previousStatus);
      expect(payload.new_status).toBe(order.status);
      expect(payload.updated_at).toBeDefined();
      expect(payload.metadata).toBeDefined();
      expect(payload.metadata.source).toBe('order-service');
      expect(payload.metadata.version).toBe('1.0');
    });

    it('should handle a status change to CANCELED', async () => {
      const order = createSampleOrder();
      order.status = OrderStatus.CANCELED;
      const previousStatus = OrderStatus.PROCESSING;

      await service.publishOrderStatusUpdated(order, previousStatus);

      const message = kafkaProducer.publishedMessages[0];
      const payload = message.payload as OrderStatusUpdatedEvent;
      expect(payload.previous_status).toBe(previousStatus);
      expect(payload.new_status).toBe(OrderStatus.CANCELED);
    });

    it('should handle errors during event publishing', async () => {
      const order = createSampleOrder();
      const previousStatus = OrderStatus.PENDING;
      const errorSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation();

      jest.spyOn(kafkaProducer, 'publish').mockImplementation(() => {
        throw new Error('Kafka connection error');
      });

      await service.publishOrderStatusUpdated(order, previousStatus);

      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
