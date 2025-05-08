import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { DateRangeDto } from './dto/search-query.dto';
import { SearchResult } from './interfaces/search-result.interface';
import { OrderStatus } from '../order/entities/order.entity';
import {
  InvalidSearchParametersException,
  SearchExecutionException,
} from './exceptions/search-exceptions';
import {
  createUuidSearchRequest,
  createStatusSearchRequest,
  createDateRangeSearchRequest,
  createProductIdSearchRequest,
  createProductNameSearchRequest,
  createCustomerIdSearchRequest,
} from './helpers/elasticsearch.helpers';
import {
  validateSearchText,
  validateDateRange,
} from './helpers/validation.helpers';
import { logSearchError, logSearchSuccess } from './helpers/logger.helpers';
import { executeSearch } from './helpers/search.helpers';
import { PaginationService } from '../../common/services/pagination.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly indexName = 'orders';

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly paginationService: PaginationService,
  ) {}

  /**
   * Finds an order by its UUID
   */
  async findByUuid(uuid: string) {
    try {
      const searchRequest = createUuidSearchRequest(uuid, this.indexName);
      const response = await executeSearch(
        this.elasticsearchService,
        searchRequest,
      );

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
    paginationDto?: PaginationDto,
  ): Promise<SearchResult> {
    try {
      const { page, limit } =
        this.paginationService.getPaginationParams(paginationDto);

      const esParams =
        this.paginationService.getElasticsearchPaginationParams(paginationDto);

      const searchRequest = createStatusSearchRequest(
        status,
        this.indexName,
        esParams.from,
        esParams.size,
      );

      const result = await executeSearch(
        this.elasticsearchService,
        searchRequest,
        page,
        limit,
      );

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
    paginationDto?: PaginationDto,
  ): Promise<SearchResult> {
    try {
      validateDateRange(dateRange.from, dateRange.to);

      const { page, limit } =
        this.paginationService.getPaginationParams(paginationDto);
      const esParams =
        this.paginationService.getElasticsearchPaginationParams(paginationDto);

      const searchRequest = createDateRangeSearchRequest(
        dateRange,
        this.indexName,
        esParams.from,
        esParams.size,
      );

      const result = await executeSearch(
        this.elasticsearchService,
        searchRequest,
        page,
        limit,
      );

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
    paginationDto?: PaginationDto,
  ): Promise<SearchResult> {
    try {
      const { page, limit } =
        this.paginationService.getPaginationParams(paginationDto);
      const esParams =
        this.paginationService.getElasticsearchPaginationParams(paginationDto);

      const searchRequest = createProductIdSearchRequest(
        productId,
        this.indexName,
        esParams.from,
        esParams.size,
      );

      const result = await executeSearch(
        this.elasticsearchService,
        searchRequest,
        page,
        limit,
      );

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
    paginationDto?: PaginationDto,
  ): Promise<SearchResult> {
    try {
      validateSearchText(productName, 'Product name');

      const { page, limit } =
        this.paginationService.getPaginationParams(paginationDto);
      const esParams =
        this.paginationService.getElasticsearchPaginationParams(paginationDto);

      const searchRequest = createProductNameSearchRequest(
        productName,
        this.indexName,
        esParams.from,
        esParams.size,
      );

      const result = await executeSearch(
        this.elasticsearchService,
        searchRequest,
        page,
        limit,
      );

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
    paginationDto?: PaginationDto,
  ): Promise<SearchResult> {
    try {
      const { page, limit } =
        this.paginationService.getPaginationParams(paginationDto);
      const esParams =
        this.paginationService.getElasticsearchPaginationParams(paginationDto);

      const searchRequest = createCustomerIdSearchRequest(
        customerId,
        this.indexName,
        esParams.from,
        esParams.size,
      );

      const result = await executeSearch(
        this.elasticsearchService,
        searchRequest,
        page,
        limit,
      );

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
}
