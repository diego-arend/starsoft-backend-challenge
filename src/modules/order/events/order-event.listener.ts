import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderEventType, OrderEvent } from '../types/order-events.types';
import { LoggerService } from '../../../logger/logger.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { Order } from '../entities/order.entity';

/**
 * Listener for order events that updates Elasticsearch index accordingly
 */
@Injectable()
export class OrderEventListener {
  private readonly indexName = 'orders';

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Handles order creation events by indexing the order in Elasticsearch
   *
   * @param event Order created event payload
   */
  @OnEvent(OrderEventType.CREATED)
  async handleOrderCreatedEvent(event: OrderEvent): Promise<void> {
    this.logger.log(
      `Processing order created event for order ${event.orderUuid}`,
      'OrderEventListener',
    );

    await this.indexOrder(event.payload);
  }

  /**
   * Handles order update events by updating the order in Elasticsearch
   *
   * @param event Order updated event payload
   */
  @OnEvent(OrderEventType.UPDATED)
  async handleOrderUpdatedEvent(event: OrderEvent): Promise<void> {
    this.logger.log(
      `Processing order updated event for order ${event.orderUuid}`,
      'OrderEventListener',
    );

    await this.updateOrder(event.payload);
  }

  /**
   * Handles order cancellation events by updating the order status in Elasticsearch
   *
   * @param event Order canceled event payload
   */
  @OnEvent(OrderEventType.CANCELED)
  async handleOrderCanceledEvent(event: OrderEvent): Promise<void> {
    this.logger.log(
      `Processing order canceled event for order ${event.orderUuid}`,
      'OrderEventListener',
    );

    // Canceled orders are still kept in the index, just with updated status
    await this.updateOrder(event.payload);
  }

  /**
   * Handles order deletion events by removing the order from Elasticsearch
   *
   * @param event Order deleted event payload
   */
  @OnEvent(OrderEventType.DELETED)
  async handleOrderDeletedEvent(event: OrderEvent): Promise<void> {
    this.logger.log(
      `Processing order deleted event for order ${event.orderUuid}`,
      'OrderEventListener',
    );

    await this.removeOrder(event.orderUuid);
  }

  /**
   * Indexes an order in Elasticsearch
   *
   * @param order Order to be indexed
   */
  private async indexOrder(order: Order): Promise<void> {
    try {
      await this.elasticsearchService.index({
        index: this.indexName,
        id: order.uuid,
        document: this.prepareOrderDocument(order),
      });

      this.logger.log(
        `Order ${order.uuid} indexed in Elasticsearch`,
        'OrderEventListener',
      );
    } catch (error) {
      this.logger.error(
        `Failed to index order in Elasticsearch: ${error.message}`,
        error.stack,
        'OrderEventListener',
      );
    }
  }

  /**
   * Updates an order in Elasticsearch
   *
   * @param order Order to be updated
   */
  private async updateOrder(order: Order): Promise<void> {
    try {
      await this.elasticsearchService.update({
        index: this.indexName,
        id: order.uuid,
        doc: this.prepareOrderDocument(order),
      });

      this.logger.log(
        `Order ${order.uuid} updated in Elasticsearch`,
        'OrderEventListener',
      );
    } catch (error) {
      this.logger.error(
        `Failed to update order in Elasticsearch: ${error.message}`,
        error.stack,
        'OrderEventListener',
      );
    }
  }

  /**
   * Removes an order from Elasticsearch
   *
   * @param orderUuid UUID of the order to be removed
   */
  private async removeOrder(orderUuid: string): Promise<void> {
    try {
      await this.elasticsearchService.delete({
        index: this.indexName,
        id: orderUuid,
      });

      this.logger.log(
        `Order ${orderUuid} removed from Elasticsearch`,
        'OrderEventListener',
      );
    } catch (error) {
      this.logger.error(
        `Failed to remove order from Elasticsearch: ${error.message}`,
        error.stack,
        'OrderEventListener',
      );
    }
  }

  /**
   * Prepares an order document for Elasticsearch
   *
   * @param order Order to be prepared
   * @returns Document formatted for Elasticsearch
   */
  private prepareOrderDocument(order: Order): any {
    return {
      uuid: order.uuid,
      customerId: order.customerId,
      status: order.status,
      total: order.total,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((item) => ({
        uuid: item.uuid,
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal,
      })),
    };
  }
}
