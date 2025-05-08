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
import { createMockEventEmitter } from './test/event-test.providers';

describe('OrderService', () => {
  let service: OrderService;
  let postgresService: any;
  let elasticsearchService: any;
  let eventEmitter: any;
  let sampleOrder: any;

  beforeEach(async () => {
    sampleOrder = createSampleOrder();

    postgresService = {
      create: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findOneByUuid: jest.fn(),
      findByCustomer: jest.fn(),
    };

    elasticsearchService = {
      indexOrder: jest.fn(),
      findAll: jest.fn(),
      findOneByUuid: jest.fn(),
      findByCustomer: jest.fn(),
    };

    const mockEventEmitter = createMockEventEmitter();
    const loggerServiceMock = createMockLoggerService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: OrderPostgresService, useValue: postgresService },
        { provide: OrderElasticsearchService, useValue: elasticsearchService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: LoggerService, useValue: loggerServiceMock },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    eventEmitter = mockEventEmitter;
  });

  describe('create', () => {
    it('should create order and emit event', async () => {
      // Arrange
      const dto = createSampleCreateOrderDto();
      postgresService.create.mockResolvedValue(sampleOrder);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(postgresService.create).toHaveBeenCalledWith(dto);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        OrderEventType.CREATED,
        expect.objectContaining({ orderUuid: sampleOrder.uuid }),
      );
      expect(result).toEqual(sampleOrder);
    });

    it('should throw BadRequestException when create fails', async () => {
      // Arrange
      const dto = createSampleCreateOrderDto();
      postgresService.create.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update order and emit event', async () => {
      // Arrange
      const uuid = 'test-uuid';
      const dto = createSampleUpdateOrderDto();
      postgresService.update.mockResolvedValue(sampleOrder);

      // Act
      await service.update(uuid, dto);

      // Assert
      expect(postgresService.update).toHaveBeenCalledWith(uuid, dto);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        OrderEventType.UPDATED,
        expect.objectContaining({ orderUuid: sampleOrder.uuid }),
      );
    });
  });

  describe('cancel', () => {
    it('should cancel order and emit event', async () => {
      // Arrange
      const uuid = 'test-uuid';
      postgresService.cancel.mockResolvedValue(sampleOrder);

      // Act
      await service.cancel(uuid);

      // Assert
      expect(postgresService.cancel).toHaveBeenCalledWith(uuid);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        OrderEventType.CANCELED,
        expect.objectContaining({ orderUuid: sampleOrder.uuid }),
      );
    });
  });

  describe('findAll', () => {
    it('should use Elasticsearch when available', async () => {
      // Arrange
      const orders = [sampleOrder, sampleOrder];
      elasticsearchService.findAll.mockResolvedValue(orders);

      // Act
      const result = await service.findAll();

      // Assert
      expect(elasticsearchService.findAll).toHaveBeenCalled();
      expect(postgresService.findAll).not.toHaveBeenCalled();
      expect(result).toEqual(orders);
    });

    it('should fall back to PostgreSQL when Elasticsearch fails', async () => {
      // Arrange
      const orders = [sampleOrder, sampleOrder];
      elasticsearchService.findAll.mockRejectedValue(new Error());
      postgresService.findAll.mockResolvedValue(orders);

      // Act
      const result = await service.findAll();

      // Assert
      expect(elasticsearchService.findAll).toHaveBeenCalled();
      expect(postgresService.findAll).toHaveBeenCalled();
      expect(result).toEqual(orders);
    });
  });

  describe('findOne', () => {
    it('should combine data from PostgreSQL and Elasticsearch', async () => {
      // Arrange
      const id = 1;
      const pgOrder = { ...sampleOrder, id };
      const esOrder = {
        ...pgOrder,
        items: [{ id: 999, productName: 'Test Product' }],
      };

      postgresService.findOne.mockResolvedValue(pgOrder);
      elasticsearchService.findOneByUuid.mockResolvedValue(esOrder);

      // Act
      const result = await service.findOne(id);

      // Assert
      expect(postgresService.findOne).toHaveBeenCalledWith(id);
      expect(elasticsearchService.findOneByUuid).toHaveBeenCalledWith(
        pgOrder.uuid,
      );
      expect(result.items).toContainEqual(expect.objectContaining({ id: 999 }));
    });
  });

  describe('findOneByUuid', () => {
    it('should use Elasticsearch when available', async () => {
      // Arrange
      const uuid = 'test-uuid';
      elasticsearchService.findOneByUuid.mockResolvedValue(sampleOrder);

      // Act
      const result = await service.findOneByUuid(uuid);

      // Assert
      expect(elasticsearchService.findOneByUuid).toHaveBeenCalledWith(uuid);
      expect(postgresService.findOneByUuid).not.toHaveBeenCalled();
      expect(result).toEqual(sampleOrder);
    });
  });

  describe('findByCustomer', () => {
    it('should use Elasticsearch when available', async () => {
      // Arrange
      const customerId = 'customer-123';
      const orders = [sampleOrder, sampleOrder];
      elasticsearchService.findByCustomer.mockResolvedValue(orders);

      // Act
      const result = await service.findByCustomer(customerId);

      // Assert
      expect(elasticsearchService.findByCustomer).toHaveBeenCalledWith(
        customerId,
      );
      expect(result).toEqual(orders);
    });
  });
});
