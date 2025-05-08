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
import { Order, OrderStatus } from './entities/order.entity'; // Certifique-se de importar OrderStatus
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { PaginationDto } from '../../common/dto/pagination.dto';

interface TestOrder extends Order {
  extraData?: string;
  source?: string;
}

describe('OrderService', () => {
  let service: OrderService;
  let postgresService: any;
  let elasticsearchService: any;
  let sampleOrder: Order;
  let secondOrder: Order;

  beforeEach(async () => {
    sampleOrder = createSampleOrder();
    secondOrder = createSampleOrder();
    secondOrder.uuid = 'order-2';

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
    it('should return updated order with proper object structure', async () => {
      const uuid = 'test-uuid';
      const dto = createSampleUpdateOrderDto();

      const updatedOrder = createSampleOrder();
      updatedOrder.uuid = uuid;
      updatedOrder.status = dto.status;

      postgresService.update.mockResolvedValue(updatedOrder);

      const result = await service.update(uuid, dto);

      expect(result).toEqual(updatedOrder);
      expect(result.status).toBe(dto.status);
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
    it('should return canceled order with proper object structure', async () => {
      const uuid = 'test-uuid';

      const canceledOrder = createSampleOrder();
      canceledOrder.uuid = uuid;

      canceledOrder.status = OrderStatus.CANCELED;

      postgresService.cancel.mockResolvedValue(canceledOrder);

      const result = await service.cancel(uuid);

      expect(result).toEqual(canceledOrder);

      expect(result.status).toBe(OrderStatus.CANCELED);
    });

    it('should throw BadRequestException when cancel fails', async () => {
      const uuid = 'test-uuid';
      postgresService.cancel.mockRejectedValue(new Error('Cancel failed'));

      await expect(service.cancel(uuid)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated orders from ElasticsearchService when successful', async () => {
      const paginationDto = new PaginationDto();

      const paginatedResult: PaginatedResult<Order> = {
        data: [sampleOrder, secondOrder],
        total: 2,
        page: 1,
        limit: 10,
        pages: 1,
      };

      jest
        .spyOn(elasticsearchService, 'findAll')
        .mockResolvedValue(paginatedResult);

      const result = await service.findAll(paginationDto);

      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result).toEqual(paginatedResult);
    });

    it('should fall back to PostgresService when ElasticsearchService fails', async () => {
      const paginationDto = new PaginationDto();

      const paginatedResult: PaginatedResult<Order> = {
        data: [sampleOrder],
        total: 1,
        page: 1,
        limit: 10,
        pages: 1,
      };

      jest
        .spyOn(elasticsearchService, 'findAll')
        .mockRejectedValue(new Error('Connection failed'));
      jest.spyOn(postgresService, 'findAll').mockResolvedValue(paginatedResult);

      const result = await service.findAll(paginationDto);

      expect(result.data.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result).toEqual(paginatedResult);
    });

    it('should pass pagination parameters to services', async () => {
      const paginationDto: PaginationDto = { page: 2, limit: 15 };

      const paginatedResult: PaginatedResult<Order> = {
        data: [sampleOrder],
        total: 20,
        page: 2,
        limit: 15,
        pages: 2,
      };

      jest
        .spyOn(elasticsearchService, 'findAll')
        .mockResolvedValue(paginatedResult);

      await service.findAll(paginationDto);

      expect(elasticsearchService.findAll).toHaveBeenCalledWith(paginationDto);
    });
  });

  describe('findOne', () => {
    it('should return order with combined data', async () => {
      const id = 1;

      const pgOrder = createSampleOrder();
      pgOrder.id = id;

      const esOrder = createSampleOrder();
      esOrder.uuid = pgOrder.uuid;
      esOrder.id = id;
      esOrder.items = [{ id: 999, productName: 'Test Product' } as any];

      postgresService.findOne.mockResolvedValue(pgOrder);
      elasticsearchService.findOneByUuid.mockResolvedValue(esOrder);

      const result = await service.findOne(id);

      expect(result).toEqual(esOrder);
      expect(result.items).toEqual(esOrder.items);
    });

    it('should return PostgreSQL data when Elasticsearch fails', async () => {
      const id = 1;

      const pgOrder = createSampleOrder();
      pgOrder.id = id;

      postgresService.findOne.mockResolvedValue(pgOrder);
      elasticsearchService.findOneByUuid.mockRejectedValue(new Error());

      const result = await service.findOne(id);

      expect(result).toEqual(pgOrder);
    });
  });

  describe('findOneByUuid', () => {
    it('should return order from Elasticsearch when available', async () => {
      const uuid = 'test-uuid';

      const esOrder = createSampleOrder() as TestOrder;
      esOrder.uuid = uuid;
      esOrder.extraData = 'from-elasticsearch';

      elasticsearchService.findOneByUuid.mockResolvedValue(esOrder);

      const result = await service.findOneByUuid(uuid);

      expect(result).toEqual(esOrder);
      expect((result as TestOrder).extraData).toBe('from-elasticsearch');
    });

    it('should return order from PostgreSQL when Elasticsearch fails', async () => {
      const uuid = 'test-uuid';

      const pgOrder = createSampleOrder() as TestOrder;
      pgOrder.uuid = uuid;
      pgOrder.source = 'postgresql';

      elasticsearchService.findOneByUuid.mockRejectedValue(new Error());
      postgresService.findOneByUuid.mockResolvedValue(pgOrder);

      const result = await service.findOneByUuid(uuid);

      expect(result).toEqual(pgOrder);
      expect((result as TestOrder).source).toBe('postgresql');
    });
  });

  describe('findByCustomer', () => {
    it('should return customer orders from ElasticsearchService when successful', async () => {
      const customerId = 'customer-123';
      const paginationDto = new PaginationDto();

      sampleOrder.customerId = customerId;
      secondOrder.customerId = customerId;

      const paginatedResult: PaginatedResult<Order> = {
        data: [sampleOrder, secondOrder],
        total: 2,
        page: 1,
        limit: 10,
        pages: 1,
      };

      jest
        .spyOn(elasticsearchService, 'findByCustomer')
        .mockResolvedValue(paginatedResult);

      const result = await service.findByCustomer(customerId, paginationDto);

      expect(result.data.length).toBe(2);
      expect(result.data[0].customerId).toBe(customerId);
      expect(result).toEqual(paginatedResult);
    });

    it('should fall back to PostgresService when ElasticsearchService fails', async () => {
      const customerId = 'customer-123';
      const paginationDto = new PaginationDto();

      sampleOrder.customerId = customerId;

      const paginatedResult: PaginatedResult<Order> = {
        data: [sampleOrder],
        total: 1,
        page: 1,
        limit: 10,
        pages: 1,
      };

      jest
        .spyOn(elasticsearchService, 'findByCustomer')
        .mockRejectedValue(new Error('Connection failed'));
      jest
        .spyOn(postgresService, 'findByCustomer')
        .mockResolvedValue(paginatedResult);

      const result = await service.findByCustomer(customerId, paginationDto);

      expect(result.data.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result).toEqual(paginatedResult);
    });

    it('should pass pagination and customer parameters correctly', async () => {
      const customerId = 'customer-456';
      const paginationDto: PaginationDto = { page: 3, limit: 5 };

      const paginatedResult: PaginatedResult<Order> = {
        data: [],
        total: 0,
        page: 3,
        limit: 5,
        pages: 0,
      };

      jest
        .spyOn(elasticsearchService, 'findByCustomer')
        .mockResolvedValue(paginatedResult);

      await service.findByCustomer(customerId, paginationDto);

      expect(elasticsearchService.findByCustomer).toHaveBeenCalledWith(
        customerId,
        paginationDto,
      );
    });
  });
});
