import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { OrderStatus } from './entities/order.entity';
import {
  OrderNotFoundException,
  OrderNotModifiableException,
} from './exceptions/postgres-exceptions';
import { ElasticsearchNotFoundException } from '../../common/exceptions/elasticsearch-exceptions';
import { mockOrder, mockOrders } from '../../test/mocks/order.mock';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { OrderResponseDto } from './dto/order-response.dto';

describe('OrderController', () => {
  let controller: OrderController;
  let service: OrderService;

  const sampleOrder = { ...mockOrder };
  const ordersList: OrderResponseDto[] = mockOrders.map((order) => ({
    ...order,
    items: order.items.map((item) => ({
      ...item,
      uuid: 'mock-uuid',
      subtotal: item.quantity * item.price,
    })),
    createdAt: new Date(order.createdAt),
    updatedAt: new Date(order.updatedAt),
  }));

  const createOrderDto: CreateOrderDto = {
    customerId: sampleOrder.customerId,
    items: sampleOrder.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      price: item.price,
    })),
  };

  const updateOrderDto: UpdateOrderDto = {
    status: OrderStatus.PROCESSING,
  };

  const paginatedResult: PaginatedResult<OrderResponseDto> = {
    data: ordersList,
    total: ordersList.length,
    page: 1,
    limit: 10,
    pages: 1,
  };

  const emptyPaginatedResult: PaginatedResult<OrderResponseDto> = {
    data: [],
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  };

  beforeEach(async () => {
    const serviceStub = {
      create: jest.fn().mockResolvedValue(sampleOrder),
      findAll: jest.fn().mockResolvedValue(paginatedResult),
      findOneByUuid: jest.fn().mockResolvedValue(sampleOrder),
      update: jest.fn().mockImplementation((uuid, dto) => {
        return Promise.resolve({
          ...sampleOrder,
          status: dto.status || sampleOrder.status,
          updatedAt: new Date().toISOString(),
        });
      }),
      cancel: jest.fn().mockResolvedValue({
        ...sampleOrder,
        status: OrderStatus.CANCELED,
      }),
      findByCustomer: jest.fn().mockResolvedValue(paginatedResult),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: serviceStub,
        },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
    service = module.get<OrderService>(OrderService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new order and return it', async () => {
      const result = await controller.create(createOrderDto);

      expect(result).toBeDefined();
      expect(result.uuid).toBe(sampleOrder.uuid);
      expect(result.customerId).toBe(sampleOrder.customerId);
      expect(result.status).toBe(sampleOrder.status);
      expect(result.total).toBe(sampleOrder.total);
    });

    it('should throw BadRequestException when creation fails', async () => {
      jest
        .spyOn(service, 'create')
        .mockRejectedValue(new BadRequestException('Failed to create order'));

      await expect(controller.create(createOrderDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.create(createOrderDto)).rejects.toThrow(
        'Failed to create order',
      );
    });
  });

  describe('findAll', () => {
    it('should return all orders with pagination', async () => {
      const paginationDto = new PaginationDto();
      paginationDto.page = 1;
      paginationDto.limit = 10;

      const result = await controller.findAll(paginationDto);

      expect(result.data).toHaveLength(ordersList.length);
      expect(result.total).toBe(ordersList.length);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should return empty result when no orders exist', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue(emptyPaginatedResult);

      const result = await controller.findAll(new PaginationDto());

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a specific order by UUID', async () => {
      const result = await controller.findOne(sampleOrder.uuid);

      expect(result.uuid).toBe(sampleOrder.uuid);
      expect(result.customerId).toBe(sampleOrder.customerId);
      expect(result.status).toBe(sampleOrder.status);
    });

    it('should throw OrderNotFoundException when order does not exist', async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      jest
        .spyOn(service, 'findOneByUuid')
        .mockRejectedValue(new OrderNotFoundException(nonExistentUuid));

      await expect(controller.findOne(nonExistentUuid)).rejects.toThrow(
        OrderNotFoundException,
      );
      await expect(controller.findOne(nonExistentUuid)).rejects.toThrow(
        `Order with UUID ${nonExistentUuid} not found`,
      );
    });
  });

  describe('update', () => {
    it('should update order status successfully', async () => {
      const result = await controller.update(sampleOrder.uuid, updateOrderDto);

      expect(result.uuid).toBe(sampleOrder.uuid);
      expect(result.status).toBe(OrderStatus.PROCESSING);
    });

    it('should throw OrderNotFoundException when updating non-existent order', async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      jest
        .spyOn(service, 'update')
        .mockRejectedValue(new OrderNotFoundException(nonExistentUuid));

      await expect(
        controller.update(nonExistentUuid, updateOrderDto),
      ).rejects.toThrow(OrderNotFoundException);
    });

    it('should throw OrderNotModifiableException when order cannot be modified', async () => {
      const status = OrderStatus.DELIVERED;
      jest
        .spyOn(service, 'update')
        .mockRejectedValue(new OrderNotModifiableException(status));

      await expect(
        controller.update(sampleOrder.uuid, updateOrderDto),
      ).rejects.toThrow(OrderNotModifiableException);
      await expect(
        controller.update(sampleOrder.uuid, updateOrderDto),
      ).rejects.toThrow(`Order with status ${status} cannot be modified`);
    });
  });

  describe('cancel', () => {
    it('should cancel an order successfully', async () => {
      const result = await controller.cancel(sampleOrder.uuid);

      expect(result.uuid).toBe(sampleOrder.uuid);
      expect(result.status).toBe(OrderStatus.CANCELED);
    });

    it('should throw OrderNotFoundException when canceling non-existent order', async () => {
      const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
      jest
        .spyOn(service, 'cancel')
        .mockRejectedValue(new OrderNotFoundException(nonExistentUuid));

      await expect(controller.cancel(nonExistentUuid)).rejects.toThrow(
        OrderNotFoundException,
      );
    });

    it('should throw OrderNotModifiableException when order cannot be canceled', async () => {
      const status = OrderStatus.DELIVERED;
      jest
        .spyOn(service, 'cancel')
        .mockRejectedValue(new OrderNotModifiableException(status));

      await expect(controller.cancel(sampleOrder.uuid)).rejects.toThrow(
        OrderNotModifiableException,
      );
    });
  });

  describe('findByCustomer', () => {
    it('should return orders for a specific customer', async () => {
      const customerId = sampleOrder.customerId;
      const result = await controller.findByCustomer(
        customerId,
        new PaginationDto(),
      );

      expect(result.data).toHaveLength(ordersList.length);
      expect(result.total).toBe(ordersList.length);
      expect(result.data[0].customerId).toBe(customerId);
    });

    it('should return empty array when customer has no orders', async () => {
      const customerId = 'customer-no-orders';
      jest
        .spyOn(service, 'findByCustomer')
        .mockResolvedValue(emptyPaginatedResult);

      const result = await controller.findByCustomer(
        customerId,
        new PaginationDto(),
      );

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should throw OrderNotFoundException when customer orders search fails', async () => {
      const customerId = 'non-existent-customer';
      jest
        .spyOn(service, 'findByCustomer')
        .mockRejectedValue(
          new OrderNotFoundException(`customer: ${customerId}`),
        );

      await expect(
        controller.findByCustomer(customerId, new PaginationDto()),
      ).rejects.toThrow(OrderNotFoundException);
    });

    it('should throw ElasticsearchNotFoundException when search engine fails', async () => {
      const customerId = 'customer-search-error';
      jest
        .spyOn(service, 'findByCustomer')
        .mockRejectedValue(
          new ElasticsearchNotFoundException(
            `No orders found for customer ID: ${customerId}`,
          ),
        );

      await expect(
        controller.findByCustomer(customerId, new PaginationDto()),
      ).rejects.toThrow(ElasticsearchNotFoundException);
      await expect(
        controller.findByCustomer(customerId, new PaginationDto()),
      ).rejects.toThrow(`No orders found for customer ID: ${customerId}`);
    });
  });
});
