import { Injectable, Logger } from '@nestjs/common';
import { Order } from '../entities/order.entity';
import { KafkaProducerService } from '../../../kafka/kafka-producer.service';
import {
  OrderCreatedEvent,
  OrderStatusUpdatedEvent,
} from '../events/order-events.interface';

@Injectable()
export class OrderEventsService {
  private readonly logger = new Logger(OrderEventsService.name);

  private readonly TOPIC_ORDER_EVENTS = 'order-events';
  private readonly EVENT_ORDER_CREATED = 'order_created';
  private readonly EVENT_ORDER_STATUS_UPDATED = 'order_status_updated';

  constructor(private readonly kafkaProducer: KafkaProducerService) {}

  /**
   * Publishes an order creation event
   * @param order The created order
   */
  async publishOrderCreated(order: Order): Promise<void> {
    try {
      const eventPayload: OrderCreatedEvent = {
        event_type: this.EVENT_ORDER_CREATED,
        order_id: String(order.id),
        customer_id: order.customerId,
        status: order.status,
        total: order.total,
        items_count: order.items?.length || 0,
        created_at: order.createdAt,
        metadata: {
          source: 'order-service',
          version: '1.0',
          timestamp: new Date().toISOString(),
        },
      };

      this.logger.log(
        `Publishing event ${this.EVENT_ORDER_CREATED} for order ${order.id}`,
      );
      await this.kafkaProducer.publish(
        this.TOPIC_ORDER_EVENTS,
        eventPayload,
        `order-${order.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Error publishing creation event for order ${order.id}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Publishes an order status update event
   * @param order The updated order
   * @param previousStatus Previous order status
   */
  async publishOrderStatusUpdated(
    order: Order,
    previousStatus: string,
  ): Promise<void> {
    try {
      const eventPayload: OrderStatusUpdatedEvent = {
        event_type: this.EVENT_ORDER_STATUS_UPDATED,
        order_id: String(order.id),
        customer_id: order.customerId,
        previous_status: previousStatus,
        new_status: order.status,
        updated_at: new Date().toISOString(),
        metadata: {
          source: 'order-service',
          version: '1.0',
          timestamp: new Date().toISOString(),
        },
      };

      this.logger.log(
        `Publishing event ${this.EVENT_ORDER_STATUS_UPDATED} for order ${order.id}`,
      );
      await this.kafkaProducer.publish(
        this.TOPIC_ORDER_EVENTS,
        eventPayload,
        `order-${order.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Error publishing status update event for order ${order.id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
