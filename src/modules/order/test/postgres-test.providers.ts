import { Order, OrderStatus } from '../entities/order.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { createSampleOrder } from './test.providers';

/**
 * Creates a mock Order repository for testing database operations
 *
 * @returns A mock repository with predefined responses for Order entity methods
 */
export const createMockOrderRepository = () => ({
  find: jest.fn().mockResolvedValue([createSampleOrder()]),
  findOne: jest.fn().mockResolvedValue(createSampleOrder()),
  save: jest.fn().mockImplementation((order) => order),
  create: jest.fn().mockImplementation((data) => {
    const order = new Order();
    order.id = 1;
    order.uuid = '123e4567-e89b-12d3-a456-426614174000';
    order.customerId = data.customerId;
    order.status = data.status;
    order.total = data.total;
    order.createdAt = new Date();
    order.updatedAt = new Date();
    return order;
  }),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  delete: jest.fn().mockResolvedValue({ affected: 1 }),
});

/**
 * Creates a mock OrderItem repository for testing database operations
 *
 * @returns A mock repository with predefined responses for OrderItem entity methods
 */
export const createMockOrderItemRepository = () => ({
  find: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockImplementation((items) => items),
  create: jest.fn().mockImplementation((data) => data),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  delete: jest.fn().mockResolvedValue({ affected: 1 }),
});

/**
 * Creates a mock QueryRunner for testing database transactions
 *
 * @returns A mock QueryRunner with transaction control methods and entity manager
 */
export const createMockQueryRunner = () => ({
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: {
    save: jest.fn().mockImplementation((entity) => {
      if (entity instanceof Order) {
        entity.id = 1;
        entity.uuid = '123e4567-e89b-12d3-a456-426614174000';
        entity.createdAt = new Date();
        entity.updatedAt = new Date();
      }
      return entity;
    }),
    create: jest.fn().mockImplementation((entityClass, data) => {
      if (entityClass === Order) {
        const order = new Order();
        order.customerId = data.customerId;
        order.status = data.status;
        order.total = data.total;
        return order;
      }
      return data;
    }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  },
});

/**
 * Creates a mock DataSource for dependency injection in tests
 *
 * @returns A mock TypeORM DataSource that provides the test QueryRunner
 */
export const createMockDataSource = () => {
  const queryRunner = createMockQueryRunner();
  return {
    createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    getRepository: jest.fn(),
  };
};

/**
 * Creates a sample DTO for order creation tests
 *
 * @returns A populated CreateOrderDto with customer ID and order items
 */
export const createSampleCreateOrderDto = (): CreateOrderDto => {
  const dto = new CreateOrderDto();
  dto.customerId = '550e8400-e29b-41d4-a716-446655440000';
  dto.items = [
    {
      productId: '550e8400-e29b-41d4-a716-446655440001',
      productName: 'Product 1',
      price: 1500,
      quantity: 2,
    },
    {
      productId: '550e8400-e29b-41d4-a716-446655440002',
      productName: 'Product 2',
      price: 1500,
      quantity: 1,
    },
  ];
  return dto;
};

/**
 * Creates a sample DTO for order update tests
 *
 * @returns A populated UpdateOrderDto with updated status and modified items
 */
export const createSampleUpdateOrderDto = (): UpdateOrderDto => {
  const dto = new UpdateOrderDto();
  dto.status = OrderStatus.PROCESSING;
  dto.items = [
    {
      productId: '550e8400-e29b-41d4-a716-446655440001',
      productName: 'Product 1',
      price: 1500,
      quantity: 3,
    },
    {
      productId: '550e8400-e29b-41d4-a716-446655440003',
      productName: 'Product 3',
      price: 2000,
      quantity: 1,
    },
  ];
  return dto;
};
