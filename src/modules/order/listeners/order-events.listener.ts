import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderElasticsearchService } from '../services/order-elasticsearch.service';
import { OrderReconciliationService } from '../services/order-reconciliation.service';
import { OrderEventType } from '../types/order-events.types';
import { Order } from '../entities/order.entity';

@Injectable()
export class OrderEventsListener {
  private readonly logger = new Logger(OrderEventsListener.name);

  constructor(
    private readonly elasticsearchService: OrderElasticsearchService,
    private readonly reconciliationService: OrderReconciliationService,
  ) {}

  @OnEvent(OrderEventType.CREATED)
  async handleOrderCreatedEvent(payload: {
    orderUuid: string;
    payload: Order;
  }) {
    try {
      this.logger.log(
        `Handling order created event for: ${payload.orderUuid}`,
        'OrderEventsListener',
      );

      await this.elasticsearchService.indexOrder(payload.payload);

      this.logger.log(
        `Successfully indexed order ${payload.orderUuid} in Elasticsearch`,
        'OrderEventsListener',
      );
    } catch (error) {
      this.logger.error(
        `Failed to index order ${payload.orderUuid} in Elasticsearch: ${error.message}`,
        error.stack,
        'OrderEventsListener',
      );

      await this.reconciliationService.recordFailedOperation(
        'index',
        payload.orderUuid,
        error.message,
      );
    }
  }

  @OnEvent(OrderEventType.UPDATED)
  async handleOrderUpdatedEvent(payload: {
    orderUuid: string;
    payload: Order;
  }) {
    try {
      this.logger.log(
        `Handling order updated event for: ${payload.orderUuid}`,
        'OrderEventsListener',
      );

      await this.elasticsearchService.updateOrder(payload.payload);

      this.logger.log(
        `Successfully updated order ${payload.orderUuid} in Elasticsearch`,
        'OrderEventsListener',
      );
    } catch (error) {
      this.logger.error(
        `Failed to update order ${payload.orderUuid} in Elasticsearch: ${error.message}`,
        error.stack,
        'OrderEventsListener',
      );

      await this.reconciliationService.recordFailedOperation(
        'update',
        payload.orderUuid,
        error.message,
      );
    }
  }

  @OnEvent(OrderEventType.CANCELED)
  async handleOrderCanceledEvent(payload: {
    orderUuid: string;
    payload: Order;
  }) {
    try {
      this.logger.log(
        `Handling order canceled event for: ${payload.orderUuid}`,
        'OrderEventsListener',
      );

      await this.elasticsearchService.updateOrder(payload.payload);

      this.logger.log(
        `Successfully updated canceled order ${payload.orderUuid} in Elasticsearch`,
        'OrderEventsListener',
      );
    } catch (error) {
      this.logger.error(
        `Failed to update canceled order ${payload.orderUuid} in Elasticsearch: ${error.message}`,
        error.stack,
        'OrderEventsListener',
      );

      await this.reconciliationService.recordFailedOperation(
        'update',
        payload.orderUuid,
        error.message,
      );
    }
  }
}
