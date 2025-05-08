import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import {
  createSampleOrder,
  cloneSampleOrderWithNewUuid,
} from './test/controller-test.providers';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Order } from './entities/order.entity';
import { OrderStatus } from './entities/order.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

describe('OrderController', () => {
  let controller: OrderController;
  let orderService: any;
  let sampleOrder: Order;

  beforeEach(async () => {
    sampleOrder = createSampleOrder();

    orderService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOneByUuid: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
      findByCustomer: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: orderService,
        },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
  });

  describe('create', () => {
    it('should create a new order successfully', async () => {
      const createOrderDto: CreateOrderDto = {
        customerId: 'customer-123',
        items: [
          {
            productId: 'product-1',
            productName: 'Sample Product',
            quantity: 2,
            price: 1000,
          },
        ],
      };
      orderService.create.mockResolvedValue(sampleOrder);

      const result = await controller.create(createOrderDto);

      expect(result).toEqual(sampleOrder);
    });

    it('should pass through BadRequestException when service fails', async () => {
      const createOrderDto: CreateOrderDto = {
        customerId: 'customer-123',
        items: [],
      };
      orderService.create.mockRejectedValue(
        new BadRequestException('Invalid order'),
      );

      await expect(controller.create(createOrderDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated orders', async () => {
      const secondOrder = cloneSampleOrderWithNewUuid(sampleOrder);
      secondOrder.uuid = 'order-2';

      const paginatedOrders: PaginatedResult<Order> = {
        data: [sampleOrder, secondOrder],
        total: 2,
        page: 1,
        limit: 10,
        pages: 1,
      };

      orderService.findAll.mockResolvedValue(paginatedOrders);
      const paginationDto: PaginationDto = { page: 1, limit: 10 };

      const result = await controller.findAll(paginationDto);

      expect(result).toEqual(paginatedOrders);
      expect(result.data.length).toBe(2);
      expect(result.page).toBe(1);
      expect(result.total).toBe(2);
    });

    it('should use default pagination when not provided', async () => {
      const paginatedOrders: PaginatedResult<Order> = {
        data: [sampleOrder],
        total: 1,
        page: 1,
        limit: 10,
        pages: 1,
      };

      orderService.findAll.mockResolvedValue(paginatedOrders);

      const result = await controller.findAll({});

      expect(orderService.findAll).toHaveBeenCalled();
      expect(result.data.length).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return an order by UUID', async () => {
      const uuid = 'test-uuid';
      orderService.findOneByUuid.mockResolvedValue(sampleOrder);

      const result = await controller.findOne(uuid);

      expect(result).toEqual(sampleOrder);
    });

    it('should pass through NotFoundException when service fails', async () => {
      const uuid = 'nonexistent-uuid';
      orderService.findOneByUuid.mockRejectedValue(
        new NotFoundException('Order not found'),
      );

      await expect(controller.findOne(uuid)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an order successfully', async () => {
      const uuid = 'test-uuid';
      const updateOrderDto: UpdateOrderDto = {
        status: OrderStatus.PROCESSING,
      };

      const updatedOrder = cloneSampleOrderWithNewUuid(sampleOrder);
      updatedOrder.status = OrderStatus.PROCESSING;

      orderService.update.mockResolvedValue(updatedOrder);

      const result = await controller.update(uuid, updateOrderDto);

      expect(result).toEqual(updatedOrder);
      expect(result.status).toBe(OrderStatus.PROCESSING);
    });

    it('should pass through BadRequestException when update fails', async () => {
      const uuid = 'test-uuid';
      const updateOrderDto: UpdateOrderDto = {
        status: OrderStatus.PROCESSING,
      };
      orderService.update.mockRejectedValue(
        new BadRequestException('Cannot update'),
      );

      await expect(controller.update(uuid, updateOrderDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel an order successfully', async () => {
      const uuid = 'test-uuid';

      const canceledOrder = cloneSampleOrderWithNewUuid(sampleOrder);
      canceledOrder.status = OrderStatus.CANCELED;

      orderService.cancel.mockResolvedValue(canceledOrder);

      const result = await controller.cancel(uuid);

      expect(result).toEqual(canceledOrder);
      expect(result.status).toBe(OrderStatus.CANCELED);
    });

    it('should pass through BadRequestException when cancel fails', async () => {
      const uuid = 'test-uuid';
      orderService.cancel.mockRejectedValue(
        new BadRequestException('Cannot cancel'),
      );

      await expect(controller.cancel(uuid)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findByCustomer', () => {
    it('should return paginated orders by customer ID', async () => {
      const customerId = 'customer-123';
      const paginationDto = new PaginationDto();

      const secondOrder = cloneSampleOrderWithNewUuid(sampleOrder);
      secondOrder.uuid = 'order-2';

      const paginatedResult: PaginatedResult<Order> = {
        data: [sampleOrder, secondOrder],
        total: 2,
        page: 1,
        limit: 10,
        pages: 1,
      };

      orderService.findByCustomer.mockResolvedValue(paginatedResult);

      const result = await controller.findByCustomer(customerId, paginationDto);

      expect(result).toEqual(paginatedResult);
      expect(result.data.length).toBe(2);
      expect(result.data[0].customerId).toBe(customerId);
    });

    it('should return empty data when customer has no orders', async () => {
      const customerId = 'customer-no-orders';
      const paginationDto = new PaginationDto();

      const emptyResult: PaginatedResult<Order> = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        pages: 0,
      };

      orderService.findByCustomer.mockResolvedValue(emptyResult);

      const result = await controller.findByCustomer(customerId, paginationDto);

      expect(result).toEqual(emptyResult);
      expect(result.data.length).toBe(0);
      expect(result.total).toBe(0);
    });
  });
});
