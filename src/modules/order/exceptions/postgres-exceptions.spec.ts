import { HttpStatus } from '@nestjs/common';
import { OrderStatus } from '../entities/order.entity';
import {
  OrderNotFoundException,
  OrderNotModifiableException,
  OrderCreationFailedException,
  OrderUpdateFailedException,
  InvalidOrderItemsException,
  DatabaseTransactionFailedException,
  OrderEventFailedException,
  OrderCancellationFailedException,
  OrderValidationException,
} from './postgres-exceptions';

describe('Postgres Exceptions', () => {
  describe('OrderNotFoundException', () => {
    it('should create exception with UUID identifier', () => {
      const uuid = 'abc123';
      const exception = new OrderNotFoundException(uuid);

      expect(exception.message).toBe('Order with UUID abc123 not found');
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(exception.getResponse()).toHaveProperty(
        'errorCode',
        'ORDER_NOT_FOUND',
      );
    });

    it('should create exception with numeric ID identifier', () => {
      const id = 123;
      const exception = new OrderNotFoundException(id);

      expect(exception.message).toBe('Order with ID 123 not found');
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(exception.getResponse()).toHaveProperty(
        'errorCode',
        'ORDER_NOT_FOUND',
      );
    });
  });

  describe('OrderNotModifiableException', () => {
    it('should create exception with order status', () => {
      const status = OrderStatus.DELIVERED;
      const exception = new OrderNotModifiableException(status);

      expect(exception.message).toBe(
        `Order with status ${status} cannot be modified`,
      );
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.getResponse()).toHaveProperty(
        'errorCode',
        'ORDER_NOT_MODIFIABLE',
      );
    });

    it('should create exception with CANCELED status', () => {
      const status = OrderStatus.CANCELED;
      const exception = new OrderNotModifiableException(status);

      expect(exception.message).toContain(OrderStatus.CANCELED);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('OrderCreationFailedException', () => {
    it('should create exception with details', () => {
      const details = { constraint: 'fk_customer_id', table: 'orders' };
      const exception = new OrderCreationFailedException(details);

      expect(exception.message).toBe('Failed to create order');
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.getResponse()).toHaveProperty(
        'errorCode',
        'ORDER_CREATION_FAILED',
      );
      expect(exception.details).toEqual(details);
    });
  });

  describe('OrderUpdateFailedException', () => {
    it('should create exception with details', () => {
      const details = { constraint: 'check_price_positive', column: 'price' };
      const exception = new OrderUpdateFailedException(details);

      expect(exception.message).toBe('Failed to update order');
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.getResponse()).toHaveProperty(
        'errorCode',
        'ORDER_UPDATE_FAILED',
      );
      expect(exception.details).toEqual(details);
    });
  });

  describe('InvalidOrderItemsException', () => {
    it('should create exception with details', () => {
      const details = {
        errors: ['Price must be positive', 'Quantity must be > 0'],
      };
      const exception = new InvalidOrderItemsException(details);

      expect(exception.message).toBe('Invalid order items provided');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.getResponse()).toHaveProperty(
        'errorCode',
        'INVALID_ORDER_ITEMS',
      );
      expect(exception.details).toEqual(details);
    });
  });

  describe('DatabaseTransactionFailedException', () => {
    it('should create exception with operation and details', () => {
      const operation = 'order creation';
      const details = {
        error: 'SERIALIZATION_FAILURE',
        hint: 'Retry transaction',
      };
      const exception = new DatabaseTransactionFailedException(
        operation,
        details,
      );

      expect(exception.message).toBe(
        'Database transaction failed during order creation',
      );
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.getResponse()).toHaveProperty(
        'errorCode',
        'TRANSACTION_FAILED',
      );
      expect(exception.details).toEqual(details);
    });

    it('should include operation name in message', () => {
      const operations = ['insert', 'update', 'delete'];

      operations.forEach((op) => {
        const exception = new DatabaseTransactionFailedException(op, {});
        expect(exception.message).toContain(op);
      });
    });
  });

  describe('OrderEventFailedException', () => {
    it('should create exception with event type, order UUID and details', () => {
      const eventType = 'created';
      const orderUuid = 'order-xyz';
      const details = { service: 'notification', error: 'Service unavailable' };
      const exception = new OrderEventFailedException(
        eventType,
        orderUuid,
        details,
      );

      expect(exception.message).toBe(
        'Failed to process created event for order order-xyz',
      );
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.getResponse()).toHaveProperty(
        'errorCode',
        'ORDER_EVENT_FAILED',
      );
      expect(exception.details).toEqual(details);
    });
  });

  describe('OrderCancellationFailedException', () => {
    it('should create exception with order UUID and details', () => {
      const orderUuid = 'order-abc';
      const details = { reason: 'Already delivered' };
      const exception = new OrderCancellationFailedException(
        orderUuid,
        details,
      );

      expect(exception.message).toBe('Failed to cancel order order-abc');
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.getResponse()).toHaveProperty(
        'errorCode',
        'ORDER_CANCELLATION_FAILED',
      );
      expect(exception.details).toEqual(details);
    });
  });

  describe('OrderValidationException', () => {
    it('should create exception with custom message and details', () => {
      const message = 'Order must have at least one item';
      const details = { field: 'items', constraint: 'notEmpty' };
      const exception = new OrderValidationException(message, details);

      expect(exception.message).toBe('Order must have at least one item');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.getResponse()).toHaveProperty(
        'errorCode',
        'ORDER_VALIDATION_FAILED',
      );
      expect(exception.details).toEqual(details);
    });

    it('should use custom message for validation errors', () => {
      const messages = [
        'Price cannot be negative',
        'Quantity must be at least 1',
        'Product ID is required',
      ];

      messages.forEach((msg) => {
        const exception = new OrderValidationException(msg, {});
        expect(exception.message).toBe(msg);
      });
    });
  });
});
