import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderService } from './order.service';
import { OrderPostgresService } from './services/order-postgres.service';
import { OrderElasticsearchService } from './services/order-elasticsearch.service';
import { LoggerService } from '../../logger/logger.service';
import { OrderEventType } from './events/order-events.types';
import {
  createMockLoggerService,
  createSampleOrder,
} from './test/test.providers';
import {
  createSampleCreateOrderDto,
  createSampleUpdateOrderDto,
} from './test/postgres-test.providers';
import { emitOrderEvent } from './helpers/event.helpers';
import { createMockEventEmitter } from './test/event-test.providers';
import { testErrorHandling } from './test/test-module.helpers';

describe('OrderService', () => {
  let service: OrderService;
  let postgresService: OrderPostgresService;
  let elasticsearchService: OrderElasticsearchService;
  let eventEmitter: EventEmitter2;
  let loggerService: LoggerService;
  let sampleOrder;

  beforeEach(async () => {
    const mockPostgresService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findOneByUuid: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
      findByCustomer: jest.fn(),
    };

    const mockElasticsearchService = {
      indexOrder: jest.fn().mockImplementation(() => Promise.resolve()),
      findAll: jest.fn(),
      findOneByUuid: jest.fn(),
      findByCustomer: jest.fn(),
    };

    const mockEventEmitter = createMockEventEmitter();
    const loggerServiceMock = createMockLoggerService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: OrderPostgresService,
          useValue: mockPostgresService,
        },
        {
          provide: OrderElasticsearchService,
          useValue: mockElasticsearchService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: LoggerService,
          useValue: loggerServiceMock,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    postgresService = module.get<OrderPostgresService>(OrderPostgresService);
    elasticsearchService = module.get<OrderElasticsearchService>(
      OrderElasticsearchService,
    );
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    loggerService = module.get<LoggerService>(LoggerService);

    sampleOrder = createSampleOrder();
  });

  afterEach(() => jest.clearAllMocks());

  describe('CRUD operations', () => {
    it('should create order and emit event', async () => {
      const dto = createSampleCreateOrderDto();
      jest.spyOn(postgresService, 'create').mockResolvedValue(sampleOrder);

      const result = await service.create(dto);

      expect(postgresService.create).toHaveBeenCalledWith(dto);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        OrderEventType.CREATED,
        expect.objectContaining({ orderUuid: sampleOrder.uuid }),
      );
      expect(elasticsearchService.indexOrder).not.toHaveBeenCalled();
      expect(result).toBe(sampleOrder);
    });

    it('should update order and emit event', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const dto = createSampleUpdateOrderDto();
      jest.spyOn(postgresService, 'update').mockResolvedValue(sampleOrder);

      await service.update(uuid, dto);

      expect(postgresService.update).toHaveBeenCalledWith(uuid, dto);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        OrderEventType.UPDATED,
        expect.anything(),
      );
    });

    it('should cancel order and emit event', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      jest.spyOn(postgresService, 'cancel').mockResolvedValue(sampleOrder);

      await service.cancel(uuid);

      expect(postgresService.cancel).toHaveBeenCalledWith(uuid);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        OrderEventType.CANCELED,
        expect.anything(),
      );
    });
  });

  describe('Query operations', () => {
    it('should prioritize Elasticsearch for findAll with database fallback', async () => {
      const orders = [sampleOrder, sampleOrder];
      jest.spyOn(elasticsearchService, 'findAll').mockResolvedValue(orders);

      let result = await service.findAll();
      expect(elasticsearchService.findAll).toHaveBeenCalled();
      expect(postgresService.findAll).not.toHaveBeenCalled();
      expect(result).toBe(orders);

      jest.clearAllMocks();
      jest
        .spyOn(elasticsearchService, 'findAll')
        .mockRejectedValue(new Error('ES error'));
      jest.spyOn(postgresService, 'findAll').mockResolvedValue(orders);

      result = await service.findAll();
      expect(elasticsearchService.findAll).toHaveBeenCalled();
      expect(postgresService.findAll).toHaveBeenCalled();
      expect(result).toBe(orders);
    });

    it('should use correct strategy for findOneByUuid', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';

      jest
        .spyOn(elasticsearchService, 'findOneByUuid')
        .mockResolvedValue(sampleOrder);
      let result = await service.findOneByUuid(uuid);
      expect(result).toBe(sampleOrder);
      expect(postgresService.findOneByUuid).not.toHaveBeenCalled();

      jest.clearAllMocks();
      jest.spyOn(elasticsearchService, 'findOneByUuid').mockResolvedValue(null);
      jest
        .spyOn(postgresService, 'findOneByUuid')
        .mockResolvedValue(sampleOrder);
      result = await service.findOneByUuid(uuid);
      expect(elasticsearchService.findOneByUuid).toHaveBeenCalled();
      expect(postgresService.findOneByUuid).toHaveBeenCalled();

      jest.clearAllMocks();
      jest
        .spyOn(elasticsearchService, 'findOneByUuid')
        .mockRejectedValue(new Error());
      jest
        .spyOn(postgresService, 'findOneByUuid')
        .mockResolvedValue(sampleOrder);
      result = await service.findOneByUuid(uuid);
      expect(loggerService.debug).toHaveBeenCalled();
      expect(postgresService.findOneByUuid).toHaveBeenCalled();
    });

    it('should try to use Elasticsearch first for findOne using findOneByUuid', async () => {
      const id = 1;
      const pgOrder = { ...sampleOrder, id };
      const esOrder = {
        ...pgOrder,
        // Use a property that exists on Order instead of enrichedData
        items: [
          ...(pgOrder.items || []),
          { id: 999, productName: 'Extra item from ES' },
        ],
      };

      jest.spyOn(postgresService, 'findOne').mockResolvedValue(pgOrder);
      jest
        .spyOn(elasticsearchService, 'findOneByUuid')
        .mockResolvedValue(esOrder);

      const result = await service.findOne(id);

      expect(postgresService.findOne).toHaveBeenCalledWith(id);
      expect(elasticsearchService.findOneByUuid).toHaveBeenCalledWith(
        pgOrder.uuid,
      );
      // Check for the additional item instead of enrichedData
      expect(result.items).toContainEqual(
        expect.objectContaining({
          id: 999,
          productName: 'Extra item from ES',
        }),
      );
    });

    it('should fall back to PostgreSQL result when Elasticsearch fails for findOne', async () => {
      const id = 1;
      const pgOrder = { ...sampleOrder, id };

      jest.spyOn(postgresService, 'findOne').mockResolvedValue(pgOrder);
      jest
        .spyOn(elasticsearchService, 'findOneByUuid')
        .mockRejectedValue(new Error('ES unavailable'));

      const result = await service.findOne(id);

      expect(postgresService.findOne).toHaveBeenCalledWith(id);
      expect(elasticsearchService.findOneByUuid).toHaveBeenCalledWith(
        pgOrder.uuid,
      );
      expect(result).toBe(pgOrder);
      expect(loggerService.debug).toHaveBeenCalled();
    });

    it('should prioritize Elasticsearch for findByCustomer with database fallback', async () => {
      const customerId = '550e8400-e29b-41d4-a716-446655440000';
      const orders = [sampleOrder, sampleOrder];

      jest
        .spyOn(elasticsearchService, 'findByCustomer')
        .mockResolvedValue(orders);
      let result = await service.findByCustomer(customerId);
      expect(elasticsearchService.findByCustomer).toHaveBeenCalledWith(
        customerId,
      );
      expect(postgresService.findByCustomer).not.toHaveBeenCalled();

      jest.clearAllMocks();
      jest
        .spyOn(elasticsearchService, 'findByCustomer')
        .mockRejectedValue(new Error());
      jest.spyOn(postgresService, 'findByCustomer').mockResolvedValue(orders);
      result = await service.findByCustomer(customerId);
      expect(postgresService.findByCustomer).toHaveBeenCalled();
      expect(result).toBe(orders);
    });
  });

  describe('Error handling', () => {
    it('should handle errors properly for create operation', async () => {
      const error = new Error('Test error');
      jest.spyOn(postgresService, 'create').mockRejectedValue(error);

      await testErrorHandling(
        () => service.create(createSampleCreateOrderDto()),
        BadRequestException,
        loggerService,
      );
    });

    it('should handle errors properly for all operations', async () => {
      const error = new Error('Test error');
      const uuid = '123e4567-e89b-12d3-a456-426614174000';

      jest.spyOn(postgresService, 'create').mockRejectedValue(error);
      await expect(
        service.create(createSampleCreateOrderDto()),
      ).rejects.toThrow(BadRequestException);

      jest.spyOn(postgresService, 'update').mockRejectedValue(error);
      await expect(
        service.update(uuid, createSampleUpdateOrderDto()),
      ).rejects.toThrow(BadRequestException);

      jest.spyOn(postgresService, 'cancel').mockRejectedValue(error);
      await expect(service.cancel(uuid)).rejects.toThrow(BadRequestException);

      expect(loggerService.error).toHaveBeenCalledTimes(3);
    });
  });

  describe('Event emission', () => {
    it('should emit events with correct structure', () => {
      emitOrderEvent(eventEmitter, OrderEventType.CREATED, sampleOrder);

      expect(eventEmitter.emit).toHaveBeenCalledWith(OrderEventType.CREATED, {
        type: OrderEventType.CREATED,
        orderUuid: sampleOrder.uuid,
        payload: sampleOrder,
      });
    });

    it('should not emit events if PostgreSQL operation fails', async () => {
      const dto = createSampleCreateOrderDto();
      const error = new Error('Database error');

      jest.spyOn(postgresService, 'create').mockRejectedValue(error);

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});
