import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { DateRangeDto } from './dto/search-query.dto';
import { SearchResult } from './interfaces/search-result.interface';
import { OrderStatus } from '../order/entities/order.entity';
import { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import {
  InvalidSearchParametersException,
  SearchExecutionException,
  SearchServiceUnavailableException,
} from './exceptions/search-exceptions';
import {
  extractOrdersFromResponse,
  extractTotalFromResponse,
  createUuidSearchRequest,
  createStatusSearchRequest,
  createDateRangeSearchRequest,
  createProductIdSearchRequest,
  createProductNameSearchRequest,
  createCustomerIdSearchRequest,
} from './helpers/elasticsearch.helpers';
import {
  validatePagination,
  validateSearchText,
  validateDateRange,
} from './helpers/validation.helpers';
import { logSearchError, logSearchSuccess } from './helpers/logger.helpers';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly indexName = 'orders';

  constructor(private readonly elasticsearchService: ElasticsearchService) {}

  /**
   * Finds an order by its UUID
   */
  async findByUuid(uuid: string) {
    try {
      const searchRequest = createUuidSearchRequest(uuid, this.indexName);
      const response = await this.executeSearch(searchRequest);

      if (response.total === 0) {
        throw new NotFoundException(`Order with UUID ${uuid} not found`);
      }

      logSearchSuccess(this.logger, 'findByUuid', `UUID: ${uuid}`);
      return response.items[0];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      logSearchError(this.logger, 'findByUuid', error, `UUID: ${uuid}`);
      throw new SearchExecutionException(error.message);
    }
  }

  /**
   * Finds orders by status
   */
  async findByStatus(
    status: OrderStatus,
    page = 1,
    limit = 10,
  ): Promise<SearchResult> {
    try {
      validatePagination(page, limit);

      const searchRequest = createStatusSearchRequest(
        status,
        this.indexName,
        page,
        limit,
      );
      const result = await this.executeSearch(searchRequest, page, limit);

      logSearchSuccess(
        this.logger,
        'findByStatus',
        `status: ${status}, found: ${result.total} orders`,
      );
      return result;
    } catch (error) {
      logSearchError(this.logger, 'findByStatus', error, `status: ${status}`);
      if (
        error instanceof InvalidSearchParametersException ||
        error instanceof SearchExecutionException
      ) {
        throw error;
      }
      throw new SearchExecutionException(error.message);
    }
  }

  /**
   * Finds orders created within a date range
   */
  async findByDateRange(
    dateRange: DateRangeDto,
    page = 1,
    limit = 10,
  ): Promise<SearchResult> {
    try {
      validatePagination(page, limit);
      validateDateRange(dateRange.from, dateRange.to);

      const searchRequest = createDateRangeSearchRequest(
        dateRange,
        this.indexName,
        page,
        limit,
      );
      const result = await this.executeSearch(searchRequest, page, limit);

      logSearchSuccess(
        this.logger,
        'findByDateRange',
        `from: ${dateRange.from || 'any'}, to: ${dateRange.to || 'any'}, found: ${result.total} orders`,
      );
      return result;
    } catch (error) {
      logSearchError(
        this.logger,
        'findByDateRange',
        error,
        `from: ${dateRange.from}, to: ${dateRange.to}`,
      );
      if (
        error instanceof InvalidSearchParametersException ||
        error instanceof SearchExecutionException
      ) {
        throw error;
      }
      throw new SearchExecutionException(error.message);
    }
  }

  /**
   * Finds orders containing a specific product by ID
   */
  async findByProductId(
    productId: string,
    page = 1,
    limit = 10,
  ): Promise<SearchResult> {
    try {
      validatePagination(page, limit);

      const searchRequest = createProductIdSearchRequest(
        productId,
        this.indexName,
        page,
        limit,
      );
      const result = await this.executeSearch(searchRequest, page, limit);

      logSearchSuccess(
        this.logger,
        'findByProductId',
        `productId: ${productId}, found: ${result.total} orders`,
      );
      return result;
    } catch (error) {
      logSearchError(
        this.logger,
        'findByProductId',
        error,
        `productId: ${productId}`,
      );
      if (
        error instanceof InvalidSearchParametersException ||
        error instanceof SearchExecutionException
      ) {
        throw error;
      }
      throw new SearchExecutionException(error.message);
    }
  }

  /**
   * Finds orders containing products with names matching the search text
   */
  async findByProductName(
    productName: string,
    page = 1,
    limit = 10,
  ): Promise<SearchResult> {
    try {
      validatePagination(page, limit);
      validateSearchText(productName, 'Product name');

      const searchRequest = createProductNameSearchRequest(
        productName,
        this.indexName,
        page,
        limit,
      );
      const result = await this.executeSearch(searchRequest, page, limit);

      logSearchSuccess(
        this.logger,
        'findByProductName',
        `query: ${productName}, found: ${result.total} orders`,
      );
      return result;
    } catch (error) {
      logSearchError(
        this.logger,
        'findByProductName',
        error,
        `query: ${productName}`,
      );
      if (
        error instanceof InvalidSearchParametersException ||
        error instanceof SearchExecutionException
      ) {
        throw error;
      }
      throw new SearchExecutionException(error.message);
    }
  }

  /**
   * Finds orders for a specific customer
   */
  async findByCustomerId(
    customerId: string,
    page = 1,
    limit = 10,
  ): Promise<SearchResult> {
    try {
      validatePagination(page, limit);

      const searchRequest = createCustomerIdSearchRequest(
        customerId,
        this.indexName,
        page,
        limit,
      );
      const result = await this.executeSearch(searchRequest, page, limit);

      logSearchSuccess(
        this.logger,
        'findByCustomerId',
        `customerId: ${customerId}, found: ${result.total} orders`,
      );
      return result;
    } catch (error) {
      logSearchError(
        this.logger,
        'findByCustomerId',
        error,
        `customerId: ${customerId}`,
      );
      if (
        error instanceof InvalidSearchParametersException ||
        error instanceof SearchExecutionException
      ) {
        throw error;
      }
      throw new SearchExecutionException(error.message);
    }
  }

  /**
   * Execute search with error handling and response processing
   */
  private async executeSearch(
    searchRequest: SearchRequest,
    page = 1,
    limit = 10,
  ): Promise<SearchResult> {
    try {
      const searchResponse =
        await this.elasticsearchService.search(searchRequest);

      const items = extractOrdersFromResponse(searchResponse);
      const total = extractTotalFromResponse(searchResponse);
      const totalPages = Math.ceil(total / limit);

      return {
        items,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      if (error.meta?.statusCode === 503 || error.name === 'ConnectionError') {
        throw new SearchServiceUnavailableException(error.message);
      } else {
        throw new SearchExecutionException(error.message);
      }
    }
  }
}
