import { HttpStatus } from '@nestjs/common';
import { BaseException } from '../../../common/exceptions/base.exception';
import { OrderStatus } from '../entities/order.entity';

/**
 * Exception thrown when an order event processing fails
 */
export class OrderEventFailedException extends BaseException {
  /**
   * Creates a new OrderEventFailedException
   *
   * @param eventType Type of event that failed (created, updated, etc.)
   * @param orderUuid UUID of the order for which the event failed
   * @param details Additional error details
   */
  constructor(eventType: string, orderUuid: string, details: any) {
    super(
      `Failed to process ${eventType} event for order ${orderUuid}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'ORDER_EVENT_FAILED',
      details,
    );
  }
}

/**
 * Exception thrown when an order cancellation fails
 */
export class OrderCancellationFailedException extends BaseException {
  /**
   * Creates a new OrderCancellationFailedException
   *
   * @param orderUuid UUID of the order that failed to be canceled
   * @param details Additional error details
   */
  constructor(orderUuid: string, details: any) {
    super(
      `Failed to cancel order ${orderUuid}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'ORDER_CANCELLATION_FAILED',
      details,
    );
  }
}

/**
 * Exception thrown when order data validation fails
 */
export class OrderValidationException extends BaseException {
  /**
   * Creates a new OrderValidationException
   *
   * @param message Detailed validation error message
   * @param details Additional error details
   */
  constructor(message: string, details: any) {
    super(message, HttpStatus.BAD_REQUEST, 'ORDER_VALIDATION_FAILED', details);
  }
}

/**
 * Exception thrown when an order cannot be modified due to its current status
 */
export class OrderNotModifiableException extends BaseException {
  /**
   * Creates a new OrderNotModifiableException
   *
   * @param uuid - UUID of the order that cannot be modified
   * @param currentStatus - Current status of the order
   * @param allowedStatuses - Optional array of statuses that would allow modification
   */
  constructor(
    uuid: string,
    currentStatus: OrderStatus,
    allowedStatuses?: OrderStatus[],
  ) {
    const statusMessage = allowedStatuses
      ? `Status must be one of: ${allowedStatuses.join(', ')}`
      : `Status ${currentStatus} does not allow modifications`;

    super(
      `Order ${uuid} cannot be modified. ${statusMessage}`,
      HttpStatus.BAD_REQUEST,
      'ORDER_NOT_MODIFIABLE',
      { uuid, currentStatus, allowedStatuses },
    );
  }
}
