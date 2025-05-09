import { HttpStatus } from '@nestjs/common';
import { OrderStatus } from '../entities/order.entity';
import {
  OrderEventFailedException,
  OrderCancellationFailedException,
  OrderValidationException,
  OrderNotModifiableException,
} from './order-exceptions';

describe('Order Exceptions', () => {
  describe('OrderEventFailedException', () => {
    it('should create an exception with correct message and status', () => {
      const eventType = 'created';
      const orderUuid = 'order-123';
      const details = { service: 'notification', error: 'Service unavailable' };

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
      expect(response.errorCode).toBe('ORDER_EVENT_FAILED');
      expect(exception.details).toEqual(details);
    });

    it('should work with different event types', () => {
      ['created', 'updated', 'canceled', 'shipped'].forEach((eventType) => {
        const exception = new OrderEventFailedException(
          eventType,
          'order-123',
          {},
        );
        expect(exception.message).toContain(eventType);
      });
    });
  });

  describe('OrderCancellationFailedException', () => {
    it('should create an exception with correct message and status', () => {
      const orderUuid = 'order-789';
      const details = { reason: 'Already shipped', timestamp: '2023-01-01' };

      const exception = new OrderCancellationFailedException(
        orderUuid,
        details,
      );
      const response = exception.getResponse() as Record<string, any>;

      expect(exception.message).toBe(`Failed to cancel order ${orderUuid}`);
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.errorCode).toBe('ORDER_CANCELLATION_FAILED');
      expect(exception.details).toEqual(details);
    });

    it('should work with different order UUIDs', () => {
      ['order-123', 'special-order-abc', 'uuid-with-dashes-123-456'].forEach(
        (uuid) => {
          const exception = new OrderCancellationFailedException(uuid, {});
          expect(exception.message).toBe(`Failed to cancel order ${uuid}`);
        },
      );
    });
  });

  describe('OrderValidationException', () => {
    it('should create an exception with correct message and status', () => {
      const message = 'Order items cannot be empty';
      const details = { field: 'items', constraint: 'notEmpty' };

      const exception = new OrderValidationException(message, details);
      const response = exception.getResponse() as Record<string, any>;

      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(response.errorCode).toBe('ORDER_VALIDATION_FAILED');
      expect(exception.details).toEqual(details);
    });

    it('should support various validation error messages', () => {
      const messages = [
        'Price must be positive',
        'Product ID is required',
        'Quantity must be at least 1',
      ];

      messages.forEach((msg) => {
        const exception = new OrderValidationException(msg, {});
        expect(exception.message).toBe(msg);
        expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      });
    });
  });

  describe('OrderNotModifiableException', () => {
    it('should create an exception with status message when no allowed statuses are provided', () => {
      const uuid = 'order-123';
      const currentStatus = OrderStatus.DELIVERED;

      const exception = new OrderNotModifiableException(uuid, currentStatus);
      const response = exception.getResponse() as Record<string, any>;

      expect(exception.message).toBe(
        `Order ${uuid} cannot be modified. Status ${currentStatus} does not allow modifications`,
      );
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(response.errorCode).toBe('ORDER_NOT_MODIFIABLE');
      expect(exception.details).toEqual({
        uuid,
        currentStatus,
        allowedStatuses: undefined,
      });
    });

    it('should include allowed statuses in the message when provided', () => {
      const uuid = 'order-abc';
      const currentStatus = OrderStatus.SHIPPED;
      const allowedStatuses = [OrderStatus.PENDING, OrderStatus.PROCESSING];

      const exception = new OrderNotModifiableException(
        uuid,
        currentStatus,
        allowedStatuses,
      );

      expect(exception.message).toContain(`Order ${uuid} cannot be modified`);
      expect(exception.message).toContain(
        `Status must be one of: ${allowedStatuses.join(', ')}`,
      );
      expect(exception.details).toEqual({
        uuid,
        currentStatus,
        allowedStatuses,
      });
    });
  });
});
