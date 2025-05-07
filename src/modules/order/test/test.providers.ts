import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';

/**
 * Creates a mock Logger service for testing purposes
 * 
 * @returns {object} A mock implementation of LoggerService with Jest spy functions
 */
export const createMockLoggerService = () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  recordEvent: jest.fn(),
  recordError: jest.fn(),
});

/**
 * Creates a fully populated Order entity with associated OrderItems for testing
 * 
 * The returned order has:
 * - Complete order metadata (ID, UUID, dates, status)
 * - Customer information
 * - Two order items with different products
 * - Correctly calculated subtotals and total
 * 
 * @returns {Order} A complete Order entity with items
 */
export const createSampleOrder = (): Order => {
  const order = new Order();
  order.id = 1;
  order.uuid = '123e4567-e89b-12d3-a456-426614174000';
  order.customerId = '550e8400-e29b-41d4-a716-446655440000';
  order.status = OrderStatus.PENDING;
  order.total = 4500;
  order.createdAt = new Date('2023-05-07T12:00:00.000Z');
  order.updatedAt = new Date('2023-05-07T12:00:00.000Z');

  const item1 = new OrderItem();
  item1.id = 1;
  item1.uuid = '123e4567-e89b-12d3-a456-426614174001';
  item1.productId = '550e8400-e29b-41d4-a716-446655440001';
  item1.productName = 'Product 1';
  item1.price = 1500;
  item1.quantity = 2;
  item1.subtotal = 3000;

  const item2 = new OrderItem();
  item2.id = 2;
  item2.uuid = '123e4567-e89b-12d3-a456-426614174002';
  item2.productId = '550e8400-e29b-41d4-a716-446655440002';
  item2.productName = 'Product 2';
  item2.price = 1500;
  item2.quantity = 1;
  item2.subtotal = 1500;

  order.items = [item1, item2];

  return order;
};
