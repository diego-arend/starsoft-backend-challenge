import { TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderService } from './order.service';
import { OrderPostgresService } from './services/order-postgres.service';
import { OrderElasticsearchService } from './services/order-elasticsearch.service';
import { OrderEventsService } from './services/order-events.service';
import { createSampleOrder } from './test/test.providers';
import {
  createSampleCreateOrderDto,
  createSampleUpdateOrderDto,
} from './test/postgres-test.providers';
import { createMockEventEmitter } from './test/event-test.providers';
import { createMockOrderEventsService } from './test/services-test.providers';
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
import { getRepositoryToken } from '@nestjs/typeorm';

describe('OrderService', () => {
  let service: OrderService;
  let postgresService: jest.Mocked<OrderPostgresService>;
  let elasticsearchService: jest.Mocked<OrderElasticsearchService>;
  let orderEventsService: jest.Mocked<OrderEventsService>;
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

    const mockOrderEventsService = createMockOrderEventsService();
    const mockOrderRepository = { findOne: jest.fn() };

    const module: TestingModule = await configureTestModule([
      OrderService,
      { provide: OrderPostgresService, useValue: mockedPostgresService },
      {
        provide: OrderElasticsearchService,
        useValue: mockedElasticsearchService,
      },
      { provide: OrderEventsService, useValue: mockOrderEventsService },
      { provide: EventEmitter2, useValue: createMockEventEmitter() },
      {
        provide: getRepositoryToken(Order),
        useValue: mockOrderRepository,
      },
    ]).compile();

    service = module.get<OrderService>(OrderService);
    postgresService = module.get(OrderPostgresService);
    elasticsearchService = module.get(OrderElasticsearchService);
    orderEventsService = module.get(OrderEventsService);
  });

  describe('create', () => {
    it('should create an order and publish order_created event', async () => {
      const dto = createSampleCreateOrderDto();
      postgresService.create.mockResolvedValue(sampleOrder);

      const result = await service.create(dto);

      expect(result).toEqual(transformOrderToDto(sampleOrder));

      expect(orderEventsService.publishOrderCreated).toHaveBeenCalledWith(
        sampleOrder,
      );
    });

    it('should throw BadRequestException when creation fails', async () => {
      const dto = createSampleCreateOrderDto();
      const errorMessage = 'DB error';
      postgresService.create.mockRejectedValue(new Error(errorMessage));

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(dto)).rejects.toThrow(errorMessage);
    });
  });

  describe('update', () => {
    it('should update an order and publish order_status_updated event when status changes', async () => {
      const uuid = 'order-123';
      const dto = createSampleUpdateOrderDto();

      const pendingOrder = createSampleOrder();
      pendingOrder.status = OrderStatus.PENDING;

      const updatedOrder = createSampleOrder();
      updatedOrder.status = OrderStatus.PROCESSING;

      postgresService.findOneByUuid.mockResolvedValue(pendingOrder);
      postgresService.update.mockResolvedValue(updatedOrder);

      const result = await service.update(uuid, dto);

      expect(result).toEqual(transformOrderToDto(updatedOrder));

      expect(orderEventsService.publishOrderStatusUpdated).toHaveBeenCalledWith(
        updatedOrder,
        OrderStatus.PENDING,
      );
    });

    it('should update an order but NOT publish order_status_updated event when status does not change', async () => {
      const uuid = 'order-123';
      const dto = {
        ...createSampleUpdateOrderDto(),
        status: OrderStatus.PENDING,
      };

      const pendingOrder = createSampleOrder();
      pendingOrder.status = OrderStatus.PENDING;

      const updatedOrder = createSampleOrder();
      updatedOrder.status = OrderStatus.PENDING;

      postgresService.findOneByUuid.mockResolvedValue(pendingOrder);
      postgresService.update.mockResolvedValue(updatedOrder);

      const result = await service.update(uuid, dto);

      expect(result).toEqual(transformOrderToDto(updatedOrder));

      expect(
        orderEventsService.publishOrderStatusUpdated,
      ).not.toHaveBeenCalled();
    });

    it('should throw OrderNotFoundException when order not found', async () => {
      const uuid = 'non-existent';
      const dto = createSampleUpdateOrderDto();
      postgresService.findOneByUuid.mockRejectedValue(
        new OrderNotFoundException(uuid),
      );

      await expect(service.update(uuid, dto)).rejects.toThrow(
        OrderNotFoundException,
      );
    });

    it('should throw OrderNotModifiableException for delivered orders', async () => {
      const uuid = 'delivered-order';
      const dto = createSampleUpdateOrderDto();
      const deliveredOrder = createSampleOrder();
      deliveredOrder.status = OrderStatus.DELIVERED;

      postgresService.findOneByUuid.mockResolvedValue(deliveredOrder);

      await expect(service.update(uuid, dto)).rejects.toThrow(
        OrderNotModifiableException,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel an order and publish order_status_updated event', async () => {
      const uuid = 'order-123';

      const pendingOrder = createSampleOrder();
      pendingOrder.status = OrderStatus.PENDING;

      const canceledOrder = createSampleOrder();
      canceledOrder.status = OrderStatus.CANCELED;

      postgresService.findOneByUuid.mockResolvedValue(pendingOrder);
      postgresService.cancel.mockResolvedValue(canceledOrder);

      const result = await service.cancel(uuid);

      expect(result).toEqual(transformOrderToDto(canceledOrder));
      expect(result.status).toBe(OrderStatus.CANCELED);

      expect(orderEventsService.publishOrderStatusUpdated).toHaveBeenCalledWith(
        canceledOrder,
        OrderStatus.PENDING,
      );
    });

    it('should throw OrderNotFoundException when order not found', async () => {
      const uuid = 'non-existent';

      postgresService.findOneByUuid.mockRejectedValue(
        new OrderNotFoundException(uuid),
      );

      await expect(service.cancel(uuid)).rejects.toThrow(
        OrderNotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return orders from Elasticsearch', async () => {
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

      const result = await service.findAll();

      expect(result).toEqual(transformPaginatedOrdersToDto(paginatedResult));
      expect(result.data.length).toBe(2);
    });

    it('should fallback to PostgreSQL when Elasticsearch fails', async () => {
      const paginatedResult: PaginatedResult<Order> = {
        data: [sampleOrder],
        total: 1,
        page: 1,
        limit: 10,
        pages: 1,
      };

      elasticsearchService.findAll.mockRejectedValue(new Error('ES error'));
      postgresService.findAll.mockResolvedValue(paginatedResult);

      const result = await service.findAll();

      expect(result).toEqual(transformPaginatedOrdersToDto(paginatedResult));
      expect(result.data.length).toBe(1);
    });
  });

  describe('findOneByUuid', () => {
    it('should return an order from Elasticsearch', async () => {
      const uuid = 'order-123';
      const order = createSampleOrder();
      order.uuid = uuid;

      elasticsearchService.findOneByUuid.mockResolvedValue(order);

      const result = await service.findOneByUuid(uuid);

      expect(result).toEqual(transformOrderToDto(order));
      expect(result.uuid).toBe(uuid);
    });

    it('should throw OrderNotFoundException when order not found', async () => {
      const uuid = 'non-existent';
      elasticsearchService.findOneByUuid.mockRejectedValue(
        new ElasticsearchNotFoundException(
          `Document with ID '${uuid}' not found`,
        ),
      );

      await expect(service.findOneByUuid(uuid)).rejects.toThrow(
        OrderNotFoundException,
      );
    });
  });

  describe('findByCustomer', () => {
    it('should return customer orders from Elasticsearch', async () => {
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

      const result = await service.findByCustomer(customerId);

      expect(result).toEqual(transformPaginatedOrdersToDto(paginatedResult));
      expect(result.data.length).toBe(2);
      expect(result.data[0].customerId).toBe(customerId);
    });

    it('should throw OrderNotFoundException when no orders found', async () => {
      const nonExistentCustomerId = 'customer-without-orders';
      elasticsearchService.findByCustomer.mockRejectedValue(
        new NotFoundException(
          `No orders found for customer ID: ${nonExistentCustomerId}`,
        ),
      );

      await expect(
        service.findByCustomer(nonExistentCustomerId),
      ).rejects.toThrow(OrderNotFoundException);
    });

    it('should fallback to PostgreSQL when Elasticsearch fails', async () => {
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

      const result = await service.findByCustomer(customerId);

      expect(result).toEqual(transformPaginatedOrdersToDto(paginatedResult));
      expect(result.data.length).toBe(1);
      expect(result.data[0].customerId).toBe(customerId);
    });
  });
});
