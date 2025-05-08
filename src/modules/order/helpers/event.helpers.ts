import { LoggerService } from 'src/logger/logger.service';
import { Order } from '../entities/order.entity';
import { OrderEventType } from '../types/order-events.types';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Emits an order event with standard payload structure
 */
export function emitOrderEvent(
  eventEmitter: EventEmitter2,
  eventType: OrderEventType,
  order: Order,
  logger: LoggerService,
): void {
  try {
    eventEmitter.emit(eventType, {
      type: eventType,
      orderUuid: order.uuid,
      payload: order,
    });
  } catch (error) {
    logger.error(
      `Failed to emit ${eventType} event for order ${order.uuid}: ${error.message}`,
      error.stack,
      'EventHelper',
    );
  }
}
