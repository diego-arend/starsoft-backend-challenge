import { Test, TestingModule } from '@nestjs/testing';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { LoggerService } from '../../../logger/logger.service';
import { OrderElasticsearchService } from './order-elasticsearch.service';
import { OrderReconciliationService } from './order-reconciliation.service';
import { PaginationService } from '../../../common/services/pagination.service';
import {
  createMockLoggerService,
  createSampleOrder,
} from '../test/test.providers';
import {
  createMockElasticsearchService,
  createEmptySearchResponse,
  createSearchErrorResponse,
} from '../test/elasticsearch-test.providers';
import { ElasticsearchSearchException } from '../exceptions/elasticsearch-exceptions';
import { createMockReconciliationService } from '../test/reconciliation-test.providers';
import { PaginationDto } from '../../../common/dto/pagination.dto';

describe('OrderElasticsearchService', () => {
  let service: OrderElasticsearchService;
  let elasticsearchService: ElasticsearchService;
  let loggerService: LoggerService;
  let reconciliationService: OrderReconciliationService;
  let paginationService: PaginationService;

  beforeEach(async () => {
    const elasticsearchServiceMock = createMockElasticsearchService();
    const loggerServiceMock = createMockLoggerService();
    const reconciliationServiceMock = createMockReconciliationService();
    const paginationServiceMock = {
      getElasticsearchPaginationParams: jest.fn().mockReturnValue({
        from: 0,
        size: 10,
        page: 1,
        limit: 10,
      }),
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
        OrderElasticsearchService,
        {
          provide: ElasticsearchService,
          useValue: elasticsearchServiceMock,
        },
        {
          provide: LoggerService,
          useValue: loggerServiceMock,
        },
        {
          provide: OrderReconciliationService,
          useValue: reconciliationServiceMock,
        },
        {
          provide: PaginationService,
          useValue: paginationServiceMock,
        },
      ],
    }).compile();

    service = module.get<OrderElasticsearchService>(OrderElasticsearchService);
    elasticsearchService =
      module.get<ElasticsearchService>(ElasticsearchService);
    loggerService = module.get<LoggerService>(LoggerService);
    reconciliationService = module.get<OrderReconciliationService>(
      OrderReconciliationService,
    );
    paginationService = module.get<PaginationService>(PaginationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('indexOrder', () => {
    it('should index order successfully', async () => {
      const order = createSampleOrder();
      await service.indexOrder(order);

      expect(elasticsearchService.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'orders',
          id: order.uuid,
        }),
      );
      expect(loggerService.log).toHaveBeenCalled();
    });

    it('should handle errors during indexing', async () => {
      const order = createSampleOrder();
      jest
        .spyOn(elasticsearchService, 'index')
        .mockRejectedValue(new Error('Failed to index'));

      await service.indexOrder(order);

      expect(loggerService.error).toHaveBeenCalled();

      expect(reconciliationService.recordFailedOperation).toHaveBeenCalledWith(
        'index',
        order.uuid,
        expect.any(String),
      );
    });
  });

  describe('updateOrder', () => {
    it('should update existing order', async () => {
      const order = createSampleOrder();
      await service.updateOrder(order);

      expect(elasticsearchService.exists).toHaveBeenCalled();
      expect(elasticsearchService.update).toHaveBeenCalled();
    });

    it('should index order if it does not exist', async () => {
      const order = createSampleOrder();
      jest.spyOn(elasticsearchService, 'exists').mockResolvedValue(false);
      jest.spyOn(service, 'indexOrder').mockResolvedValue();

      await service.updateOrder(order);

      expect(service.indexOrder).toHaveBeenCalledWith(order);
    });

    it('should handle errors during update', async () => {
      const order = createSampleOrder();
      jest
        .spyOn(elasticsearchService, 'update')
        .mockRejectedValue(new Error('Update failed'));

      await service.updateOrder(order);

      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('removeOrder', () => {
    it('should remove order successfully', async () => {
      const orderUuid = '123e4567-e89b-12d3-a456-426614174000';
      await service.removeOrder(orderUuid);

      expect(elasticsearchService.delete).toHaveBeenCalledWith({
        index: 'orders',
        id: orderUuid,
      });
    });

    it('should handle errors during removal', async () => {
      const orderUuid = '123e4567-e89b-12d3-a456-426614174000';
      jest
        .spyOn(elasticsearchService, 'delete')
        .mockRejectedValue(new Error('Delete failed'));

      await service.removeOrder(orderUuid);

      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated orders', async () => {
      const paginationDto = new PaginationDto();
      const result = await service.findAll(paginationDto);

      expect(elasticsearchService.search).toHaveBeenCalled();

      expect(result.data.length).toBe(2);
      expect(result.total).toBeGreaterThan(0);
      expect(result.page).toBe(1);
    });

    it('should return empty data array when no orders', async () => {
      jest
        .spyOn(elasticsearchService, 'search')
        .mockResolvedValue(createEmptySearchResponse());

      const result = await service.findAll();

      expect(result.data.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should throw exception when search fails', async () => {
      jest
        .spyOn(elasticsearchService, 'search')
        .mockImplementation(createSearchErrorResponse());

      await expect(service.findAll()).rejects.toThrow(
        ElasticsearchSearchException,
      );
    });

    it('should use pagination parameters correctly', async () => {
      const paginationDto = { page: 2, limit: 15 };

      await service.findAll(paginationDto);

      expect(
        paginationService.getElasticsearchPaginationParams,
      ).toHaveBeenCalledWith(paginationDto);
      expect(elasticsearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.any(Number),
          size: expect.any(Number),
        }),
      );
    });
  });

  describe('findByCustomer', () => {
    it('should return paginated customer orders', async () => {
      const customerId = '550e8400-e29b-41d4-a716-446655440000';
      const paginationDto = new PaginationDto();

      const result = await service.findByCustomer(customerId, paginationDto);

      expect(elasticsearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            match: {
              customerId: customerId,
            },
          },
        }),
      );

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.page).toBe(1);
    });

    it('should throw exception when search fails', async () => {
      const customerId = '550e8400-e29b-41d4-a716-446655440000';
      jest
        .spyOn(elasticsearchService, 'search')
        .mockImplementation(createSearchErrorResponse());

      await expect(service.findByCustomer(customerId)).rejects.toThrow(
        ElasticsearchSearchException,
      );
    });

    it('should use pagination parameters with customer search', async () => {
      const customerId = '550e8400-e29b-41d4-a716-446655440000';
      const paginationDto = { page: 3, limit: 5 };

      await service.findByCustomer(customerId, paginationDto);

      expect(
        paginationService.getElasticsearchPaginationParams,
      ).toHaveBeenCalledWith(paginationDto);
      expect(elasticsearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.any(Number),
          size: expect.any(Number),
          query: {
            match: {
              customerId: customerId,
            },
          },
        }),
      );
    });
  });

  describe('findOneByUuid', () => {
    it('should return order by uuid', async () => {
      const orderUuid = '123e4567-e89b-12d3-a456-426614174000';

      const order = await service.findOneByUuid(orderUuid);

      expect(elasticsearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            match: {
              uuid: orderUuid,
            },
          },
        }),
      );
      expect(order).toBeDefined();
      expect(order.uuid).toBe(orderUuid);
    });

    it('should return null when order not found', async () => {
      const orderUuid = 'not-found';
      jest
        .spyOn(elasticsearchService, 'search')
        .mockResolvedValue(createEmptySearchResponse());

      const order = await service.findOneByUuid(orderUuid);

      expect(order).toBeNull();
    });

    it('should throw ElasticsearchSearchException when search fails', async () => {
      const orderUuid = '123e4567-e89b-12d3-a456-426614174000';
      jest
        .spyOn(elasticsearchService, 'search')
        .mockImplementation(createSearchErrorResponse());

      await expect(service.findOneByUuid(orderUuid)).rejects.toThrow(
        ElasticsearchSearchException,
      );

      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('searchOrders', () => {
    it('should search with custom query', async () => {
      const query = { query: { match: { status: 'PENDING' } } };

      await service.searchOrders(query);

      expect(elasticsearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'orders',
          query: query.query,
        }),
      );
    });

    it('should propagate errors', async () => {
      const query = { query: { match: { status: 'PENDING' } } };
      jest
        .spyOn(elasticsearchService, 'search')
        .mockImplementation(createSearchErrorResponse());

      await expect(service.searchOrders(query)).rejects.toThrow();
      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('reconciliation', () => {
    it('should record failed operations for reconciliation', async () => {
      const order = createSampleOrder();
      jest
        .spyOn(elasticsearchService, 'update')
        .mockRejectedValue(new Error('Update failed'));

      await service.updateOrder(order);

      expect(reconciliationService.recordFailedOperation).toHaveBeenCalledWith(
        'update',
        order.uuid,
        expect.any(String),
      );
    });
  });

  describe('reconciliation integration', () => {
    it('should record failed operation when indexing fails', async () => {
      const order = createSampleOrder();
      jest
        .spyOn(elasticsearchService, 'index')
        .mockRejectedValue(new Error('Index failed'));

      await service.indexOrder(order);

      expect(reconciliationService.recordFailedOperation).toHaveBeenCalledWith(
        'index',
        order.uuid,
        expect.any(String),
      );
    });

    it('should record failed operation when update fails', async () => {
      const order = createSampleOrder();
      jest.spyOn(elasticsearchService, 'exists').mockResolvedValue(true);
      jest
        .spyOn(elasticsearchService, 'update')
        .mockRejectedValue(new Error('Update failed'));

      await service.updateOrder(order);

      expect(reconciliationService.recordFailedOperation).toHaveBeenCalledWith(
        'update',
        order.uuid,
        expect.any(String),
      );
    });

    it('should record failed operation when removal fails', async () => {
      const orderUuid = '123e4567-e89b-12d3-a456-426614174000';
      jest
        .spyOn(elasticsearchService, 'delete')
        .mockRejectedValue(new Error('Delete failed'));

      await service.removeOrder(orderUuid);

      expect(reconciliationService.recordFailedOperation).toHaveBeenCalledWith(
        'delete',
        orderUuid,
        expect.any(String),
      );
    });
  });
});
