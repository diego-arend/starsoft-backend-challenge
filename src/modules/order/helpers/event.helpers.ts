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
    logger.log(
      `Emitting event ${eventType} for order ${order.uuid}`,
      'EventHelper',
    );

    eventEmitter.emit(eventType, {
      type: eventType,
      orderUuid: order.uuid,
      payload: order,
    });

    logger.log(
      `Event ${eventType} for order ${order.uuid} emitted successfully`,
      'EventHelper',
    );
  } catch (error) {
    logger.error(
      `Failed to emit ${eventType} event for order ${order.uuid}: ${error.message}`,
      error.stack,
      'EventHelper',
    );
  }
}
