import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderResponseDto } from '../dto/order-response.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import {
  transformOrderToDto,
  transformPaginatedOrdersToDto,
} from './transform.helpers';
import { createSampleOrder } from '../test/test.providers';

describe('Transform Helpers', () => {
  describe('transformOrderToDto', () => {
    it('should transform an Order into OrderResponseDto correctly', () => {
      const order = createSampleOrder();
      order.id = 123;
      order.uuid = 'test-uuid-1';
      order.customerId = 'customer-123';
      order.status = OrderStatus.PENDING;
      order.total = 1000;

      const item1 = new OrderItem();
      item1.id = 1;
      item1.uuid = 'item-uuid-1';
      item1.productId = 'product-1';
      item1.productName = 'Product One';
      item1.price = 500;
      item1.quantity = 1;
      item1.subtotal = 500;
      item1.order = order;

      const item2 = new OrderItem();
      item2.id = 2;
      item2.uuid = 'item-uuid-2';
      item2.productId = 'product-2';
      item2.productName = 'Product Two';
      item2.price = 250;
      item2.quantity = 2;
      item2.subtotal = 500;
      item2.order = order;

      order.items = [item1, item2];

      const result = transformOrderToDto(order);

      expect(result).toBeInstanceOf(OrderResponseDto);
      expect(result.uuid).toBe('test-uuid-1');
      expect(result.customerId).toBe('customer-123');
      expect(result.status).toBe(OrderStatus.PENDING);
      expect(result.total).toBe(1000);

      expect(result).not.toHaveProperty('id');

      expect(result.items).toHaveLength(2);

      expect(result.items[0]).not.toHaveProperty('order');
      expect(result.items[0]).not.toHaveProperty('id');

      expect(result.items[0].uuid).toBe('item-uuid-1');
      expect(result.items[0].productId).toBe('product-1');
      expect(result.items[0].productName).toBe('Product One');
      expect(result.items[0].price).toBe(500);
      expect(result.items[0].quantity).toBe(1);
      expect(result.items[0].subtotal).toBe(500);

      expect(result.items[1].uuid).toBe('item-uuid-2');
      expect(result.items[1].productId).toBe('product-2');
      expect(result.items[1].productName).toBe('Product Two');
    });

    it('should handle undefined items', () => {
      const order = createSampleOrder();
      order.items = undefined;

      const result = transformOrderToDto(order);

      expect(result).toBeInstanceOf(OrderResponseDto);
      expect(result.items).toBeUndefined();
    });
  });

  describe('transformPaginatedOrdersToDto', () => {
    it('should transform a paginated list of Orders into PaginatedResult<OrderResponseDto>', () => {
      const order1 = createSampleOrder();
      order1.uuid = 'order-1';
      order1.id = 1;

      const order2 = createSampleOrder();
      order2.uuid = 'order-2';
      order2.id = 2;

      const paginatedResult: PaginatedResult<Order> = {
        data: [order1, order2],
        total: 2,
        page: 1,
        limit: 10,
        pages: 1,
      };

      const result = transformPaginatedOrdersToDto(paginatedResult);

      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.pages).toBe(1);

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toBeInstanceOf(OrderResponseDto);
      expect(result.data[1]).toBeInstanceOf(OrderResponseDto);

      expect(result.data[0].uuid).toBe('order-1');
      expect(result.data[1].uuid).toBe('order-2');

      expect(result.data[0]).not.toHaveProperty('id');
      expect(result.data[1]).not.toHaveProperty('id');
    });

    it('should handle empty data list', () => {
      const emptyPaginatedResult: PaginatedResult<Order> = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        pages: 0,
      };

      const result = transformPaginatedOrdersToDto(emptyPaginatedResult);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.pages).toBe(0);
    });
  });
});
