import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { PaginationService } from '../../common/services/pagination.service';
import { OrderStatus } from '../order/entities/order.entity';
import {
  InvalidDateRangeException,
  InvalidItemsQueryException,
} from './exceptions/search-exceptions';
import { ElasticsearchSearchException } from '../../common/exceptions/elasticsearch-exceptions';
import { mockElasticsearchService } from './tests/mocks/elasticsearch.mock';
import { mockProducts } from '../../test/mocks/product.mock';
import { mockOrders } from '../../test/mocks/order.mock';
import { LoggerService } from '../../logger/logger.service';
import { Logger } from '@nestjs/common';

const originalLoggerDebug = Logger.prototype.debug;
const originalLoggerLog = Logger.prototype.log;
const originalLoggerError = Logger.prototype.error;
const originalLoggerWarn = Logger.prototype.warn;
const originalLoggerVerbose = Logger.prototype.verbose;

const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;
const originalConsoleDebug = console.debug;

describe('SearchService', () => {
  let service: SearchService;
  let elasticsearchService: any;
  let mockPaginationService: any;

  beforeAll(() => {
    Logger.prototype.debug = jest.fn();
    Logger.prototype.log = jest.fn();
    Logger.prototype.error = jest.fn();
    Logger.prototype.warn = jest.fn();
    Logger.prototype.verbose = jest.fn();

    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
    console.debug = jest.fn();
  });

  afterAll(() => {
    Logger.prototype.debug = originalLoggerDebug;
    Logger.prototype.log = originalLoggerLog;
    Logger.prototype.error = originalLoggerError;
    Logger.prototype.warn = originalLoggerWarn;
    Logger.prototype.verbose = originalLoggerVerbose;

    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.info = originalConsoleInfo;
    console.debug = originalConsoleDebug;
  });

  beforeEach(async () => {
    mockPaginationService = {
      getPaginationParams: jest.fn().mockImplementation((paginationDto) => ({
        page: paginationDto?.page || 1,
        limit: paginationDto?.limit || 10,
        skip: ((paginationDto?.page || 1) - 1) * (paginationDto?.limit || 10),
      })),

      createPaginatedResult: jest
        .fn()
        .mockImplementation((data, total, page, limit) => ({
          data,
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: ElasticsearchService, useValue: mockElasticsearchService },
        { provide: PaginationService, useValue: mockPaginationService },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    elasticsearchService = module.get(ElasticsearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByStatus', () => {
    it('should return paginated orders for a valid status', async () => {
      const status = OrderStatus.PENDING;
      const paginationDto = { page: 1, limit: 10 };

      const searchResponse = {
        hits: {
          hits: [{ _source: mockOrders[0] }, { _source: mockOrders[1] }],
          total: { value: 2 },
        },
      };

      elasticsearchService.search.mockResolvedValueOnce(searchResponse);

      const result = await service.findByStatus(status, paginationDto);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('should return empty array when no orders found', async () => {
      const status = OrderStatus.CANCELED;
      const paginationDto = { page: 1, limit: 10 };

      elasticsearchService.search.mockResolvedValueOnce({
        hits: {
          hits: [],
          total: { value: 0 },
        },
      });

      const result = await service.findByStatus(status, paginationDto);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should throw ElasticsearchSearchException when search fails', async () => {
      const status = OrderStatus.PENDING;

      elasticsearchService.search.mockRejectedValueOnce(
        new Error('Elasticsearch error'),
      );

      await expect(service.findByStatus(status)).rejects.toThrow(
        ElasticsearchSearchException,
      );
    });
  });

  describe('findByDateRange', () => {
    it('should return paginated orders for valid date range', async () => {
      const dateRange = { from: '2023-01-01', to: '2023-12-31' };
      const paginationDto = { page: 1, limit: 10 };

      const searchResponse = {
        hits: {
          hits: [{ _source: mockOrders[0] }, { _source: mockOrders[1] }],
          total: { value: 2 },
        },
      };

      elasticsearchService.search.mockResolvedValueOnce(searchResponse);

      const result = await service.findByDateRange(dateRange, paginationDto);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should throw InvalidDateRangeException when no dates provided', async () => {
      const dateRange = {};

      await expect(service.findByDateRange(dateRange)).rejects.toThrow(
        InvalidDateRangeException,
      );
    });

    it('should throw InvalidDateRangeException when invalid date format', async () => {
      const dateRange = { from: '01-01-2023' };

      await expect(service.findByDateRange(dateRange)).rejects.toThrow(
        InvalidDateRangeException,
      );
    });

    it('should throw ElasticsearchSearchException when search fails', async () => {
      const dateRange = { from: '2023-01-01', to: '2023-12-31' };

      elasticsearchService.search.mockRejectedValueOnce(
        new Error('Elasticsearch error'),
      );

      await expect(service.findByDateRange(dateRange)).rejects.toThrow(
        ElasticsearchSearchException,
      );
    });
  });

  describe('findByItems', () => {
    it('should return paginated products for valid item query', async () => {
      const itemsQuery = 'Smartphone,Laptop';
      const paginationDto = { page: 1, limit: 10 };

      const searchResponse = {
        hits: {
          hits: [
            {
              _source: {
                items: [
                  {
                    productId: mockProducts[0].uuid,
                    productName: 'Smartphone Galaxy S22',
                    price: 1250,
                    description: 'Latest smartphone with advanced features',
                  },
                  {
                    productId: mockProducts[1].uuid,
                    productName: 'Laptop Ultrabook Pro',
                    price: 1800,
                    description: 'Powerful laptop for professionals',
                  },
                ],
              },
            },
          ],
          total: { value: 1 },
        },
      };

      elasticsearchService.search.mockResolvedValueOnce(searchResponse);

      const result = await service.findByItems(itemsQuery, paginationDto);

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('should throw InvalidItemsQueryException when empty query', async () => {
      const itemsQuery = '';

      await expect(service.findByItems(itemsQuery)).rejects.toThrow(
        InvalidItemsQueryException,
      );
    });

    it('should throw InvalidItemsQueryException when query has only spaces', async () => {
      const itemsQuery = '   ';

      await expect(service.findByItems(itemsQuery)).rejects.toThrow(
        InvalidItemsQueryException,
      );
    });

    it('should return empty result when no products found', async () => {
      const itemsQuery = 'nonexistentproduct';
      const paginationDto = { page: 1, limit: 10 };

      elasticsearchService.search.mockResolvedValueOnce({
        hits: {
          hits: [],
          total: { value: 0 },
        },
      });

      const result = await service.findByItems(itemsQuery, paginationDto);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should throw ElasticsearchSearchException when search fails', async () => {
      const itemsQuery = 'Smartphone';

      elasticsearchService.search.mockRejectedValueOnce(
        new Error('Elasticsearch error'),
      );

      await expect(service.findByItems(itemsQuery)).rejects.toThrow(
        ElasticsearchSearchException,
      );
    });
  });
});
