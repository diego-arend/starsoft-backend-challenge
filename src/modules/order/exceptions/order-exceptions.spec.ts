import { HttpStatus } from '@nestjs/common';
import {
  OrderEventFailedException,
  OrderCancellationFailedException,
  OrderValidationException,
} from './order-exceptions';

describe('Order Exceptions', () => {
  describe('OrderEventFailedException', () => {
    it('should create an event exception with correct properties', () => {
      const eventType = 'created';
      const orderUuid = 'order-123';
      const details = { service: 'notification', error: 'Service unavailable' };

      const exception = new OrderEventFailedException(
        eventType,
        orderUuid,
        details,
      );

      expect(exception.message).toBe(
        'Failed to process created event for order order-123',
      );
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(exception.getResponse()).toHaveProperty(
        'errorCode',
        'ORDER_EVENT_FAILED',
      );
      expect(exception.details).toEqual(details);
    });

    it('should include event type and order UUID in message', () => {
      const eventType = 'updated';
      const orderUuid = 'order-456';

      const exception = new OrderEventFailedException(eventType, orderUuid, {});

      expect(exception.message).toContain(eventType);
      expect(exception.message).toContain(orderUuid);
    });
  });

  describe('OrderCancellationFailedException', () => {
    it('should create a cancellation exception with correct properties', () => {
      const orderUuid = 'order-789';
      const details = { reason: 'Already shipped', timestamp: '2023-01-01' };

      const exception = new OrderCancellationFailedException(
        orderUuid,
        details,
      );

      expect(exception.message).toBe('Failed to cancel order order-789');
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

      expect(exception.getResponse()).toHaveProperty(
        'errorCode',
        'ORDER_CANCELLATION_FAILED',
      );
      expect(exception.details).toEqual(details);
    });

    it('should include order UUID in message', () => {
      const orderUuid = 'special-order-abc';

      const exception = new OrderCancellationFailedException(orderUuid, {});

      expect(exception.message).toContain(orderUuid);
    });
  });

  describe('OrderValidationException', () => {
    it('should create a validation exception with correct properties', () => {
      const message = 'Order items cannot be empty';
      const details = { field: 'items', constraint: 'notEmpty' };

      const exception = new OrderValidationException(message, details);

      expect(exception.message).toBe('Order items cannot be empty');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);

      expect(exception.getResponse()).toHaveProperty(
        'errorCode',
        'ORDER_VALIDATION_FAILED',
      );
      expect(exception.details).toEqual(details);
    });

    it('should use custom message for validation errors', () => {
      const messages = [
        'Price must be positive',
        'Product ID is required',
        'Quantity must be at least 1',
      ];

      messages.forEach((msg) => {
        const exception = new OrderValidationException(msg, {});
        expect(exception.message).toBe(msg);
      });
    });

    it('should use BAD_REQUEST status for validation errors', () => {
      const message = 'Invalid data';

      const exception = new OrderValidationException(message, {});

      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });
  });
});
