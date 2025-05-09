import { Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import {
  createEmptyPaginatedResult,
  createPaginatedResult,
} from '../../../common/helpers/pagination.helpers';
import { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';

const logger = new Logger('ElasticsearchHelpers');

/**
 * Prepares an order document for indexing in Elasticsearch
 * This function processes the order data into a format suitable for Elasticsearch,
 * including handling any nested relationships and specific field transformations
 *
 * @param order - The order entity to prepare for indexing
 * @returns A processed document ready to be indexed in Elasticsearch
 */
export function prepareOrderDocument(order: Order): any {
  const document = {
    uuid: order.uuid,
    customerId: order.customerId,
    status: order.status,
    total: order.total,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items:
      order.items?.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
      })) || [],
  };

  logger.debug(`Prepared order document for ${order.uuid}`);
  return document;
}

/**
 * Extracts the most recent state of an order from Elasticsearch hit source
 *
 * @param hitSource - The _source field from an Elasticsearch hit
 * @returns Order entity with the most recent state
 */
export function extractMostRecentOrderState(hitSource: any): Order {
  try {
    const order = new Order();

    order.uuid = hitSource.uuid;
    order.customerId = hitSource.customerId;
    order.status = hitSource.status;
    order.total = hitSource.total;
    order.createdAt = new Date(hitSource.createdAt);
    order.updatedAt = new Date(hitSource.updatedAt);

    if (hitSource.items && Array.isArray(hitSource.items)) {
      order.items = hitSource.items.map((item) => {
        const orderItem = new OrderItem();
        orderItem.id = item.id;
        orderItem.productId = item.productId;
        orderItem.productName = item.productName;
        orderItem.quantity = item.quantity;
        orderItem.price = item.price;

        orderItem.order = order;
        return orderItem;
      });
    }

    return order;
  } catch (error) {
    logger.error(`Error extracting order state: ${error.message}`, error.stack);
    throw new Error(`Failed to extract order state: ${error.message}`);
  }
}

/**
 * Maps the entire Elasticsearch response to an array of Order entities
 *
 * @param response - The Elasticsearch search response
 * @returns Array of Order entities
 */
export function mapElasticsearchResponseToOrders(response: any): Order[] {
  if (!response?.hits?.hits || !Array.isArray(response.hits.hits)) {
    return [];
  }

  return response.hits.hits.map((hit) =>
    extractMostRecentOrderState(hit._source),
  );
}

/**
 * Gets the total count from elasticsearch response
 * @param total - The total hits from elasticsearch response
 * @returns The actual count as a number
 */
export function getTotalCount(total: number | SearchTotalHits): number {
  return typeof total === 'number' ? total : total.value;
}

/**
 * Executes a customer search using keyword match
 * @param elasticsearchService - The elasticsearch service
 * @param indexName - The index to search in
 * @param customerId - The customer ID to search for
 * @param paginationDto - Pagination parameters
 * @param serviceLogger - Logger for tracking execution
 * @returns Paginated result with orders if found
 */
export async function executeKeywordSearch(
  elasticsearchService: ElasticsearchService,
  indexName: string,
  customerId: string,
  paginationDto: PaginationDto,
  serviceLogger: Logger,
): Promise<PaginatedResult<Order>> {
  try {
    const { page = 1, limit = 10 } = paginationDto;
    const from = (page - 1) * limit;
    const size = limit;

    const response = await elasticsearchService.search({
      index: indexName,
      from,
      size,
      query: {
        match: {
          customerId: customerId,
        },
      },
      sort: [{ createdAt: { order: 'desc' } }],
    });

    if (response.hits && response.hits.hits && response.hits.hits.length > 0) {
      const orders = response.hits.hits.map((hit) =>
        extractMostRecentOrderState(hit._source),
      );
      const total = getTotalCount(response.hits.total);

      serviceLogger.log(
        `Keyword search found ${orders.length} orders for customer ${customerId}`,
      );

      return createPaginatedResult(orders, total, paginationDto);
    }

    return createEmptyPaginatedResult(paginationDto);
  } catch (error) {
    serviceLogger.error(
      `Error in keyword search: ${error.message}`,
      error.stack,
    );
    return createEmptyPaginatedResult(paginationDto);
  }
}

/**
 * Executes a manual filtering by retrieving all documents and filtering by customer ID
 * @param elasticsearchService - The elasticsearch service
 * @param indexName - The index to search in
 * @param customerId - The customer ID to filter by
 * @param paginationDto - Pagination parameters
 * @param serviceLogger - Logger for tracking execution
 * @returns Paginated result with filtered orders if found
 */
export async function executeManualFiltering(
  elasticsearchService: ElasticsearchService,
  indexName: string,
  customerId: string,
  paginationDto: PaginationDto,
  serviceLogger: Logger,
): Promise<PaginatedResult<Order>> {
  try {
    const response = await elasticsearchService.search({
      index: indexName,
      size: 1000,
      query: { match_all: {} },
    });

    if (response.hits && response.hits.hits) {
      const allOrders = response.hits.hits.map((hit) =>
        extractMostRecentOrderState(hit._source),
      );

      const customerOrders = allOrders.filter(
        (order) => order.customerId === customerId,
      );

      const { page = 1, limit = 10 } = paginationDto;
      const startIndex = (page - 1) * limit;
      const paginatedOrders = customerOrders.slice(
        startIndex,
        startIndex + limit,
      );
      const total = customerOrders.length;
      const pages = Math.ceil(total / limit);

      if (paginatedOrders.length > 0) {
        serviceLogger.log(
          `Manual filtering found ${total} orders for customer ${customerId}`,
        );

        return {
          data: paginatedOrders,
          total,
          page,
          limit,
          pages,
        };
      }
    }

    return createEmptyPaginatedResult(paginationDto);
  } catch (error) {
    serviceLogger.error(
      `Error in manual filtering: ${error.message}`,
      error.stack,
    );
    return createEmptyPaginatedResult(paginationDto);
  }
}
