import { EventEmitter2 } from '@nestjs/event-emitter';
import { emitOrderEvent } from './event.helpers';
import { OrderEventType } from '../types/order-events.types';
import { createSampleOrder } from '../test/test.providers';
import { Order } from '../entities/order.entity';
import { LoggerService } from 'src/logger/logger.service';

describe('Event Helpers', () => {
  describe('emitOrderEvent', () => {
    let mockEventEmitter: EventEmitter2;
    let mockLogger: LoggerService;
    let sampleOrder: Order;

    beforeEach(() => {
      mockEventEmitter = new EventEmitter2();
      mockLogger = {
        error: jest.fn(),
        warn: jest.fn(),
        log: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
      } as unknown as LoggerService;
      sampleOrder = createSampleOrder();
    });

    it('should emit the correct event with data for order created', (done) => {
      const eventType = OrderEventType.CREATED;

      mockEventEmitter.once(eventType, (eventData) => {
        expect(eventData).toBeDefined();
        expect(eventData.type).toBe(eventType);
        expect(eventData.orderUuid).toBe(sampleOrder.uuid);
        expect(eventData.payload).toEqual(sampleOrder);
        done();
      });

      emitOrderEvent(mockEventEmitter, eventType, sampleOrder, mockLogger);
    });

    it('should emit the correct event with data for order updated', (done) => {
      const eventType = OrderEventType.UPDATED;

      mockEventEmitter.once(eventType, (eventData) => {
        expect(eventData).toBeDefined();
        expect(eventData.type).toBe(eventType);
        expect(eventData.orderUuid).toBe(sampleOrder.uuid);
        expect(eventData.payload).toEqual(sampleOrder);
        done();
      });

      emitOrderEvent(mockEventEmitter, eventType, sampleOrder, mockLogger);
    });

    it('should emit the correct event with data for order canceled', (done) => {
      const eventType = OrderEventType.CANCELED;

      mockEventEmitter.once(eventType, (eventData) => {
        expect(eventData).toBeDefined();
        expect(eventData.type).toBe(eventType);
        expect(eventData.orderUuid).toBe(sampleOrder.uuid);
        expect(eventData.payload).toEqual(sampleOrder);
        done();
      });

      emitOrderEvent(mockEventEmitter, eventType, sampleOrder, mockLogger);
    });

    it('should log error if event emitter fails', () => {
      const eventType = OrderEventType.CREATED;

      // Create a broken emitter
      const brokenEmitter = {
        emit: jest.fn().mockImplementation(() => {
          throw new Error('Emission failed');
        }),
      } as unknown as EventEmitter2;

      // Call the function
      emitOrderEvent(brokenEmitter, eventType, sampleOrder, mockLogger);

      // Verify the logger was called with the error message
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          `Failed to emit ${eventType} event for order ${sampleOrder.uuid}`,
        ),
        expect.any(String),
        'EventHelper',
      );
    });

    it('should handle modified order object correctly', (done) => {
      const eventType = OrderEventType.UPDATED;

      const modifiedOrder = createSampleOrder();
      modifiedOrder.total = 5000;

      mockEventEmitter.once(eventType, (eventData) => {
        expect(eventData.payload.total).toBe(5000);
        expect(eventData.payload).toEqual(modifiedOrder);
        done();
      });

      emitOrderEvent(mockEventEmitter, eventType, modifiedOrder, mockLogger);
    });
  });
});
