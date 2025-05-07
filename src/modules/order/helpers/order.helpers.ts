import { OrderItemDto } from '../dto/order-item.dto';
import { OrderItem } from '../entities/order-item.entity';

/**
 * Calculates the total order amount based on items
 *
 * @param items Order items
 * @returns Total order amount in cents
 */
export function calculateOrderTotal(items: OrderItemDto[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/**
 * Creates OrderItem entities from DTOs
 *
 * @param items Item DTOs
 * @param orderId Parent order ID
 * @returns Array of OrderItem entities
 */
export function createOrderItems(
  items: OrderItemDto[],
  orderId: number,
): OrderItem[] {
  return items.map((item) => {
    const orderItem = new OrderItem();
    orderItem.orderId = orderId;
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
