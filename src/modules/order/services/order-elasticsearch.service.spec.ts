import { ElasticsearchService } from '@nestjs/elasticsearch';
import { LoggerService } from '../../../logger/logger.service';
import { OrderElasticsearchService } from './order-elasticsearch.service';
import { OrderReconciliationService } from './order-reconciliation.service';
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
import { configureTestModule } from '../test/test-module.helpers';

describe('OrderElasticsearchService', () => {
  let service: OrderElasticsearchService;
  let elasticsearchService: ElasticsearchService;
  let loggerService: LoggerService;
  let reconciliationService: OrderReconciliationService;

  beforeEach(async () => {
    const elasticsearchServiceMock = createMockElasticsearchService();
    const loggerServiceMock = createMockLoggerService();
    const reconciliationServiceMock = createMockReconciliationService();

    const module = await configureTestModule([
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
    ]).compile();

    service = module.get<OrderElasticsearchService>(OrderElasticsearchService);
    elasticsearchService =
      module.get<ElasticsearchService>(ElasticsearchService);
    loggerService = module.get<LoggerService>(LoggerService);
    reconciliationService = module.get<OrderReconciliationService>(
      OrderReconciliationService,
    );
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
      // Test for the reconciliation service call
      expect(reconciliationService.recordFailedOperation).toHaveBeenCalledWith(
        'index',
        order.uuid,
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
    it('should return all orders', async () => {
      const orders = await service.findAll();

      expect(elasticsearchService.search).toHaveBeenCalled();
      expect(orders.length).toBe(2);
    });

    it('should return empty array when no orders', async () => {
      jest
        .spyOn(elasticsearchService, 'search')
        .mockResolvedValue(createEmptySearchResponse());

      const orders = await service.findAll();

      expect(orders.length).toBe(0);
    });

    it('should throw exception when search fails', async () => {
      jest
        .spyOn(elasticsearchService, 'search')
        .mockImplementation(createSearchErrorResponse());

      await expect(service.findAll()).rejects.toThrow(
        ElasticsearchSearchException,
      );
    });
  });

  describe('findByCustomer', () => {
    it('should return customer orders', async () => {
      const customerId = '550e8400-e29b-41d4-a716-446655440000';

      const orders = await service.findByCustomer(customerId);

      expect(elasticsearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: {
            match: {
              customerId: customerId,
            },
          },
        }),
      );
      expect(orders.length).toBeGreaterThan(0);
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

    it('should handle errors and return null', async () => {
      const orderUuid = '123e4567-e89b-12d3-a456-426614174000';
      jest
        .spyOn(elasticsearchService, 'search')
        .mockImplementation(createSearchErrorResponse());

      const order = await service.findOneByUuid(orderUuid);

      expect(loggerService.error).toHaveBeenCalled();
      expect(order).toBeNull();
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
      );
    });
  });
});
