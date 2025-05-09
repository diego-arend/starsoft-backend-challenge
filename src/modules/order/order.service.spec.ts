import { TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderService } from './order.service';
import { OrderPostgresService } from './services/order-postgres.service';
import { OrderElasticsearchService } from './services/order-elasticsearch.service';
import { createSampleOrder } from './test/test.providers';
import {
  createSampleCreateOrderDto,
  createSampleUpdateOrderDto,
} from './test/postgres-test.providers';
import { createMockEventEmitter } from './test/event-test.providers';
import { OrderStatus } from './entities/order.entity';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import {
  OrderNotFoundException,
  OrderNotModifiableException,
} from './exceptions/postgres-exceptions';
import { ElasticsearchNotFoundException } from '../../common/exceptions/elasticsearch-exceptions';
import { configureTestModule } from './test/test-module.helpers';
import { Order } from './entities/order.entity';
import {
  transformOrderToDto,
  transformPaginatedOrdersToDto,
} from './helpers/transform.helpers';

describe('OrderService', () => {
  let service: OrderService;
  let postgresService: jest.Mocked<OrderPostgresService>;
  let elasticsearchService: jest.Mocked<OrderElasticsearchService>;
  let sampleOrder: ReturnType<typeof createSampleOrder>;
  let customerId: string;

  beforeEach(async () => {
    sampleOrder = createSampleOrder();
    customerId = sampleOrder.customerId;

    const mockedPostgresService = {
      create: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findOneByUuid: jest.fn(),
      findByCustomer: jest.fn(),
    };

    const mockedElasticsearchService = {
      indexOrder: jest.fn(),
      updateOrder: jest.fn(),
      deleteOrder: jest.fn(),
      findAll: jest.fn(),
      findOneByUuid: jest.fn(),
      findByCustomer: jest.fn(),
    };

    const module: TestingModule = await configureTestModule([
      OrderService,
      { provide: OrderPostgresService, useValue: mockedPostgresService },
      {
        provide: OrderElasticsearchService,
        useValue: mockedElasticsearchService,
      },
      { provide: EventEmitter2, useValue: createMockEventEmitter() },
    ]).compile();

    service = module.get<OrderService>(OrderService);
    postgresService = module.get(OrderPostgresService);
    elasticsearchService = module.get(OrderElasticsearchService);
  });

  describe('create', () => {
    it('should create an order successfully', async () => {
      // Arrange
      const dto = createSampleCreateOrderDto();
      postgresService.create.mockResolvedValue(sampleOrder);

      // Act
      const result = await service.create(dto);

      // Assert
      expect(result).toEqual(transformOrderToDto(sampleOrder));
    });

    it('should throw BadRequestException when creation fails', async () => {
      // Arrange
      const dto = createSampleCreateOrderDto();
      const errorMessage = 'DB error';
      postgresService.create.mockRejectedValue(new Error(errorMessage));

      // Act & Assert
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto)).rejects.toThrow(errorMessage);
    });
  });

  describe('update', () => {
    it('should update an order successfully', async () => {
      // Arrange
      const uuid = 'order-123';
      const dto = createSampleUpdateOrderDto();
      const pendingOrder = createSampleOrder();
      pendingOrder.status = OrderStatus.PENDING;

      // Create a copy of pendingOrder with updated status
      const updatedOrder = createSampleOrder();
      updatedOrder.status = dto.status;

      postgresService.findOneByUuid.mockResolvedValue(pendingOrder);
      postgresService.update.mockResolvedValue(updatedOrder);

      // Act
      const result = await service.update(uuid, dto);

      // Assert
      expect(result).toEqual(transformOrderToDto(updatedOrder));
    });

    it('should throw OrderNotFoundException when order not found', async () => {
      // Arrange
      const uuid = 'non-existent';
      const dto = createSampleUpdateOrderDto();
      postgresService.findOneByUuid.mockRejectedValue(
        new OrderNotFoundException(uuid),
      );

      // Act & Assert
      await expect(service.update(uuid, dto)).rejects.toThrow(
        OrderNotFoundException,
      );
    });

    it('should throw OrderNotModifiableException for delivered orders', async () => {
      // Arrange
      const uuid = 'delivered-order';
      const dto = createSampleUpdateOrderDto();
      const deliveredOrder = createSampleOrder();
      deliveredOrder.status = OrderStatus.DELIVERED;

      postgresService.findOneByUuid.mockResolvedValue(deliveredOrder);

      // Act & Assert
      await expect(service.update(uuid, dto)).rejects.toThrow(
        OrderNotModifiableException,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel an order successfully', async () => {
      // Arrange
      const uuid = 'order-123';
      const canceledOrder = createSampleOrder();
      canceledOrder.status = OrderStatus.CANCELED;

      postgresService.cancel.mockResolvedValue(canceledOrder);

      // Act
      const result = await service.cancel(uuid);

      // Assert
      expect(result).toEqual(transformOrderToDto(canceledOrder));
      expect(result.status).toBe(OrderStatus.CANCELED);
    });

    it('should throw OrderNotFoundException when order not found', async () => {
      // Arrange
      const uuid = 'non-existent';
      postgresService.cancel.mockRejectedValue(
        new OrderNotFoundException(uuid),
      );

      // Act & Assert
      await expect(service.cancel(uuid)).rejects.toThrow(
        OrderNotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return orders from Elasticsearch', async () => {
      // Arrange
      const orders = [createSampleOrder(), createSampleOrder()];
      orders[1].uuid = 'order-2';

      const paginatedResult: PaginatedResult<Order> = {
        data: orders,
        total: 2,
        page: 1,
        limit: 10,
        pages: 1,
      };

      elasticsearchService.findAll.mockResolvedValue(paginatedResult);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual(transformPaginatedOrdersToDto(paginatedResult));
      expect(result.data.length).toBe(2);
    });

    it('should fallback to PostgreSQL when Elasticsearch fails', async () => {
      // Arrange
      const paginatedResult: PaginatedResult<Order> = {
        data: [sampleOrder],
        total: 1,
        page: 1,
        limit: 10,
        pages: 1,
      };

      elasticsearchService.findAll.mockRejectedValue(new Error('ES error'));
      postgresService.findAll.mockResolvedValue(paginatedResult);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual(transformPaginatedOrdersToDto(paginatedResult));
      expect(result.data.length).toBe(1);
    });
  });

  describe('findOneByUuid', () => {
    it('should return an order from Elasticsearch', async () => {
      // Arrange
      const uuid = 'order-123';
      const order = createSampleOrder();
      order.uuid = uuid;

      elasticsearchService.findOneByUuid.mockResolvedValue(order);

      // Act
      const result = await service.findOneByUuid(uuid);

      // Assert
      expect(result).toEqual(transformOrderToDto(order));
      expect(result.uuid).toBe(uuid);
    });

    it('should throw OrderNotFoundException when order not found', async () => {
      // Arrange
      const uuid = 'non-existent';
      elasticsearchService.findOneByUuid.mockRejectedValue(
        new ElasticsearchNotFoundException(
          `Document with ID '${uuid}' not found`,
        ),
      );

      // Act & Assert
      await expect(service.findOneByUuid(uuid)).rejects.toThrow(
        OrderNotFoundException,
      );
    });
  });

  describe('findByCustomer', () => {
    it('should return customer orders from Elasticsearch', async () => {
      // Arrange
      const customerOrders = [createSampleOrder(), createSampleOrder()];
      customerOrders[0].customerId = customerId;
      customerOrders[1].customerId = customerId;
      customerOrders[1].uuid = 'order-2';

      const paginatedResult: PaginatedResult<Order> = {
        data: customerOrders,
        total: 2,
        page: 1,
        limit: 10,
        pages: 1,
      };

      elasticsearchService.findByCustomer.mockResolvedValue(paginatedResult);

      // Act
      const result = await service.findByCustomer(customerId);

      // Assert
      expect(result).toEqual(transformPaginatedOrdersToDto(paginatedResult));
      expect(result.data.length).toBe(2);
      expect(result.data[0].customerId).toBe(customerId);
    });

    it('should throw OrderNotFoundException when no orders found', async () => {
      // Arrange
      const nonExistentCustomerId = 'customer-without-orders';
      elasticsearchService.findByCustomer.mockRejectedValue(
        new NotFoundException(
          `No orders found for customer ID: ${nonExistentCustomerId}`,
        ),
      );

      // Act & Assert
      await expect(
        service.findByCustomer(nonExistentCustomerId),
      ).rejects.toThrow(OrderNotFoundException);
    });

    it('should fallback to PostgreSQL when Elasticsearch fails', async () => {
      // Arrange
      const customerOrder = createSampleOrder();
      customerOrder.customerId = customerId;

      const paginatedResult: PaginatedResult<Order> = {
        data: [customerOrder],
        total: 1,
        page: 1,
        limit: 10,
        pages: 1,
      };

      elasticsearchService.findByCustomer.mockRejectedValue(
        new Error('ES error'),
      );
      postgresService.findByCustomer.mockResolvedValue(paginatedResult);

      // Act
      const result = await service.findByCustomer(customerId);

      // Assert
      expect(result).toEqual(transformPaginatedOrdersToDto(paginatedResult));
      expect(result.data.length).toBe(1);
      expect(result.data[0].customerId).toBe(customerId);
    });
  });
});
