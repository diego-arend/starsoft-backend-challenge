import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { v4 as uuidv4 } from 'uuid';
import {
  OrderResponseDto,
  OrderItemResponseDto,
} from '../dto/order-response.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';

/**
 * Creates a sample order for testing
 *
 * @returns A complete Order object with all required properties
 */
export function createSampleOrder(): Order {
  const order = new Order();

  order.uuid = uuidv4();
  order.id = 1;
  order.customerId = 'customer-123';
  order.status = OrderStatus.PENDING;
  order.total = 2000;
  order.createdAt = new Date();
  order.updatedAt = new Date();

  const item = new OrderItem();
  item.uuid = uuidv4();
  item.id = 1;
  item.productId = 'product-1';
  item.productName = 'Sample Product';
  item.quantity = 2;
  item.price = 1000;
  item.subtotal = 2000;

  order.items = [item];

  return order;
}

/**
 * Creates a clone of a sample order with different UUID
 */
export function cloneOrderWithNewUuid(baseOrder: Order): Order {
  const clonedOrder = new Order();

  clonedOrder.uuid = uuidv4();
  clonedOrder.id = baseOrder.id;
  clonedOrder.customerId = baseOrder.customerId;
  clonedOrder.status = baseOrder.status;
  clonedOrder.total = baseOrder.total;
  clonedOrder.createdAt = new Date(baseOrder.createdAt);
  clonedOrder.updatedAt = new Date(baseOrder.updatedAt);

  clonedOrder.items = baseOrder.items.map((item) => {
    const newItem = new OrderItem();
    newItem.uuid = uuidv4();
    newItem.id = item.id;
    newItem.productId = item.productId;
    newItem.productName = item.productName;
    newItem.quantity = item.quantity;
    newItem.price = item.price;
    newItem.subtotal = item.subtotal;
    return newItem;
  });

  return clonedOrder;
}

/**
 * Creates a sample order item response DTO for testing
 */
export function createSampleOrderItemDto(): OrderItemResponseDto {
  return {
    uuid: '123e4567-e89b-12d3-a456-426614174001',
    productId: 'product-1',
    productName: 'Sample Product',
    price: 1000,
    quantity: 2,
    subtotal: 2000,
    // Removido orderUuid que não existe no tipo OrderItemResponseDto
  };
}

/**
 * Creates a sample order response DTO for testing
 */
export function createSampleOrderDto(): OrderResponseDto {
  return {
    uuid: '123e4567-e89b-12d3-a456-426614174000',
    customerId: 'customer-123',
    status: OrderStatus.PENDING,
    total: 2000,
    items: [createSampleOrderItemDto()],
    createdAt: new Date('2023-05-07T10:20:30.123Z'), // Corrigido para Date em vez de string
    updatedAt: new Date('2023-05-07T10:20:30.123Z'), // Corrigido para Date em vez de string
  };
}

/**
 * Creates a clone of a sample order DTO with a new UUID
 */
export function cloneSampleOrderWithNewUuid(
  order: OrderResponseDto,
): OrderResponseDto {
  const newOrder = { ...order };
  newOrder.uuid = '123e4567-e89b-12d3-a456-426614174999';
  newOrder.items = order.items.map((item) => ({
    ...item,
    uuid: '123e4567-e89b-12d3-a456-426614175000',
    // Removido orderUuid que não existe no tipo OrderItemResponseDto
  }));
  return newOrder;
}

/**
 * Creates a sample paginated result for orders
 */
export function createPaginatedOrdersResult(
  orders: OrderResponseDto[] = [createSampleOrderDto()],
  page = 1,
  limit = 10,
): PaginatedResult<OrderResponseDto> {
  return {
    data: orders,
    total: orders.length,
    page,
    limit,
    pages: Math.ceil(orders.length / limit),
  };
}
