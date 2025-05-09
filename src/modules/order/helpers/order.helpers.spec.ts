import {
  calculateOrderTotal,
  createOrderItems,
  validateOrderItems,
  canOrderBeModified,
  formatErrorMessage,
} from './order.helpers';
import { OrderItemDto } from '../dto/order-item.dto';
import { OrderStatus } from '../entities/order.entity';
import { createSampleOrder } from '../test/test.providers';

const sampleItems: OrderItemDto[] = [
  {
    productId: 'prod-1',
    productName: 'Product 1',
    price: 100,
    quantity: 2,
  },
  {
    productId: 'prod-2',
    productName: 'Product 2',
    price: 50,
    quantity: 3,
  },
];

describe('Order Helpers', () => {
  describe('calculateOrderTotal', () => {
    it('should calculate total correctly', () => {
      expect(calculateOrderTotal(sampleItems)).toBe(350);

      expect(calculateOrderTotal([])).toBe(0);
      expect(calculateOrderTotal(null)).toBe(0);
      expect(calculateOrderTotal(undefined)).toBe(0);
    });
  });

  describe('createOrderItems', () => {
    it('should create OrderItem entities with correct data', () => {
      const orderUuid = 'test-uuid';
      const items = createOrderItems(sampleItems, orderUuid);

      expect(items).toHaveLength(2);
      expect(items[0].orderUuid).toBe(orderUuid);
      expect(items[0].productId).toBe('prod-1');
      expect(items[0].subtotal).toBe(200);
      expect(items[1].subtotal).toBe(150);
    });

    it('should handle empty or invalid inputs', () => {
      const orderUuid = 'test-uuid';

      expect(createOrderItems([], orderUuid)).toEqual([]);
      expect(createOrderItems(null, orderUuid)).toEqual([]);
      expect(createOrderItems(undefined, orderUuid)).toEqual([]);
    });
  });

  describe('validateOrderItems', () => {
    it('should validate items correctly', () => {
      expect(validateOrderItems(sampleItems)).toEqual([]);

      expect(validateOrderItems([])).toContain(
        'Order must have at least one item',
      );

      const itemWithInvalidPrice = [{ ...sampleItems[0], price: 0 }];
      expect(validateOrderItems(itemWithInvalidPrice)).toContain(
        'Item #1 must have a positive price',
      );

      const itemWithInvalidQuantity = [{ ...sampleItems[0], quantity: 0 }];
      expect(validateOrderItems(itemWithInvalidQuantity)).toContain(
        'Item #1 must have a positive integer quantity',
      );
    });

    it('should collect multiple errors', () => {
      const invalidItem = {
        productId: '',
        productName: '',
        price: -5,
        quantity: -1,
      };

      const errors = validateOrderItems([invalidItem]);

      expect(errors.length).toBeGreaterThanOrEqual(4);
      expect(errors).toContain('Item #1 must have a product ID');
      expect(errors).toContain('Item #1 must have a product name');
    });
  });

  describe('canOrderBeModified', () => {
    it('should determine if order can be modified based on status', () => {
      const order = createSampleOrder();

      order.status = OrderStatus.PENDING;
      expect(canOrderBeModified(order)).toBe(true);

      order.status = OrderStatus.PROCESSING;
      expect(canOrderBeModified(order)).toBe(true);

      order.status = OrderStatus.DELIVERED;
      expect(canOrderBeModified(order)).toBe(false);

      order.status = OrderStatus.CANCELED;
      expect(canOrderBeModified(order)).toBe(false);

      expect(canOrderBeModified(null)).toBe(false);
      expect(canOrderBeModified(undefined)).toBe(false);
    });
  });

  describe('formatErrorMessage', () => {
    it('should format error messages correctly', () => {
      const error = new Error('Test error');

      expect(formatErrorMessage('create', error)).toBe(
        'Failed to create order in PostgreSQL: Test error',
      );

      expect(formatErrorMessage('update', error)).toBe(
        'Failed to update order in PostgreSQL: Test error',
      );

      expect(formatErrorMessage('delete', null)).toContain(
        'Failed to delete order',
      );
      expect(formatErrorMessage('index', { code: 'ERROR' })).toContain(
        'Failed to index order',
      );
    });
  });
});
