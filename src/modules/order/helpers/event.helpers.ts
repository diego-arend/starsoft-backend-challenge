import { Order } from '../entities/order.entity';
import { OrderEventType } from '../events/order-events.types';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Emits an order event with standard payload structure
 *
 * @param eventEmitter Event emitter instance
 * @param eventType Type of event
 * @param order Order
 */
export function emitOrderEvent(
  eventEmitter: EventEmitter2,
  eventType: OrderEventType,
  order: Order,
): void {
  eventEmitter.emit(eventType, {
    type: eventType,
    orderUuid: order.uuid,
    payload: order,
  });
}
