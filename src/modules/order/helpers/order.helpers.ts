import { OrderItemDto } from '../dto/order-item.dto';
import { OrderItem } from '../entities/order-item.entity';
import { Order, OrderStatus } from '../entities/order.entity';

/**
 * Calculates the total order amount based on items
 *
 * @param items Order items
 * @returns Total order amount in cents
 */
export function calculateOrderTotal(items: OrderItemDto[]): number {
  if (!items || !Array.isArray(items)) {
    return 0;
  }
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/**
 * Creates OrderItem entities from DTOs
 *
 * @param items Item DTOs
 * @param orderUuid Parent order UUID
 * @returns Array of OrderItem entities
 */
export function createOrderItems(
  items: OrderItemDto[],
  orderUuid: string,
): OrderItem[] {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return [];
  }

  return items.map((item) => {
    const orderItem = new OrderItem();
    orderItem.orderUuid = orderUuid;
    orderItem.productId = item.productId;
    orderItem.productName = item.productName;
    orderItem.price = item.price;
    orderItem.quantity = item.quantity;
    orderItem.subtotal = item.price * item.quantity;
    return orderItem;
  });
}

/**
 * Validates order items
 *
 * @param items Items to validate
 * @returns Array of validation errors or empty array if valid
 */
export function validateOrderItems(items: OrderItemDto[]): string[] {
  const errors: string[] = [];

  if (!items || items.length === 0) {
    errors.push('Order must have at least one item');
    return errors;
  }

  items.forEach((item, index) => {
    if (!item.productId) {
      errors.push(`Item #${index + 1} must have a product ID`);
    }

    if (!item.productName) {
      errors.push(`Item #${index + 1} must have a product name`);
    }

    if (item.price <= 0) {
      errors.push(`Item #${index + 1} must have a positive price`);
    }

    if (item.quantity <= 0 || !Number.isInteger(item.quantity)) {
      errors.push(`Item #${index + 1} must have a positive integer quantity`);
    }
  });

  return errors;
}

/**
 * Checks if an order can be modified based on its status
 *
 * @param order Order to check
 * @returns True if the order can be modified, false otherwise
 */
export function canOrderBeModified(order: Order): boolean {
  if (!order || !order.status) {
    return false;
  }
  return ![OrderStatus.DELIVERED, OrderStatus.CANCELED].includes(order.status);
}

/**
 * Formats an error message for logging purposes
 *
 * @param operation The operation that failed
 * @param error The error object
 * @returns Formatted error message
 */
export function formatErrorMessage(operation: string, error: any): string {
  const errorMessage = error && error.message ? error.message : 'Unknown error';
  return `Failed to ${operation} order in PostgreSQL: ${errorMessage}`;
}
