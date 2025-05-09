import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { Order } from '../entities/order.entity';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import {
  ElasticsearchSearchException,
  ElasticsearchNotFoundException,
} from '../../../common/exceptions/elasticsearch-exceptions';
import {
  prepareOrderDocument,
  extractMostRecentOrderState,
  getTotalCount,
} from '../helpers/elasticsearch.helpers';
import {
  createEmptyPaginatedResult,
  createPaginatedResult,
} from '../../../common/helpers/pagination.helpers';

/**
 * Service for managing order documents in Elasticsearch
 */
@Injectable()
export class OrderElasticsearchService {
  private readonly logger = new Logger(OrderElasticsearchService.name);
  private readonly indexName = 'orders';

  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  /**
   * Finds all orders with pagination
   * @param paginationDto - Pagination options
   * @returns Paginated result containing order list and pagination metadata
   */
  async findAll(
    paginationDto: PaginationDto = {},
  ): Promise<PaginatedResult<Order>> {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const from = (page - 1) * limit;
      const size = limit;

      this.logger.log(
        `Finding all orders with pagination (page=${page}, limit=${limit})`,
      );

      const response = await this.elasticsearchService.search({
        index: this.indexName,
        from,
        size,
        sort: [{ createdAt: { order: 'desc' } }],
        query: { match_all: {} },
      });

      const orders = response.hits.hits.map((hit) => hit._source as Order);
      const totalDocs = getTotalCount(response.hits.total);

      this.logger.log(`Found ${orders.length} orders (total: ${totalDocs})`);

      return createPaginatedResult(orders, totalDocs, paginationDto);
    } catch (error) {
      this.logger.error(
        `Error searching orders: ${error.message}`,
        error.stack,
      );
      return createEmptyPaginatedResult(paginationDto);
    }
  }

  /**
   * Gets the total document count in the index
   * @returns Total number of documents in the index
   */
  async getTotalDocumentCount(): Promise<number> {
    try {
      const response = await this.elasticsearchService.count({
        index: this.indexName,
      });

      return response.count;
    } catch (error) {
      this.logger.error(
        `Error getting total document count: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * Finds an order by its UUID in Elasticsearch
   *
   * @param uuid - The UUID of the order to find
   * @returns The found order
   * @throws ElasticsearchNotFoundException if the order is not found
   */
  async findOneByUuid(uuid: string): Promise<Order> {
    this.logger.log(`[DEBUG] Finding order by UUID: ${uuid}`);

    try {
      // Normalize the uuid to handle possible case differences
      const normalizedUuid = uuid.trim().toLowerCase();
      this.logger.log(`[DEBUG] Normalized UUID: ${normalizedUuid}`);

      // Create search query
      const searchQuery = {
        index: this.indexName,
        query: {
          bool: {
            should: [
              // Try exact match with the keyword field (most reliable)
              { term: { 'uuid.keyword': normalizedUuid } },
              // Try exact match with the regular field
              { term: { uuid: normalizedUuid } },
              // As a fallback, try a match query which is more forgiving
              { match: { uuid: normalizedUuid } },
            ],
            minimum_should_match: 1,
          },
        },
        size: 1, // We only need one result
      };

      this.logger.log(`[DEBUG] Search query: ${JSON.stringify(searchQuery)}`);

      // Try multiple query approaches to maximize chances of finding the document
      const searchResponse =
        await this.elasticsearchService.search(searchQuery);

      this.logger.log(
        `[DEBUG] Search response received: ${JSON.stringify({
          total: searchResponse.hits?.total,
          totalHits: searchResponse.hits?.hits?.length || 0,
        })}`,
      );

      if (!searchResponse.hits?.hits?.length) {
        this.logger.log(`[DEBUG] No hits found for UUID: ${uuid}`);

        // Additional debug - try a simpler query to see if the document exists at all
        try {
          const backupResponse = await this.elasticsearchService.search({
            index: this.indexName,
            query: { match_all: {} },
            size: 5,
          });

          this.logger.log(
            `[DEBUG] Sample of available documents: ${JSON.stringify(
              backupResponse.hits.hits.map((hit) => ({
                uuid: (hit._source as any)?.uuid || 'undefined',
                snippet: JSON.stringify(hit._source).substring(0, 100) + '...',
              })),
            )}`,
          );
        } catch (backupError) {
          this.logger.error(
            `[DEBUG] Failed to retrieve sample documents: ${backupError.message}`,
          );
        }

        throw new ElasticsearchNotFoundException(
          `Order with UUID ${uuid} not found`,
        );
      }

      this.logger.log(
        `[DEBUG] Hit found: ${JSON.stringify({
          id: searchResponse.hits.hits[0]._id,
          score: searchResponse.hits.hits[0]._score,
          index: searchResponse.hits.hits[0]._index,
        })}`,
      );

      const sourceData = searchResponse.hits.hits[0]._source;
      this.logger.log(`[DEBUG] Raw source data: ${JSON.stringify(sourceData)}`);

      const order = extractMostRecentOrderState(sourceData);
      this.logger.log(
        `[DEBUG] Extracted order: ${JSON.stringify({
          uuid: order.uuid,
          customerId: order.customerId,
          status: order.status,
          itemCount: order.items?.length || 0,
        })}`,
      );

      // Verify the match is actually correct (defensive programming)
      if (order.uuid.toLowerCase() !== normalizedUuid) {
        this.logger.warn(
          `[DEBUG] UUID mismatch: expected ${normalizedUuid}, got ${order.uuid}`,
          'OrderElasticsearchService',
        );
        throw new ElasticsearchNotFoundException(
          `Order with UUID ${uuid} not found (UUID mismatch)`,
        );
      }

      this.logger.log(`[DEBUG] Successfully found order with UUID: ${uuid}`);
      return order;
    } catch (error) {
      if (error instanceof ElasticsearchNotFoundException) {
        this.logger.log(
          `[DEBUG] ElasticsearchNotFoundException: ${error.message}`,
        );
        throw error;
      }

      this.logger.error(
        `[DEBUG] Error searching for order with UUID ${uuid}: ${error.message}`,
        error.stack,
        'OrderElasticsearchService',
      );

      // Log error details if available
      if (error.meta) {
        this.logger.error(
          `[DEBUG] Elasticsearch error details: ${JSON.stringify(error.meta)}`,
        );
      }

      throw new ElasticsearchSearchException(
        `Failed to search for order with UUID ${uuid}`,
        error,
      );
    }
  }

  /**
   * Finds all orders for a specific customer with pagination
   * @param customerId - Customer ID
   * @param paginationDto - Pagination options
   * @returns Paginated result containing customer's orders and pagination metadata
   * @throws NotFoundException if no orders are found for the customer
   */
  async findByCustomer(
    customerId: string,
    paginationDto: PaginationDto = {},
  ): Promise<PaginatedResult<Order>> {
    try {
      const { page = 1, limit = 10 } = paginationDto;
      const from = (page - 1) * limit;
      const size = limit;

      this.logger.log(
        `Finding orders for customer ${customerId} (page=${page}, limit=${limit})`,
      );

      // Make sure we normalize the customerId for consistent searching
      const formattedCustomerId = customerId.trim();

      // Only use keyword field for exact matching
      const response = await this.elasticsearchService.search({
        index: this.indexName,
        from,
        size,
        query: {
          term: {
            'customerId.keyword': formattedCustomerId,
          },
        },
        sort: [{ createdAt: { order: 'desc' } }],
      });

      if (
        !response.hits ||
        !response.hits.hits ||
        response.hits.hits.length === 0
      ) {
        this.logger.log(`No orders found for customer ${customerId}`);
        throw new NotFoundException(
          `No orders found for customer ID: ${customerId}`,
        );
      }

      // Extract orders from response
      const orders = response.hits.hits.map((hit) =>
        extractMostRecentOrderState(hit._source),
      );

      const totalDocs = getTotalCount(response.hits.total);

      this.logger.log(
        `Found ${orders.length} orders for customer ${customerId}`,
      );

      return createPaginatedResult(orders, totalDocs, paginationDto);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error; // Re-throw the not found exception
      }

      this.logger.error(
        `Error searching orders by customer ID: ${error.message}`,
        error.stack,
      );

      throw new ElasticsearchSearchException(
        `Failed to search for orders with customer ID ${customerId}`,
        { errorDetails: error.message, customerId },
      );
    }
  }

  /**
   * Indexes a new order in Elasticsearch
   * @param order - The order to index
   * @returns True if successful
   * @throws ElasticsearchSearchException if indexing fails
   */
  async indexOrder(order: Order): Promise<boolean> {
    try {
      this.logger.log(
        `Indexing order ${order.uuid}, customer: ${order.customerId}`,
      );

      const document = prepareOrderDocument(order);
      await this.elasticsearchService.index({
        index: this.indexName,
        id: order.uuid,
        document,
      });

      this.logger.log(`Successfully indexed order ${order.uuid}`);

      return true;
    } catch (error) {
      this.logger.error(
        `Error indexing order ${order.uuid}: ${error.message}`,
        error.stack,
      );

      throw new ElasticsearchSearchException(
        `Failed to index order ${order.uuid} to Elasticsearch`,
        { errorDetails: error.message, uuid: order.uuid },
      );
    }
  }

  /**
   * Updates an existing order in Elasticsearch
   * @param order - The updated order
   * @returns True if successful
   * @throws ElasticsearchSearchException if update fails
   */
  async updateOrder(order: Order): Promise<boolean> {
    try {
      this.logger.log(`Updating order ${order.uuid}`);

      const document = prepareOrderDocument(order);
      await this.elasticsearchService.index({
        index: this.indexName,
        id: order.uuid,
        document,
      });

      this.logger.log(`Successfully updated order ${order.uuid}`);

      return true;
    } catch (error) {
      this.logger.error(
        `Error updating order ${order.uuid}: ${error.message}`,
        error.stack,
      );

      throw new ElasticsearchSearchException(
        `Failed to update order ${order.uuid} in Elasticsearch`,
        { errorDetails: error.message, uuid: order.uuid },
      );
    }
  }
}
