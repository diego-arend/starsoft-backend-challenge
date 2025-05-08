import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { LoggerService } from '../../../logger/logger.service';
import { Order } from '../entities/order.entity';
import {
  formatElasticsearchErrorMessage,
  mapElasticsearchResponseToOrders,
  prepareOrderDocument,
} from '../helpers/elasticsearch.helpers';
import { OrderReconciliationService } from './order-reconciliation.service';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { PaginationService } from '../../../common/services/pagination.service';
import { ElasticsearchSearchException } from '../exceptions/elasticsearch-exceptions';
import { mapResponseToOrderEntity } from '../helpers/elasticsearch.helpers';
import { OrderDocument } from '../interfaces/order-document.interface';

/**
 * Service for handling Elasticsearch operations related to orders
 */
@Injectable()
export class OrderElasticsearchService {
  private readonly indexName = 'orders';

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly logger: LoggerService,
    private readonly reconciliationService: OrderReconciliationService,
    private readonly paginationService: PaginationService,
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
      const orderDocument = prepareOrderDocument(order);

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
      const errorMessage = formatElasticsearchErrorMessage(
        'index order',
        error,
      );
      this.logger.error(errorMessage, error.stack, 'OrderElasticsearchService');

      // Record the failed operation for later reconciliation
      await this.reconciliationService.recordFailedOperation(
        'index',
        order.uuid,
        error.message,
      );
    }
  }

  /**
   * Updates an order in Elasticsearch
   *
   * @param order The updated order
   */
  async updateOrder(order: Order): Promise<void> {
    try {
      const orderDocument = prepareOrderDocument(order);
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
      const errorMessage = formatElasticsearchErrorMessage(
        'update order',
        error,
      );
      this.logger.error(errorMessage, error.stack, 'OrderElasticsearchService');

      // Record the failed operation for later reconciliation
      await this.reconciliationService.recordFailedOperation(
        'update',
        order.uuid,
        error.message,
      );
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
      const errorMessage = formatElasticsearchErrorMessage(
        'remove order',
        error,
      );
      this.logger.error(errorMessage, error.stack, 'OrderElasticsearchService');

      // Record the failed operation for later reconciliation
      await this.reconciliationService.recordFailedOperation(
        'delete',
        orderUuid,
        error.message,
      );
    }
  }

  //---------------------------------------------
  // Read operations (search, query)
  //---------------------------------------------

  /**
   * Finds all orders in Elasticsearch
   *
   * @returns Paginated result of orders
   */
  async findAll(
    paginationDto: PaginationDto = {},
  ): Promise<PaginatedResult<Order>> {
    const { from, size, page, limit } =
      this.paginationService.getElasticsearchPaginationParams(paginationDto);

    try {
      const response = await this.elasticsearchService.search({
        index: this.indexName,
        from,
        size,
        sort: [{ createdAt: { order: 'desc' } }],
      });

      const hits = response.hits.hits;
      const total =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total.value;

      const orders = hits.map((hit) =>
        mapResponseToOrderEntity(hit._source as OrderDocument),
      );

      return this.paginationService.createPaginatedResult(
        orders,
        total,
        page,
        limit,
      );
    } catch (error) {
      this.logger.error(
        formatElasticsearchErrorMessage('find all orders', error),
        error.stack,
        'OrderElasticsearchService',
      );

      throw new ElasticsearchSearchException('orders', {
        paginationParams: { from, size, page, limit },
        originalError: error.message,
        query: { sort: [{ createdAt: { order: 'desc' } }] },
      });
    }
  }

  /**
   * Finds orders by customer in Elasticsearch
   *
   * @param customerId Customer ID
   * @returns Paginated result of customer orders
   */
  async findByCustomer(
    customerId: string,
    paginationDto: PaginationDto = {},
  ): Promise<PaginatedResult<Order>> {
    const { from, size, page, limit } =
      this.paginationService.getElasticsearchPaginationParams(paginationDto);

    try {
      const response = await this.elasticsearchService.search({
        index: this.indexName,
        from,
        size,
        query: {
          match: {
            customerId: customerId,
          },
        },
        sort: [{ createdAt: { order: 'desc' } }],
      });

      const hits = response.hits.hits;
      const total =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total.value;

      const orders = hits.map((hit) =>
        mapResponseToOrderEntity(hit._source as OrderDocument),
      );

      return this.paginationService.createPaginatedResult(
        orders,
        total,
        page,
        limit,
      );
    } catch (error) {
      this.logger.error(
        formatElasticsearchErrorMessage(
          `find orders for customer ${customerId}`,
          error,
        ),
        error.stack,
        'OrderElasticsearchService',
      );

      throw new ElasticsearchSearchException('customer orders', {
        customerId,
        paginationParams: { from, size, page, limit },
        originalError: error.message,
        query: {
          match: { customerId },
          sort: [{ createdAt: { order: 'desc' } }],
        },
      });
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
      const searchResponse = await this.elasticsearchService.search({
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
        formatElasticsearchErrorMessage(`fetch order ${uuid}`, error),
        error.stack,
        'OrderElasticsearchService',
      );

      throw new ElasticsearchSearchException('order by uuid', {
        uuid,
        originalError: error.message,
        query: { match: { uuid } },
      });
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
        formatElasticsearchErrorMessage('search orders', error),
        error.stack,
        'OrderElasticsearchService',
      );

      throw new ElasticsearchSearchException('generic order search', {
        query,
        originalError: error.message,
      });
    }
  }
}
