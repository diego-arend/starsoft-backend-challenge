import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { createSampleOrder } from './test/controller-test.providers';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Order } from './entities/order.entity';
import { OrderStatus } from './entities/order.entity';

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
      // Arrange
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
    it('should return all orders', async () => {
      const orders = [sampleOrder, { ...sampleOrder, uuid: 'order-2' }];
      orderService.findAll.mockResolvedValue(orders);

      const result = await controller.findAll();

      expect(result).toEqual(orders);
      expect(result.length).toBe(2);
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
      const updatedOrder = { ...sampleOrder, status: OrderStatus.PROCESSING };
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
      const canceledOrder = { ...sampleOrder, status: OrderStatus.CANCELED };
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
    it('should return orders by customer ID', async () => {
      const customerId = 'customer-123';
      const orders = [
        { ...sampleOrder, customerId },
        { ...sampleOrder, customerId, uuid: 'order-2' },
      ];
      orderService.findByCustomer.mockResolvedValue(orders);

      const result = await controller.findByCustomer(customerId);

      expect(result).toEqual(orders);
      expect(result.length).toBe(2);
      expect(result[0].customerId).toBe(customerId);
    });

    it('should return empty array when customer has no orders', async () => {
      const customerId = 'customer-no-orders';
      orderService.findByCustomer.mockResolvedValue([]);

      const result = await controller.findByCustomer(customerId);

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });
  });
});
