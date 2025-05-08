import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { v4 as uuidv4 } from 'uuid';

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
  order.status = OrderStatus.PENDING; // Alterado de CREATED para PENDING
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
export function cloneSampleOrderWithNewUuid(baseOrder: Order): Order {
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
