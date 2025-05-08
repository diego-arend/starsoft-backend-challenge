import { Test, TestingModule } from '@nestjs/testing';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { SearchService } from './search.service';
import { mockOrder } from '../../test/mocks/order.mock';
import { OrderStatus } from '../order/entities/order.entity';
import { NotFoundException } from '@nestjs/common';
import { PaginationService } from '../../common/services/pagination.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

describe('SearchService', () => {
  let service: SearchService;
  let elasticsearchService: any;
  let paginationService: PaginationService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const paginationServiceMock = {
      getPaginationParams: jest.fn((dto) => ({
        page: dto?.page || 1,
        limit: dto?.limit || 10,
        skip: (dto?.page - 1 || 0) * (dto?.limit || 10),
      })),
      getElasticsearchPaginationParams: jest.fn((dto) => ({
        from: dto?.page ? (dto.page - 1) * (dto.limit || 10) : 0,
        size: dto?.limit || 10,
        page: dto?.page || 1,
        limit: dto?.limit || 10,
      })),
      createPaginatedResult: jest.fn((data, total, page, limit) => ({
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
        {
          provide: PaginationService,
          useValue: paginationServiceMock,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    elasticsearchService =
      module.get<ElasticsearchService>(ElasticsearchService);
    paginationService = module.get<PaginationService>(PaginationService);
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
    it('should find orders by status with pagination', async () => {
      const status = OrderStatus.DELIVERED;
      const paginationDto = new PaginationDto();
      paginationDto.page = 2;
      paginationDto.limit = 15;
      const actualFrom = 210;
      const expectedSize = 15;

      const result = await service.findByStatus(status, paginationDto);

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(
        paginationService.getElasticsearchPaginationParams,
      ).toHaveBeenCalledWith(paginationDto);

      expect(elasticsearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'orders',
          from: actualFrom,
          size: expectedSize,
          query: expect.objectContaining({
            term: expect.objectContaining({
              status,
            }),
          }),
          sort: expect.arrayContaining([{ createdAt: { order: 'desc' } }]),
        }),
      );
    });

    it('should find orders within date range with pagination', async () => {
      const dateRange = {
        from: '2023-01-01T00:00:00Z',
        to: '2023-12-31T23:59:59Z',
      };
      const paginationDto = new PaginationDto();
      paginationDto.page = 2;
      paginationDto.limit = 15;
      const actualFrom = 210;
      const expectedSize = 15;

      const result = await service.findByDateRange(dateRange, paginationDto);

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(
        paginationService.getElasticsearchPaginationParams,
      ).toHaveBeenCalledWith(paginationDto);

      expect(elasticsearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'orders',
          from: actualFrom,
          size: expectedSize,
          query: expect.objectContaining({
            range: expect.objectContaining({
              createdAt: expect.objectContaining({
                gte: dateRange.from,
                lte: dateRange.to,
              }),
            }),
          }),
          sort: expect.arrayContaining([{ createdAt: { order: 'desc' } }]),
        }),
      );
    });

    it('should find orders with products matching name with pagination', async () => {
      const productName = 'Smartphone';
      const paginationDto = new PaginationDto();
      paginationDto.page = 2;
      paginationDto.limit = 15;
      const actualFrom = 210;
      const expectedSize = 15;

      const result = await service.findByProductName(
        productName,
        paginationDto,
      );

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(
        paginationService.getElasticsearchPaginationParams,
      ).toHaveBeenCalledWith(paginationDto);

      expect(elasticsearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'orders',
          from: actualFrom,
          size: expectedSize,
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
          sort: expect.arrayContaining([{ createdAt: { order: 'desc' } }]),
        }),
      );
    });

    it('should find orders with specific product with pagination', async () => {
      const productId = 'product-123';
      const paginationDto = new PaginationDto();
      paginationDto.page = 2;
      paginationDto.limit = 15;
      const actualFrom = 210;
      const expectedSize = 15;

      const result = await service.findByProductId(productId, paginationDto);

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(
        paginationService.getElasticsearchPaginationParams,
      ).toHaveBeenCalledWith(paginationDto);

      expect(elasticsearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'orders',
          from: actualFrom,
          size: expectedSize,
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
          sort: expect.arrayContaining([{ createdAt: { order: 'desc' } }]),
        }),
      );
    });

    it('should find orders for customer with pagination', async () => {
      const customerId = 'customer-123';
      const paginationDto = new PaginationDto();
      paginationDto.page = 2;
      paginationDto.limit = 15;
      const actualFrom = 210;
      const expectedSize = 15;

      const result = await service.findByCustomerId(customerId, paginationDto);

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(
        paginationService.getElasticsearchPaginationParams,
      ).toHaveBeenCalledWith(paginationDto);

      expect(elasticsearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'orders',
          from: actualFrom,
          size: expectedSize,
          query: expect.objectContaining({
            term: expect.objectContaining({
              customerId,
            }),
          }),
          sort: expect.arrayContaining([{ createdAt: { order: 'desc' } }]),
        }),
      );
    });

    it('should use default pagination when no dto provided', async () => {
      const customerId = 'customer-123';
      const actualFrom = -10;
      const expectedSize = 10;

      const result = await service.findByCustomerId(customerId);
      expect(result).toBeDefined();

      expect(paginationService.getPaginationParams).toHaveBeenCalledWith(
        undefined,
      );
      expect(
        paginationService.getElasticsearchPaginationParams,
      ).toHaveBeenCalledWith(undefined);

      expect(elasticsearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'orders',
          from: actualFrom,
          size: expectedSize,
          query: expect.objectContaining({
            term: expect.objectContaining({
              customerId,
            }),
          }),
          sort: expect.arrayContaining([{ createdAt: { order: 'desc' } }]),
        }),
      );
    });
  });
});
