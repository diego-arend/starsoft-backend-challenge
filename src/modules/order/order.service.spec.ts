import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderService } from './order.service';
import { OrderPostgresService } from './services/order-postgres.service';
import { OrderElasticsearchService } from './services/order-elasticsearch.service';
import { LoggerService } from '../../logger/logger.service';
import {
  createMockLoggerService,
  createSampleOrder,
} from './test/test.providers';
import {
  createSampleCreateOrderDto,
  createSampleUpdateOrderDto,
} from './test/postgres-test.providers';
import { createMockEventEmitter } from './test/event-test.providers';
import { Order } from './entities/order.entity';

// Test-specific interface to handle additional properties in tests
interface TestOrder extends Order {
  extraData?: string;
  source?: string;
}

describe('OrderService', () => {
  let service: OrderService;
  let postgresService: any;
  let elasticsearchService: any;
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: OrderPostgresService, useValue: postgresService },
        { provide: OrderElasticsearchService, useValue: elasticsearchService },
        { provide: EventEmitter2, useValue: createMockEventEmitter() },
        { provide: LoggerService, useValue: createMockLoggerService() },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  describe('create', () => {
    it('should return created order on success', async () => {
      const dto = createSampleCreateOrderDto();
      postgresService.create.mockResolvedValue(sampleOrder);

      const result = await service.create(dto);

      expect(result).toEqual(sampleOrder);
    });

    it('should throw BadRequestException when create fails', async () => {
      const dto = createSampleCreateOrderDto();
      postgresService.create.mockRejectedValue(new Error('Database error'));

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should return updated order on success', async () => {
      const uuid = 'test-uuid';
      const dto = createSampleUpdateOrderDto();
      const updatedOrder = { ...sampleOrder, status: 'UPDATED' };
      postgresService.update.mockResolvedValue(updatedOrder);

      const result = await service.update(uuid, dto);

      expect(result).toEqual(updatedOrder);
    });

    it('should throw BadRequestException when update fails', async () => {
      const uuid = 'test-uuid';
      const dto = createSampleUpdateOrderDto();
      postgresService.update.mockRejectedValue(new Error('Update failed'));

      await expect(service.update(uuid, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancel', () => {
    it('should return canceled order on success', async () => {
      const uuid = 'test-uuid';
      const canceledOrder = { ...sampleOrder, status: 'CANCELED' };
      postgresService.cancel.mockResolvedValue(canceledOrder);

      const result = await service.cancel(uuid);

      expect(result).toEqual(canceledOrder);
    });

    it('should throw BadRequestException when cancel fails', async () => {
      const uuid = 'test-uuid';
      postgresService.cancel.mockRejectedValue(new Error('Cancel failed'));

      await expect(service.cancel(uuid)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return orders from Elasticsearch when available', async () => {
      const orders = [sampleOrder, { ...sampleOrder, uuid: 'order-2' }];
      elasticsearchService.findAll.mockResolvedValue(orders);

      const result = await service.findAll();

      expect(result).toEqual(orders);
      expect(result.length).toBe(2);
    });

    it('should return orders from PostgreSQL when Elasticsearch fails', async () => {
      const orders = [sampleOrder, { ...sampleOrder, uuid: 'order-2' }];
      elasticsearchService.findAll.mockRejectedValue(new Error());
      postgresService.findAll.mockResolvedValue(orders);

      const result = await service.findAll();

      expect(result).toEqual(orders);
      expect(result.length).toBe(2);
    });
  });

  describe('findOne', () => {
    it('should return order with combined data', async () => {
      const id = 1;
      const pgOrder = { ...sampleOrder, id };
      const esOrder = {
        ...pgOrder,
        items: [{ id: 999, productName: 'Test Product' }],
      };

      postgresService.findOne.mockResolvedValue(pgOrder);
      elasticsearchService.findOneByUuid.mockResolvedValue(esOrder);

      const result = await service.findOne(id);

      expect(result).toEqual(esOrder);
      expect(result.items).toEqual(esOrder.items);
    });

    it('should return PostgreSQL data when Elasticsearch fails', async () => {
      const id = 1;
      const pgOrder = { ...sampleOrder, id };

      postgresService.findOne.mockResolvedValue(pgOrder);
      elasticsearchService.findOneByUuid.mockRejectedValue(new Error());

      const result = await service.findOne(id);

      expect(result).toEqual(pgOrder);
    });
  });

  describe('findOneByUuid', () => {
    it('should return order from Elasticsearch when available', async () => {
      const uuid = 'test-uuid';
      const esOrder = {
        ...sampleOrder,
        extraData: 'from-elasticsearch',
      } as TestOrder;
      elasticsearchService.findOneByUuid.mockResolvedValue(esOrder);

      const result = await service.findOneByUuid(uuid);

      expect(result).toEqual(esOrder);
      expect((result as TestOrder).extraData).toBe('from-elasticsearch');
    });

    it('should return order from PostgreSQL when Elasticsearch fails', async () => {
      const uuid = 'test-uuid';
      const pgOrder = { ...sampleOrder, source: 'postgresql' } as TestOrder;

      elasticsearchService.findOneByUuid.mockRejectedValue(new Error());
      postgresService.findOneByUuid.mockResolvedValue(pgOrder);

      const result = await service.findOneByUuid(uuid);

      expect(result).toEqual(pgOrder);
      expect((result as TestOrder).source).toBe('postgresql');
    });
  });

  describe('findByCustomer', () => {
    it('should return customer orders from Elasticsearch when available', async () => {
      const customerId = 'customer-123';
      const orders = [
        { ...sampleOrder, customerId },
        { ...sampleOrder, customerId, uuid: 'order-2' },
      ];
      elasticsearchService.findByCustomer.mockResolvedValue(orders);

      const result = await service.findByCustomer(customerId);

      expect(result).toEqual(orders);
      expect(result.length).toBe(2);
      expect(result[0].customerId).toBe(customerId);
    });

    it('should return customer orders from PostgreSQL when Elasticsearch fails', async () => {
      const customerId = 'customer-123';
      const orders = [
        { ...sampleOrder, customerId, source: 'postgresql' },
        { ...sampleOrder, customerId, uuid: 'order-2', source: 'postgresql' },
      ] as TestOrder[];

      elasticsearchService.findByCustomer.mockRejectedValue(new Error());
      postgresService.findByCustomer.mockResolvedValue(orders);

      const result = await service.findByCustomer(customerId);

      expect(result).toEqual(orders);
      expect((result[0] as TestOrder).source).toBe('postgresql');
    });
  });
});
