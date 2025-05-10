import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { OrderStatus } from '../order/entities/order.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { PaginationService } from '../../common/services/pagination.service';
import { ElasticsearchSearchException } from '../../common/exceptions/elasticsearch-exceptions';
import {
  InvalidDateRangeException,
  InvalidItemsQueryException,
} from './exceptions/search-exceptions';
import { DateRangeParams } from './types/search.types';
import { SearchValidator } from './utils/search-validator.util';
import { ElasticsearchQueryBuilder } from './utils/elasticsearch-query.util';
import { ProductProcessor } from './utils/product-processor.util';

/**
 * Service responsible for handling search operations through Elasticsearch
 * Simplified version for testing
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly indexName = 'orders';

  /**
   * Creates an instance of SearchService
   *
   * @param elasticsearchService - Elasticsearch client service
   * @param paginationService - Service to handle pagination
   */
  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly paginationService: PaginationService,
  ) {
    this.logger.log(`Search service initialized with index: ${this.indexName}`);
  }

  /**
   * Find orders by status with pagination
   *
   * @param status - The order status to search for
   * @param paginationDto - Pagination parameters
   * @returns Paginated list of orders (empty array if none found)
   * @throws ElasticsearchSearchException if the search operation fails
   */
  async findByStatus(
    status: OrderStatus,
    paginationDto: PaginationDto = new PaginationDto(),
  ): Promise<PaginatedResult<any>> {
    try {
      this.logger.debug(`Searching for orders with status: ${status}`);

      const { page, limit, skip } =
        this.paginationService.getPaginationParams(paginationDto);

      const searchResponse = await this.elasticsearchService.search({
        index: this.indexName,
        query: ElasticsearchQueryBuilder.buildStatusQuery(status),
        sort: [{ createdAt: { order: 'desc' } }],
        from: skip,
        size: limit,
      });

      if (!searchResponse.hits?.hits) {
        this.logger.debug(`No hits returned for status: ${status}`);
        return this.paginationService.createPaginatedResult([], 0, page, limit);
      }

      const orders = searchResponse.hits.hits.map((hit) => hit._source);
      const total =
        typeof searchResponse.hits.total === 'number'
          ? searchResponse.hits.total
          : searchResponse.hits.total?.value || 0;

      this.logger.debug(`Found ${total} orders with status: ${status}`);

      return this.paginationService.createPaginatedResult(
        orders,
        total,
        page,
        limit,
      );
    } catch (error) {
      this.logger.error(
        `Error searching for orders with status ${status}: ${error.message}`,
      );

      throw new ElasticsearchSearchException(
        `Failed to search for orders with status ${status}`,
        error,
      );
    }
  }

  /**
   * Find orders within a date range with pagination
   *
   * @param dateRange - The date range parameters (from and to dates)
   * @param paginationDto - Pagination parameters
   * @returns Paginated list of orders (empty array if none found)
   * @throws InvalidDateRangeException if the date range is invalid
   * @throws ElasticsearchSearchException if the search operation fails
   */
  async findByDateRange(
    dateRange: DateRangeParams,
    paginationDto: PaginationDto = new PaginationDto(),
  ): Promise<PaginatedResult<any>> {
    try {
      SearchValidator.validateDateRange(dateRange);

      const { page, limit, skip } =
        this.paginationService.getPaginationParams(paginationDto);

      const rangeDescription =
        SearchValidator.getDateRangeDescription(dateRange);
      this.logger.debug(
        `Searching for orders in date range: ${rangeDescription}`,
      );

      const searchResponse = await this.elasticsearchService.search({
        index: this.indexName,
        query: ElasticsearchQueryBuilder.buildDateRangeQuery(dateRange),
        sort: [{ createdAt: { order: 'desc' } }],
        from: skip,
        size: limit,
      });

      if (!searchResponse.hits?.hits) {
        this.logger.debug(
          `No hits returned for date range: ${rangeDescription}`,
        );
        return this.paginationService.createPaginatedResult([], 0, page, limit);
      }

      const orders = searchResponse.hits.hits.map((hit) => hit._source);
      const total =
        typeof searchResponse.hits.total === 'number'
          ? searchResponse.hits.total
          : searchResponse.hits.total?.value || 0;

      this.logger.debug(
        `Found ${total} orders in date range: ${rangeDescription}`,
      );

      return this.paginationService.createPaginatedResult(
        orders,
        total,
        page,
        limit,
      );
    } catch (error) {
      if (error instanceof InvalidDateRangeException) {
        throw error;
      }

      this.logger.error(
        `Error searching for orders in date range: ${error.message}`,
      );

      throw new ElasticsearchSearchException(
        `Failed to search for orders in date range`,
        error,
      );
    }
  }

  /**
   * Find unique product items matching the search query
   *
   * @param itemsQuery - Query string containing product names (comma-separated)
   * @param paginationDto - Pagination parameters
   * @returns Paginated list of unique product items matching the search
   * @throws InvalidItemsQueryException if the items query is invalid
   * @throws ElasticsearchSearchException if the search operation fails
   */
  async findByItems(
    itemsQuery: string,
    paginationDto: PaginationDto = new PaginationDto(),
  ): Promise<PaginatedResult<any>> {
    try {
      const items = SearchValidator.validateAndParseItemsQuery(itemsQuery);

      this.logger.debug(`Searching for products: ${items.join(', ')}`);

      const searchResponse = await this.elasticsearchService.search({
        index: this.indexName,
        query: ElasticsearchQueryBuilder.buildItemsQuery(items),
        size: 100,
        _source: ['items'],
      });

      if (!searchResponse.hits?.hits) {
        this.logger.debug(`No hits returned for items query: ${itemsQuery}`);
        return this.paginationService.createPaginatedResult(
          [],
          0,
          paginationDto.page || 1,
          paginationDto.limit || 10,
        );
      }

      const allUniqueProducts = ProductProcessor.extractUniqueProducts(
        searchResponse.hits.hits,
      );

      const uniqueProducts = allUniqueProducts.filter((product) => {
        return items.some(
          (searchItem) =>
            product.productName
              ?.toLowerCase()
              .includes(searchItem.toLowerCase()) ||
            product.description
              ?.toLowerCase()
              .includes(searchItem.toLowerCase()),
        );
      });

      const { page, limit } =
        this.paginationService.getPaginationParams(paginationDto);

      const paginatedProducts = ProductProcessor.paginateProducts(
        uniqueProducts,
        page,
        limit,
      );

      this.logger.debug(
        `Found ${uniqueProducts.length} unique products matching the query`,
      );

      return this.paginationService.createPaginatedResult(
        paginatedProducts,
        uniqueProducts.length,
        page,
        limit,
      );
    } catch (error) {
      if (error instanceof InvalidItemsQueryException) {
        throw error;
      }

      this.logger.error(
        `Error searching for products with query "${itemsQuery}": ${error.message}`,
      );

      throw new ElasticsearchSearchException(
        `Failed to search for products`,
        error,
      );
    }
  }
}
