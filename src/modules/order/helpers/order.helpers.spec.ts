import {
  calculateOrderTotal,
  createOrderItems,
  validateOrderItems,
  canOrderBeModified,
  formatErrorMessage,
} from './order.helpers';
import { OrderItemDto } from '../dto/order-item.dto';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';

describe('Order Helpers', () => {
  describe('calculateOrderTotal', () => {
    it('should calculate total correctly for multiple items', () => {
      const items: OrderItemDto[] = [
        {
          productId: 'prod-1',
          productName: 'Product 1',
          price: 1000,
          quantity: 2,
        },
        {
          productId: 'prod-2',
          productName: 'Product 2',
          price: 500,
          quantity: 3,
        },
      ];

      const total = calculateOrderTotal(items);

      expect(total).toBe(3500);
    });

    it('should return 0 for empty items array', () => {
      const items: OrderItemDto[] = [];

      const total = calculateOrderTotal(items);

      expect(total).toBe(0);
    });

    describe('createOrderItems', () => {
      it('should create proper OrderItem entities from DTOs', () => {
        const orderId = 123;
        const itemDtos: OrderItemDto[] = [
          {
            productId: 'prod-1',
            productName: 'Product 1',
            price: 1000,
            quantity: 2,
          },
          {
            productId: 'prod-2',
            productName: 'Product 2',
            price: 500,
            quantity: 3,
          },
        ];

        const orderItems = createOrderItems(itemDtos, orderId);

        expect(orderItems).toHaveLength(2);
        expect(orderItems[0]).toBeInstanceOf(OrderItem);
        expect(orderItems[0].orderId).toBe(orderId);
        expect(orderItems[0].productId).toBe('prod-1');
        expect(orderItems[0].productName).toBe('Product 1');
        expect(orderItems[0].price).toBe(1000);
        expect(orderItems[0].quantity).toBe(2);
        expect(orderItems[0].subtotal).toBe(2000);

        expect(orderItems[1].orderId).toBe(orderId);
        expect(orderItems[1].subtotal).toBe(1500);
      });

      it('should return empty array when input is empty', () => {
        const orderId = 123;
        const itemDtos: OrderItemDto[] = [];

        const orderItems = createOrderItems(itemDtos, orderId);

        expect(orderItems).toEqual([]);
      });
    });

    describe('validateOrderItems', () => {
      it('should return empty array for valid items', () => {
        const items: OrderItemDto[] = [
          {
            productId: 'prod-1',
            productName: 'Product 1',
            price: 1000,
            quantity: 2,
          },
        ];

        const errors = validateOrderItems(items);

        expect(errors).toEqual([]);
      });

      it('should detect empty items array', () => {
        const errors = validateOrderItems([]);

        expect(errors).toContain('Order must have at least one item');
        expect(errors).toHaveLength(1);
      });

      it('should detect missing product ID', () => {
        const items: OrderItemDto[] = [
          { productId: '', productName: 'Product 1', price: 1000, quantity: 2 },
        ];

        const errors = validateOrderItems(items);

        expect(errors).toContain('Item #1 must have a product ID');
      });

      it('should detect missing product name', () => {
        const items: OrderItemDto[] = [
          { productId: 'prod-1', productName: '', price: 1000, quantity: 2 },
        ];

        const errors = validateOrderItems(items);

        expect(errors).toContain('Item #1 must have a product name');
      });

      it('should detect invalid price', () => {
        const items: OrderItemDto[] = [
          {
            productId: 'prod-1',
            productName: 'Product 1',
            price: 0,
            quantity: 2,
          },
          {
            productId: 'prod-2',
            productName: 'Product 2',
            price: -5,
            quantity: 1,
          },
        ];

        const errors = validateOrderItems(items);

        expect(errors).toContain('Item #1 must have a positive price');
        expect(errors).toContain('Item #2 must have a positive price');
        expect(errors).toHaveLength(2);
      });
    });

    it('should detect multiple errors in one item', () => {
      const items: OrderItemDto[] = [
        { productId: '', productName: '', price: -10, quantity: 0 },
      ];

      const errors = validateOrderItems(items);

      expect(errors).toHaveLength(4);
    });

    it('should handle null or undefined items', () => {
      const errors = validateOrderItems(null);

      expect(errors).toContain('Order must have at least one item');
    });
  });

  describe('canOrderBeModified', () => {
    it('should return true for orders with PENDING status', () => {
      const order = new Order();
      order.status = OrderStatus.PENDING;

      expect(canOrderBeModified(order)).toBe(true);
    });

    it('should return true for orders with PROCESSING status', () => {
      const order = new Order();
      order.status = OrderStatus.PROCESSING;

      expect(canOrderBeModified(order)).toBe(true);
    });

    it('should return false for orders with DELIVERED status', () => {
      const order = new Order();
      order.status = OrderStatus.DELIVERED;

      expect(canOrderBeModified(order)).toBe(false);
    });

    it('should return false for orders with CANCELED status', () => {
      const order = new Order();
      order.status = OrderStatus.CANCELED;

      expect(canOrderBeModified(order)).toBe(false);
    });
  });

  describe('formatErrorMessage', () => {
    it('should format error message with operation and message', () => {
      const operation = 'create';
      const error = new Error('Database connection failed');

      const message = formatErrorMessage(operation, error);

      expect(message).toBe(
        'Failed to create order in PostgreSQL: Database connection failed',
      );
    });

    it('should handle errors without message property', () => {
      const operation = 'update';
      const error = {};

      const message = formatErrorMessage(operation, error);

      expect(message).toBe('Failed to update order in PostgreSQL: undefined');
    });
  });
});
