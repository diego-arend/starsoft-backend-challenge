import { HttpException, HttpStatus } from '@nestjs/common';
import { BaseException } from '../../../common/exceptions/base.exception';

/**
 * Exception thrown when an order is not found
 * This represents normal behavior (resource not found) rather than a system error
 */
export class OrderNotFoundException extends HttpException {
  /**
   * Creates a new OrderNotFoundException
   *
   * @param identifier - UUID or ID of the order that was not found
   */
  constructor(identifier: string | number) {
    const isUuid = typeof identifier === 'string';
    const message = `Order with ${isUuid ? 'UUID' : 'ID'} ${identifier} not found`;

    super(
      {
        message,
        statusCode: HttpStatus.NOT_FOUND,
        errorCode: 'ORDER_NOT_FOUND',
        timestamp: new Date().toISOString(),
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Exception thrown when an order cannot be modified because of its current status
 */
export class OrderNotModifiableException extends Error {
  constructor(status: string) {
    super(`Order with status ${status} cannot be modified`);
    this.name = 'OrderNotModifiableException';
  }
}

/**
 * Exception thrown when order creation fails
 */
export class OrderCreationFailedException extends BaseException {
  /**
   * Creates a new OrderCreationFailedException
   *
   * @param details - Additional error details
   */
  constructor(details: any) {
    super(
      'Failed to create order',
      HttpStatus.INTERNAL_SERVER_ERROR,
      'ORDER_CREATION_FAILED',
      details,
    );
  }
}

/**
 * Exception thrown when order update fails
 */
export class OrderUpdateFailedException extends BaseException {
  /**
   * Creates a new OrderUpdateFailedException
   *
   * @param details - Additional error details
   */
  constructor(details: any) {
    super(
      'Failed to update order',
      HttpStatus.INTERNAL_SERVER_ERROR,
      'ORDER_UPDATE_FAILED',
      details,
    );
  }
}

/**
 * Exception thrown when order items are invalid
 */
export class InvalidOrderItemsException extends BaseException {
  /**
   * Creates a new InvalidOrderItemsException
   *
   * @param details - Information about the invalid items
   */
  constructor(details: any) {
    super(
      'Invalid order items provided',
      HttpStatus.BAD_REQUEST,
      'INVALID_ORDER_ITEMS',
      details,
    );
  }
}

/**
 * Exception thrown when a database transaction fails
 */
export class DatabaseTransactionFailedException extends BaseException {
  /**
   * Creates a new DatabaseTransactionFailedException
   *
   * @param operation - Database operation that failed
   * @param details - Additional error details
   */
  constructor(operation: string, details: any) {
    super(
      `Database transaction failed during ${operation}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'TRANSACTION_FAILED',
      details,
    );
  }
}

/**
 * Exception thrown when an order event processing fails
 */
export class OrderEventFailedException extends BaseException {
  /**
   * Creates a new OrderEventFailedException
   *
   * @param eventType - Type of event that failed (created, updated, etc.)
   * @param orderUuid - UUID of the order for which the event failed
   * @param details - Additional error details
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
   * @param orderUuid - UUID of the order that failed to be canceled
   * @param details - Additional error details
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
   * @param message - Detailed validation error message
   * @param details - Additional error details
   */
  constructor(message: string, details: any) {
    super(message, HttpStatus.BAD_REQUEST, 'ORDER_VALIDATION_FAILED', details);
  }
}
