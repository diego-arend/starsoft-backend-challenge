import { Test, TestingModule } from '@nestjs/testing';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { SearchService } from './search.service';
import { mockOrder } from '../../test/mocks/order.mock';
import { OrderStatus } from '../order/entities/order.entity';
import { NotFoundException } from '@nestjs/common';
import * as validationHelpers from './helpers/validation.helpers';

describe('SearchService', () => {
  let service: SearchService;
  let elasticsearchService: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: ElasticsearchService,
          useFactory: () => ({
            search: jest.fn().mockResolvedValue({
              hits: {
                hits: [{ _source: mockOrder, _id: mockOrder.id.toString() }],
                total: { value: 1, relation: 'eq' },
              },
            }),
            indices: {
              exists: jest.fn().mockResolvedValue(true),
              create: jest.fn().mockResolvedValue({}),
            },
          }),
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    elasticsearchService =
      module.get<ElasticsearchService>(ElasticsearchService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findByUuid', () => {
    it('should find an order by UUID', async () => {
      const result = await service.findByUuid(mockOrder.uuid);

      expect(result).toEqual(
        expect.objectContaining({
          uuid: mockOrder.uuid,
          id: mockOrder.id,
        }),
      );
      expect(elasticsearchService.search).toHaveBeenCalledTimes(1);
      expect(elasticsearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { term: { uuid: mockOrder.uuid } },
        }),
      );
    });

    it('should throw NotFoundException if order is not found', async () => {
      elasticsearchService.search.mockResolvedValueOnce({
        hits: { hits: [], total: { value: 0 } },
      });

      await expect(service.findByUuid('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      expect(elasticsearchService.search).toHaveBeenCalledTimes(1);
    });
  });

  describe('search methods', () => {
    it('should find orders by status', async () => {
      jest
        .spyOn(validationHelpers, 'validatePagination')
        .mockImplementation(() => {});

      const status = OrderStatus.DELIVERED;
      const result = await service.findByStatus(status, 1, 10);

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 10);
      expect(result.items).toBeInstanceOf(Array);
      expect(elasticsearchService.search).toHaveBeenCalledTimes(1);
    });

    it('should find orders within date range', async () => {
      jest
        .spyOn(validationHelpers, 'validateDateRange')
        .mockImplementation(() => {});

      const dateRange = {
        from: '2023-01-01T00:00:00Z',
        to: '2023-12-31T23:59:59Z',
      };

      const result = await service.findByDateRange(dateRange, 1, 10);

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 10);
      expect(result.items).toBeInstanceOf(Array);
      expect(elasticsearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            range: expect.objectContaining({
              createdAt: expect.objectContaining({
                gte: dateRange.from,
                lte: dateRange.to,
              }),
            }),
          }),
        }),
      );
    });

    it('should find orders with products matching name', async () => {
      jest
        .spyOn(validationHelpers, 'validateSearchText')
        .mockImplementation(() => {});

      const productName = 'Smartphone';
      const result = await service.findByProductName(productName, 1, 10);

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 10);
      expect(result.items).toBeInstanceOf(Array);
      expect(elasticsearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            nested: expect.objectContaining({
              path: 'items',
              query: expect.objectContaining({
                match: expect.objectContaining({
                  'items.productName': productName,
                }),
              }),
            }),
          }),
        }),
      );
    });

    it('should find orders with specific product', async () => {
      jest
        .spyOn(validationHelpers, 'validateSearchText')
        .mockImplementation(() => {});

      const productId = 'product-123';
      const result = await service.findByProductId(productId, 1, 10);

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 10);
      expect(result.items).toBeInstanceOf(Array);
      expect(elasticsearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            nested: expect.objectContaining({
              path: 'items',
              query: expect.objectContaining({
                term: expect.objectContaining({
                  'items.productId': productId,
                }),
              }),
            }),
          }),
        }),
      );
    });

    it('should find orders for customer', async () => {
      const customerId = 'customer-123';
      const result = await service.findByCustomerId(customerId, 1, 10);

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 10);
      expect(result.items).toBeInstanceOf(Array);
      expect(elasticsearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            term: expect.objectContaining({
              customerId,
            }),
          }),
        }),
      );
    });
  });
});
