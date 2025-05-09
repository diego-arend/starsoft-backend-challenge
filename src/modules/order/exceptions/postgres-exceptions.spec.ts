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

describe('Order Exceptions', () => {
  describe('OrderNotFoundException', () => {
    it('should format message with UUID for string identifiers', () => {
      const orderId = 'abc123';

      const exception = new OrderNotFoundException(orderId);
      const response = exception.getResponse() as Record<string, any>;

      expect(exception.message).toBe(`Order with UUID ${orderId} not found`);
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(response.errorCode).toBe('ORDER_NOT_FOUND');
    });

    it('should format message with ID for number identifiers', () => {
      const orderId = 123;

      const exception = new OrderNotFoundException(orderId);

      expect(exception.message).toBe(`Order with ID ${orderId} not found`);
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
    });
  });

  describe('OrderNotModifiableException', () => {
    it('should include order status in the message', () => {
      const status = OrderStatus.DELIVERED;

      const exception = new OrderNotModifiableException(status);

      expect(exception.message).toBe(
        `Order with status ${status} cannot be modified`,
      );
      expect(exception.name).toBe('OrderNotModifiableException');
    });
  });

  describe('OrderCreationFailedException', () => {
    it('should store error details and set correct error code', () => {
      const details = { constraint: 'fk_customer_id' };

      const exception = new OrderCreationFailedException(details);
      const response = exception.getResponse() as Record<string, any>;

      expect(exception.message).toBe('Failed to create order');
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.details).toEqual(details);
      expect(response.errorCode).toBe('ORDER_CREATION_FAILED');
    });
  });

  describe('OrderUpdateFailedException', () => {
    it('should store error details and set correct error code', () => {
      const details = { field: 'price' };

      const exception = new OrderUpdateFailedException(details);
      const response = exception.getResponse() as Record<string, any>;

      expect(exception.message).toBe('Failed to update order');
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.details).toEqual(details);
      expect(response.errorCode).toBe('ORDER_UPDATE_FAILED');
    });
  });

  describe('InvalidOrderItemsException', () => {
    it('should provide a descriptive message and correct error code', () => {
      const details = { errors: ['Price must be positive'] };

      const exception = new InvalidOrderItemsException(details);
      const response = exception.getResponse() as Record<string, any>;

      expect(exception.message).toBe('Invalid order items provided');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.details).toEqual(details);
      expect(response.errorCode).toBe('INVALID_ORDER_ITEMS');
    });
  });

  describe('DatabaseTransactionFailedException', () => {
    it('should include operation name in the message and correct error code', () => {
      const operation = 'insert';
      const details = { error: 'constraint' };

      const exception = new DatabaseTransactionFailedException(
        operation,
        details,
      );
      const response = exception.getResponse() as Record<string, any>;

      expect(exception.message).toBe(
        `Database transaction failed during ${operation}`,
      );
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.errorCode).toBe('TRANSACTION_FAILED');
    });
  });

  describe('OrderEventFailedException', () => {
    it('should include event type and order UUID in the message', () => {
      const eventType = 'created';
      const orderUuid = 'order-123';
      const details = { error: 'Service unavailable' };

      const exception = new OrderEventFailedException(
        eventType,
        orderUuid,
        details,
      );
      const response = exception.getResponse() as Record<string, any>;

      expect(exception.message).toBe(
        `Failed to process ${eventType} event for order ${orderUuid}`,
      );
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.details).toEqual(details);
      expect(response.errorCode).toBe('ORDER_EVENT_FAILED');
    });
  });

  describe('OrderCancellationFailedException', () => {
    it('should include order UUID in the message and correct error code', () => {
      const orderUuid = 'order-abc';
      const details = { reason: 'Already delivered' };

      const exception = new OrderCancellationFailedException(
        orderUuid,
        details,
      );
      const response = exception.getResponse() as Record<string, any>;

      expect(exception.message).toBe(`Failed to cancel order ${orderUuid}`);
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.details).toEqual(details);
      expect(response.errorCode).toBe('ORDER_CANCELLATION_FAILED');
    });
  });

  describe('OrderValidationException', () => {
    it('should use the provided custom message and set correct error code', () => {
      const message = 'Order must have at least one item';
      const details = { field: 'items' };

      const exception = new OrderValidationException(message, details);
      const response = exception.getResponse() as Record<string, any>;

      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.details).toEqual(details);
      expect(response.errorCode).toBe('ORDER_VALIDATION_FAILED');
    });
  });
});
