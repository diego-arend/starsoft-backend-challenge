import { EventEmitter2 } from '@nestjs/event-emitter';
import { emitOrderEvent } from './event.helpers';
import { OrderEventType } from '../types/order-events.types';
import { createSampleOrder } from '../test/test.providers';
import { Order } from '../entities/order.entity';
import { LoggerService } from '../../../logger/logger.service';
import { createMockLoggerService } from '../test/test.providers';

describe('Event Helpers', () => {
  describe('emitOrderEvent', () => {
    let mockEventEmitter: EventEmitter2;
    let mockLogger: LoggerService;
    let sampleOrder: Order;

    beforeEach(() => {
      mockEventEmitter = new EventEmitter2();

      mockLogger = createMockLoggerService() as unknown as LoggerService;

      sampleOrder = createSampleOrder();
    });

    function testEvent(eventType: OrderEventType, order: Order) {
      return new Promise<void>((resolve) => {
        mockEventEmitter.once(eventType, (eventData) => {
          expect(eventData).toBeDefined();
          expect(eventData.type).toBe(eventType);
          expect(eventData.orderUuid).toBe(order.uuid);
          expect(eventData.payload).toEqual(order);
          resolve();
        });

        emitOrderEvent(mockEventEmitter, eventType, order, mockLogger);
      });
    }

    it('should emit created event with correct data', async () => {
      await testEvent(OrderEventType.CREATED, sampleOrder);
    });

    it('should emit updated event with correct data', async () => {
      await testEvent(OrderEventType.UPDATED, sampleOrder);
    });

    it('should emit canceled event with correct data', async () => {
      await testEvent(OrderEventType.CANCELED, sampleOrder);
    });

    it('should handle modified order properties', async () => {
      const eventType = OrderEventType.UPDATED;
      const modifiedOrder = createSampleOrder();
      modifiedOrder.total = 5000;

      return new Promise<void>((resolve) => {
        mockEventEmitter.once(eventType, (eventData) => {
          expect(eventData.payload.total).toBe(5000);
          expect(eventData.payload).toEqual(modifiedOrder);
          resolve();
        });

        emitOrderEvent(mockEventEmitter, eventType, modifiedOrder, mockLogger);
      });
    });

    it('should gracefully handle emission failures', async () => {
      let capturedError: string | null = null;
      const errorLogger = {
        ...createMockLoggerService(),
        error: (message: string) => {
          capturedError = message;
        },
        log: jest.fn(),
      } as unknown as LoggerService;

      const brokenEmitter = {
        emit: () => {
          throw new Error('Emission failed');
        },
      } as unknown as EventEmitter2;

      emitOrderEvent(
        brokenEmitter,
        OrderEventType.CREATED,
        sampleOrder,
        errorLogger,
      );

      expect(capturedError).toContain(
        `Failed to emit ${OrderEventType.CREATED} event for order ${sampleOrder.uuid}`,
      );
      expect(capturedError).toContain('Emission failed');
    });
  });
});
