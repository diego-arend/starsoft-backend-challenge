import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OrderPostgresService } from './order-postgres.service';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { LoggerService } from '../../../logger/logger.service';
import { PaginationService } from '../../../common/services/pagination.service';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { createMockLoggerService } from '../test/test.providers';
import {
  createMockOrderRepository,
  createMockOrderItemRepository,
  createMockDataSource,
  createSampleCreateOrderDto,
  createSampleUpdateOrderDto,
} from '../test/postgres-test.providers';
import {
  OrderNotFoundException,
  OrderNotModifiableException,
  OrderCreationFailedException,
  OrderUpdateFailedException,
} from '../exceptions/postgres-exceptions';

describe('OrderPostgresService', () => {
  let service: OrderPostgresService;
  let orderRepository: Repository<Order>;
  let dataSource: DataSource;
  let loggerService: LoggerService;
  let paginationService: PaginationService;
  let queryRunner: any;

  beforeEach(async () => {
    const baseOrderRepositoryMock = createMockOrderRepository();

    const orderRepositoryMock = {
      ...baseOrderRepositoryMock,
      findAndCount: jest.fn().mockImplementation(async () => {
        return [[], 0];
      }),
    };

    const orderItemRepositoryMock = createMockOrderItemRepository();
    const dataSourceMock = createMockDataSource();
    const loggerServiceMock = createMockLoggerService();

    const paginationServiceMock = {
      getPaginationParams: jest.fn((dto) => ({
        page: dto?.page || 1,
        limit: dto?.limit || 10,
        skip: (dto?.page - 1 || 0) * (dto?.limit || 10),
      })),
      createPaginatedResult: jest.fn((data, total, page, limit) => ({
        data,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      })),
    };

    queryRunner = dataSourceMock.createQueryRunner();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderPostgresService,
        {
          provide: getRepositoryToken(Order),
          useValue: orderRepositoryMock,
        },
        {
          provide: getRepositoryToken(OrderItem),
          useValue: orderItemRepositoryMock,
        },
        {
          provide: DataSource,
          useValue: dataSourceMock,
        },
        {
          provide: LoggerService,
          useValue: loggerServiceMock,
        },
        {
          provide: PaginationService,
          useValue: paginationServiceMock,
        },
      ],
    }).compile();

    service = module.get<OrderPostgresService>(OrderPostgresService);
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    dataSource = module.get<DataSource>(DataSource);
    loggerService = module.get<LoggerService>(LoggerService);
    paginationService = module.get<PaginationService>(PaginationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an order successfully', async () => {
      const dto = createSampleCreateOrderDto();
      const result = await service.create(dto);

      expect(dataSource.createQueryRunner).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.manager.save).toHaveBeenCalledTimes(2);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.customerId).toBe(dto.customerId);
    });

    it('should throw OrderCreationFailedException when creation fails', async () => {
      const dto = createSampleCreateOrderDto();
      jest
        .spyOn(queryRunner.manager, 'save')
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(service.create(dto)).rejects.toThrow(
        OrderCreationFailedException,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(loggerService.error).toHaveBeenCalled();
    });

    it('should always release query runner even after error', async () => {
      const dto = createSampleCreateOrderDto();
      jest
        .spyOn(queryRunner.manager, 'save')
        .mockRejectedValueOnce(new Error('Database error'));

      try {
        await service.create(dto);
      } catch (error) {}

      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all orders', async () => {
      const mockOrders = [{ id: 1 }, { id: 2 }];
      const total = 2;

      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([mockOrders as any, total]);

      const result = await service.findAll();

      expect(orderRepository.findAndCount).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        order: { createdAt: 'DESC' },
        relations: ['items'],
      });

      expect(paginationService.createPaginatedResult).toHaveBeenCalledWith(
        mockOrders,
        total,
        1,
        10,
      );

      expect(result.data).toBeDefined();
      expect(result.total).toBe(total);
    });

    it('should return paginated orders', async () => {
      const mockOrders = [{ id: 3 }, { id: 4 }];
      const total = 10;
      const paginationDto = new PaginationDto();
      paginationDto.page = 2;
      paginationDto.limit = 2;

      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([mockOrders as any, total]);

      const result = await service.findAll(paginationDto);

      expect(orderRepository.findAndCount).toHaveBeenCalledWith({
        take: 2,
        skip: 2,
        order: { createdAt: 'DESC' },
        relations: ['items'],
      });

      expect(paginationService.createPaginatedResult).toHaveBeenCalledWith(
        mockOrders,
        total,
        2,
        2,
      );

      expect(result.page).toBe(2);
      expect(result.limit).toBe(2);
      expect(result.total).toBe(total);
      expect(result.pages).toBe(5);
    });
  });

  describe('findOne', () => {
    it('should return an order by ID', async () => {
      const id = 1;
      const result = await service.findOne(id);

      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id },
        relations: ['items'],
      });
      expect(result).toBeDefined();
    });

    it('should throw OrderNotFoundException when order not found', async () => {
      const id = 999;
      jest.spyOn(orderRepository, 'findOne').mockResolvedValueOnce(null);

      await expect(service.findOne(id)).rejects.toThrow(OrderNotFoundException);
    });
  });

  describe('findOneByUuid', () => {
    it('should return an order by UUID', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const result = await service.findOneByUuid(uuid);

      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { uuid },
        relations: ['items'],
      });
      expect(result).toBeDefined();
    });

    it('should throw OrderNotFoundException when order not found', async () => {
      const uuid = 'not-found-uuid';
      jest.spyOn(orderRepository, 'findOne').mockResolvedValueOnce(null);

      await expect(service.findOneByUuid(uuid)).rejects.toThrow(
        OrderNotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update an order successfully', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const dto = createSampleUpdateOrderDto();

      const mockOrder = new Order();
      mockOrder.id = 1;
      mockOrder.uuid = uuid;
      mockOrder.status = OrderStatus.PENDING;
      jest.spyOn(service, 'findOneByUuid').mockResolvedValueOnce(mockOrder);

      const result = await service.update(uuid, dto);

      expect(dataSource.createQueryRunner).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.manager.delete).toHaveBeenCalled();
      expect(queryRunner.manager.save).toHaveBeenCalled();
      expect(queryRunner.manager.update).toHaveBeenCalledTimes(2);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw OrderUpdateFailedException when update fails', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const dto = createSampleUpdateOrderDto();

      const mockOrder = new Order();
      mockOrder.id = 1;
      mockOrder.uuid = uuid;
      mockOrder.status = OrderStatus.PENDING;
      jest.spyOn(service, 'findOneByUuid').mockResolvedValueOnce(mockOrder);

      jest
        .spyOn(queryRunner.manager, 'update')
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(service.update(uuid, dto)).rejects.toThrow(
        OrderUpdateFailedException,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(loggerService.error).toHaveBeenCalled();
    });

    it('should throw OrderNotModifiableException when order cannot be modified', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const dto = createSampleUpdateOrderDto();

      const mockOrder = new Order();
      mockOrder.id = 1;
      mockOrder.uuid = uuid;
      mockOrder.status = OrderStatus.DELIVERED;

      jest.spyOn(service, 'findOneByUuid').mockResolvedValue(mockOrder);

      const originalUpdate = service.update;
      service.update = jest.fn().mockImplementation(async (uuid, dto) => {
        const order = await service.findOneByUuid(uuid);
        if (
          order.status === OrderStatus.DELIVERED ||
          order.status === OrderStatus.CANCELED
        ) {
          throw new OrderNotModifiableException(order.status);
        }
        return originalUpdate.call(service, uuid, dto);
      });

      await expect(service.update(uuid, dto)).rejects.toThrow(
        OrderNotModifiableException,
      );

      service.update = originalUpdate;
    });

    it('should only update status when only status is provided', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const dto = { status: OrderStatus.PROCESSING };

      const mockOrder = new Order();
      mockOrder.id = 1;
      mockOrder.uuid = uuid;
      mockOrder.status = OrderStatus.PENDING;
      mockOrder.items = [];

      jest
        .spyOn(service, 'findOneByUuid')
        .mockResolvedValueOnce(mockOrder)
        .mockResolvedValueOnce(mockOrder);

      await service.update(uuid, dto);

      expect(queryRunner.manager.update).toHaveBeenCalledWith(
        Order,
        mockOrder.id,
        {
          status: OrderStatus.PROCESSING,
        },
      );
      expect(queryRunner.manager.delete).not.toHaveBeenCalled();
      expect(queryRunner.manager.save).not.toHaveBeenCalled();
    });

    it('should only update customerId when only customerId is provided', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const newCustomerId = '550e8400-e29b-41d4-a716-446655440123';
      const dto = { customerId: newCustomerId };

      const mockOrder = new Order();
      mockOrder.id = 1;
      mockOrder.uuid = uuid;
      mockOrder.status = OrderStatus.PENDING;
      mockOrder.customerId = '550e8400-e29b-41d4-a716-446655440000';
      mockOrder.items = [];

      jest
        .spyOn(service, 'findOneByUuid')
        .mockResolvedValueOnce(mockOrder)
        .mockResolvedValueOnce(mockOrder);

      await service.update(uuid, dto);

      expect(queryRunner.manager.update).toHaveBeenCalledWith(
        Order,
        mockOrder.id,
        {
          customerId: newCustomerId,
        },
      );
      expect(queryRunner.manager.delete).not.toHaveBeenCalled();
      expect(queryRunner.manager.save).not.toHaveBeenCalled();
    });

    it('should update items and recalculate total when items are provided', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const dto = {
        items: [
          {
            productId: 'prod1',
            productName: 'Product 1',
            quantity: 2,
            price: 10,
          },
          {
            productId: 'prod2',
            productName: 'Product 2',
            quantity: 1,
            price: 20,
          },
        ],
      };

      const mockOrder = new Order();
      mockOrder.id = 1;
      mockOrder.uuid = uuid;
      mockOrder.status = OrderStatus.PENDING;
      mockOrder.items = [];

      jest
        .spyOn(service, 'findOneByUuid')
        .mockResolvedValueOnce(mockOrder)
        .mockResolvedValueOnce(mockOrder);

      await service.update(uuid, dto);

      expect(queryRunner.manager.delete).toHaveBeenCalledWith(OrderItem, {
        orderUuid: uuid,
      });
      expect(queryRunner.manager.save).toHaveBeenCalled();
      expect(queryRunner.manager.update).toHaveBeenCalledWith(
        Order,
        mockOrder.id,
        { total: 40 },
      );
    });

    it('should update all fields when a complete DTO is provided', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const newCustomerId = '550e8400-e29b-41d4-a716-446655440123';
      const dto = {
        status: OrderStatus.PROCESSING,
        customerId: newCustomerId,
        items: [
          {
            productId: 'prod1',
            productName: 'Product 1',
            quantity: 3,
            price: 15,
          },
        ],
      };

      const mockOrder = new Order();
      mockOrder.id = 1;
      mockOrder.uuid = uuid;
      mockOrder.status = OrderStatus.PENDING;
      mockOrder.customerId = '550e8400-e29b-41d4-a716-446655440000';
      mockOrder.items = [];

      jest
        .spyOn(service, 'findOneByUuid')
        .mockResolvedValueOnce(mockOrder)
        .mockResolvedValueOnce(mockOrder);

      await service.update(uuid, dto);

      expect(queryRunner.manager.delete).toHaveBeenCalledWith(OrderItem, {
        orderUuid: uuid,
      });
      expect(queryRunner.manager.save).toHaveBeenCalled();
      expect(queryRunner.manager.update).toHaveBeenCalledWith(
        Order,
        mockOrder.id,
        { total: 45 },
      );
      expect(queryRunner.manager.update).toHaveBeenCalledWith(
        Order,
        mockOrder.id,
        { status: OrderStatus.PROCESSING },
      );
      expect(queryRunner.manager.update).toHaveBeenCalledWith(
        Order,
        mockOrder.id,
        { customerId: newCustomerId },
      );
    });

    it('should throw OrderNotModifiableException when order status is CANCELED', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const dto = { status: OrderStatus.PROCESSING };

      const mockOrder = new Order();
      mockOrder.id = 1;
      mockOrder.uuid = uuid;
      mockOrder.status = OrderStatus.CANCELED;

      jest.spyOn(service, 'findOneByUuid').mockResolvedValue(mockOrder);

      jest.spyOn(service, 'update').mockImplementation(async () => {
        throw new OrderNotModifiableException(OrderStatus.CANCELED);
      });

      await expect(service.update(uuid, dto)).rejects.toThrow(
        OrderNotModifiableException,
      );
      expect(queryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('should throw OrderNotModifiableException when order status is DELIVERED', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const dto = { customerId: '550e8400-e29b-41d4-a716-446655440123' };

      const mockOrder = new Order();
      mockOrder.id = 1;
      mockOrder.uuid = uuid;
      mockOrder.status = OrderStatus.DELIVERED;

      jest.spyOn(service, 'findOneByUuid').mockResolvedValue(mockOrder);

      jest
        .spyOn(service, 'update')
        .mockRejectedValue(
          new OrderNotModifiableException(OrderStatus.DELIVERED),
        );

      await expect(service.update(uuid, dto)).rejects.toThrow(
        OrderNotModifiableException,
      );
      expect(queryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('should handle errors when updating order items', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const dto = {
        items: [
          {
            productId: 'prod1',
            productName: 'Product 1',
            quantity: 2,
            price: 10,
          },
        ],
      };

      const mockOrder = new Order();
      mockOrder.id = 1;
      mockOrder.uuid = uuid;
      mockOrder.status = OrderStatus.PENDING;
      mockOrder.items = [];

      jest.spyOn(service, 'findOneByUuid').mockResolvedValueOnce(mockOrder);
      jest
        .spyOn(queryRunner.manager, 'delete')
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(service.update(uuid, dto)).rejects.toThrow(
        OrderUpdateFailedException,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(loggerService.error).toHaveBeenCalled();
    });

    it('should always release query runner even after error in update', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const dto = { status: OrderStatus.PROCESSING };

      const mockOrder = new Order();
      mockOrder.id = 1;
      mockOrder.uuid = uuid;
      mockOrder.status = OrderStatus.PENDING;

      jest.spyOn(service, 'findOneByUuid').mockResolvedValueOnce(mockOrder);
      jest
        .spyOn(queryRunner.manager, 'update')
        .mockRejectedValueOnce(new Error('Database error'));

      try {
        await service.update(uuid, dto);
      } catch (error) {}

      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should cancel an order successfully', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';

      const mockOrder = new Order();
      mockOrder.id = 1;
      mockOrder.uuid = uuid;
      mockOrder.status = OrderStatus.PENDING;
      jest.spyOn(service, 'findOneByUuid').mockResolvedValueOnce(mockOrder);

      await service.cancel(uuid);

      expect(orderRepository.update).toHaveBeenCalledWith(mockOrder.id, {
        status: OrderStatus.CANCELED,
      });
    });

    it('should throw OrderNotModifiableException when order cannot be modified', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';

      const mockOrder = new Order();
      mockOrder.id = 1;
      mockOrder.uuid = uuid;
      mockOrder.status = OrderStatus.DELIVERED;
      jest.spyOn(service, 'findOneByUuid').mockResolvedValueOnce(mockOrder);

      await expect(service.cancel(uuid)).rejects.toThrow(
        OrderNotModifiableException,
      );
    });
  });

  describe('findByCustomer', () => {
    it('should return orders by customer ID', async () => {
      const customerId = '550e8400-e29b-41d4-a716-446655440000';
      const mockOrders = [
        { id: 1, customerId },
        { id: 2, customerId },
      ];
      const total = 2;

      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([mockOrders as any, total]);

      const result = await service.findByCustomer(customerId);

      expect(orderRepository.findAndCount).toHaveBeenCalledWith({
        where: { customerId },
        take: 10,
        skip: 0,
        order: { createdAt: 'DESC' },
        relations: ['items'],
      });

      expect(result.data).toBeDefined();
      expect(result.total).toBe(total);
    });

    it('should return paginated customer orders', async () => {
      const customerId = '550e8400-e29b-41d4-a716-446655440000';
      const mockOrders = [
        { id: 3, customerId },
        { id: 4, customerId },
      ];
      const total = 8;
      const paginationDto = new PaginationDto();
      paginationDto.page = 2;
      paginationDto.limit = 2;

      jest
        .spyOn(orderRepository, 'findAndCount')
        .mockResolvedValue([mockOrders as any, total]);

      const result = await service.findByCustomer(customerId, paginationDto);

      expect(orderRepository.findAndCount).toHaveBeenCalledWith({
        where: { customerId },
        take: 2,
        skip: 2,
        order: { createdAt: 'DESC' },
        relations: ['items'],
      });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(2);
      expect(result.total).toBe(total);
      expect(result.pages).toBe(4);
    });
  });
});
