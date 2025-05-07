import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { LoggerService } from '../../../logger/logger.service';
import { Order } from '../entities/order.entity';
import { OrderDocument } from '../interfaces/order-document.interface';
import { mapElasticsearchResponseToOrders } from '../helpers/elasticsearch.helpers';
import { ElasticsearchSearchException } from '../exceptions/elasticsearch-exceptions';

/**
 * Service for handling Elasticsearch operations related to orders
 */
@Injectable()
export class OrderElasticsearchService {
  private readonly indexName = 'orders';

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly logger: LoggerService,
  ) {}

  //---------------------------------------------
  // Write operations (indexing, updating)
  //---------------------------------------------

  /**
   * Indexes an order in Elasticsearch
   *
   * @param order The order to be indexed
   */
  async indexOrder(order: Order): Promise<void> {
    try {
      const orderDocument = this.prepareOrderDocument(order);

      await this.elasticsearchService.index({
        index: this.indexName,
        id: order.uuid,
        document: orderDocument,
      });

      this.logger.log(
        `Order ${order.uuid} indexed in Elasticsearch`,
        'OrderElasticsearchService',
      );
    } catch (error) {
      this.logger.error(
        `Failed to index order in Elasticsearch: ${error.message}`,
        error.stack,
        'OrderElasticsearchService',
      );

      this.recordFailedOperation('index', order.uuid);
    }
  }

  /**
   * Updates an order in Elasticsearch
   *
   * @param order The updated order
   */
  async updateOrder(order: Order): Promise<void> {
    try {
      const orderDocument = this.prepareOrderDocument(order);
      const exists = await this.elasticsearchService.exists({
        index: this.indexName,
        id: order.uuid,
      });

      if (exists) {
        await this.elasticsearchService.update({
          index: this.indexName,
          id: order.uuid,
          doc: orderDocument,
        });

        this.logger.log(
          `Order ${order.uuid} updated in Elasticsearch`,
          'OrderElasticsearchService',
        );
      } else {
        await this.indexOrder(order);
      }
    } catch (error) {
      this.logger.error(
        `Failed to update order in Elasticsearch: ${error.message}`,
        error.stack,
        'OrderElasticsearchService',
      );

      this.recordFailedOperation('update', order.uuid);
    }
  }

  /**
   * Removes an order from Elasticsearch
   *
   * @param orderUuid The UUID of the order to remove
   */
  async removeOrder(orderUuid: string): Promise<void> {
    try {
      await this.elasticsearchService.delete({
        index: this.indexName,
        id: orderUuid,
      });

      this.logger.log(
        `Order ${orderUuid} removed from Elasticsearch`,
        'OrderElasticsearchService',
      );
    } catch (error) {
      this.logger.error(
        `Failed to remove order from Elasticsearch: ${error.message}`,
        error.stack,
        'OrderElasticsearchService',
      );

      this.recordFailedOperation('delete', orderUuid);
    }
  }

  //---------------------------------------------
  // Read operations (search, query)
  //---------------------------------------------

  /**
   * Finds all orders in Elasticsearch
   *
   * @returns Array of orders
   */
  async findAll(): Promise<Order[]> {
    try {
      const searchResponse =
        await this.elasticsearchService.search<OrderDocument>({
          index: this.indexName,
          sort: [{ createdAt: { order: 'desc' } }],
          size: 1000,
        });

      return mapElasticsearchResponseToOrders(searchResponse);
    } catch (error) {
      this.logger.error(
        `Failed to fetch orders from Elasticsearch: ${error.message}`,
        error.stack,
        'OrderElasticsearchService',
      );
      throw new ElasticsearchSearchException('all orders', error);
    }
  }

  /**
   * Finds orders by customer in Elasticsearch
   *
   * @param customerId Customer ID
   * @returns Array of customer orders
   */
  async findByCustomer(customerId: string): Promise<Order[]> {
    try {
      const searchResponse =
        await this.elasticsearchService.search<OrderDocument>({
          index: this.indexName,
          query: {
            match: {
              customerId: customerId,
            },
          },
          sort: [{ createdAt: { order: 'desc' } }],
          size: 1000,
        });

      return mapElasticsearchResponseToOrders(searchResponse);
    } catch (error) {
      this.logger.error(
        `Failed to fetch customer orders from Elasticsearch: ${error.message}`,
        error.stack,
        'OrderElasticsearchService',
      );
      throw new ElasticsearchSearchException(
        `customer ${customerId} orders`,
        error,
      );
    }
  }

  /**
   * Finds an order by UUID in Elasticsearch
   *
   * @param uuid Order UUID
   * @returns Order found or null
   */
  async findOneByUuid(uuid: string): Promise<Order | null> {
    try {
      const searchResponse =
        await this.elasticsearchService.search<OrderDocument>({
          index: this.indexName,
          query: {
            match: {
              uuid: uuid,
            },
          },
        });

      const orders = mapElasticsearchResponseToOrders(searchResponse);
      return orders.length > 0 ? orders[0] : null;
    } catch (error) {
      this.logger.error(
        `Failed to fetch order from Elasticsearch: ${error.message}`,
        error.stack,
        'OrderElasticsearchService',
      );
      return null;
    }
  }

  /**
   * Performs a generic search for orders using custom query
   *
   * @param query Search query parameters
   * @returns Search results
   */
  async searchOrders(query: any): Promise<any> {
    try {
      const response = await this.elasticsearchService.search({
        index: this.indexName,
        ...query,
      });

      return response.hits;
    } catch (error) {
      this.logger.error(
        `Failed to search orders in Elasticsearch: ${error.message}`,
        error.stack,
        'OrderElasticsearchService',
      );

      throw error; // Propagate error as this is a primary read operation
    }
  }

  //---------------------------------------------
  // Helper methods
  //---------------------------------------------

  /**
   * Prepares a document for indexing/updating in Elasticsearch
   *
   * @param order The order to be prepared
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

  /**
   * Records failed Elasticsearch operations for later reconciliation
   *
   * @param operation Type of failed operation (index/update/delete)
   * @param orderUuid UUID of the problematic order
   */
  private recordFailedOperation(operation: string, orderUuid: string): void {
    // In a real implementation, this would save failed operations
    // in a reconciliation table for later processing

    this.logger.warn(
      `Recorded failed Elasticsearch ${operation} operation for order ${orderUuid}`,
      'OrderElasticsearchService',
    );
  }
}
