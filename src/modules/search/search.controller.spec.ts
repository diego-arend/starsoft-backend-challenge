import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { OrderStatus } from '../order/entities/order.entity';
import { Logger } from '@nestjs/common';
import { mockOrders } from '../../test/mocks/order.mock';
import { mockProducts } from '../../test/mocks/product.mock';
import { createPaginatedResult } from '../../common/helpers/pagination.helpers';

const originalLoggerDebug = Logger.prototype.debug;
const originalLoggerLog = Logger.prototype.log;
const originalLoggerError = Logger.prototype.error;
const originalLoggerWarn = Logger.prototype.warn;

describe('SearchController', () => {
  let controller: SearchController;
  let searchService: jest.Mocked<SearchService>;

  beforeAll(() => {
    Logger.prototype.debug = jest.fn();
    Logger.prototype.log = jest.fn();
    Logger.prototype.error = jest.fn();
    Logger.prototype.warn = jest.fn();
  });

  afterAll(() => {
    Logger.prototype.debug = originalLoggerDebug;
    Logger.prototype.log = originalLoggerLog;
    Logger.prototype.error = originalLoggerError;
    Logger.prototype.warn = originalLoggerWarn;
  });

  beforeEach(async () => {
    const mockSearchService = {
      findByStatus: jest.fn(),
      findByDateRange: jest.fn(),
      findByItems: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
    searchService = module.get(SearchService) as jest.Mocked<SearchService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findByStatus', () => {
    it('should return paginated orders for a valid status', async () => {
      const status = OrderStatus.PENDING;
      const page = 1;
      const limit = 10;

      const paginatedResult = createPaginatedResult(
        [mockOrders[0], mockOrders[1]],
        2,
        { page, limit },
      );

      searchService.findByStatus.mockResolvedValue(paginatedResult);

      const result = await controller.findByStatus(status, page, limit);

      expect(result).toEqual(paginatedResult);
      expect(searchService.findByStatus).toHaveBeenCalledWith(status, {
        page,
        limit,
      });
    });

    it('should handle empty result', async () => {
      const status = OrderStatus.CANCELED;
      const page = 1;
      const limit = 10;

      const emptyResult = createPaginatedResult([], 0, { page, limit });

      searchService.findByStatus.mockResolvedValue(emptyResult);

      const result = await controller.findByStatus(status, page, limit);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('findByDateRange', () => {
    it('should return paginated orders for valid date range', async () => {
      const from = '2023-01-01';
      const to = '2023-12-31';
      const page = 1;
      const limit = 10;

      const paginatedResult = createPaginatedResult(
        [mockOrders[0], mockOrders[1]],
        2,
        { page, limit },
      );

      searchService.findByDateRange.mockResolvedValue(paginatedResult);

      const result = await controller.findByDateRange(from, to, page, limit);

      expect(result).toEqual(paginatedResult);
      expect(searchService.findByDateRange).toHaveBeenCalledWith(
        { from, to },
        { page, limit },
      );
    });

    it('should work with only from date', async () => {
      const from = '2023-01-01';
      const page = 1;
      const limit = 10;

      const paginatedResult = createPaginatedResult([mockOrders[0]], 1, {
        page,
        limit,
      });

      searchService.findByDateRange.mockResolvedValue(paginatedResult);

      const result = await controller.findByDateRange(
        from,
        undefined,
        page,
        limit,
      );

      expect(result.data).toHaveLength(1);
      expect(searchService.findByDateRange).toHaveBeenCalledWith(
        { from, to: undefined },
        { page, limit },
      );
    });

    it('should work with only to date', async () => {
      const to = '2023-12-31';
      const page = 1;
      const limit = 10;

      const paginatedResult = createPaginatedResult([mockOrders[0]], 1, {
        page,
        limit,
      });

      searchService.findByDateRange.mockResolvedValue(paginatedResult);

      const result = await controller.findByDateRange(
        undefined,
        to,
        page,
        limit,
      );

      expect(result.data).toHaveLength(1);
      expect(searchService.findByDateRange).toHaveBeenCalledWith(
        { from: undefined, to },
        { page, limit },
      );
    });
  });

  describe('findByItems', () => {
    it('should return paginated products for valid items query', async () => {
      const items = 'Smartphone,Laptop';
      const page = 1;
      const limit = 10;

      const productsData = [
        {
          productId: mockProducts[0].uuid,
          productName: mockProducts[0].name,
          price: mockProducts[0].price,
          description: mockProducts[0].description,
        },
        {
          productId: mockProducts[1].uuid,
          productName: mockProducts[1].name,
          price: mockProducts[1].price,
          description: mockProducts[1].description,
        },
      ];

      const paginatedResult = createPaginatedResult(productsData, 2, {
        page,
        limit,
      });

      searchService.findByItems.mockResolvedValue(paginatedResult);

      const result = await controller.findByItems(items, page, limit);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(searchService.findByItems).toHaveBeenCalledWith(items, {
        page,
        limit,
      });
    });

    it('should handle empty result when no products found', async () => {
      const items = 'NonExistentProduct';
      const page = 1;
      const limit = 10;

      const emptyResult = createPaginatedResult([], 0, { page, limit });

      searchService.findByItems.mockResolvedValue(emptyResult);

      const result = await controller.findByItems(items, page, limit);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });
});
