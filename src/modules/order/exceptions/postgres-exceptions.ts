import { HttpStatus } from '@nestjs/common';
import { BaseException } from '../../../common/exceptions/base.exception';
import { OrderStatus } from '../entities/order.entity';

/**
 * Exceção lançada quando um pedido não é encontrado
 */
export class OrderNotFoundException extends BaseException {
  constructor(identifier: string | number) {
    const isUuid = typeof identifier === 'string';
    const message = `Order with ${isUuid ? 'UUID' : 'ID'} ${identifier} not found`;
    super(message, HttpStatus.NOT_FOUND, 'ORDER_NOT_FOUND');
  }
}

/**
 * Exceção lançada quando um pedido não pode ser modificado
 */
export class OrderNotModifiableException extends BaseException {
  constructor(status: OrderStatus) {
    super(
      `Order with status ${status} cannot be modified`,
      HttpStatus.BAD_REQUEST,
      'ORDER_NOT_MODIFIABLE',
    );
  }
}

/**
 * Exceção lançada quando a criação de um pedido falha
 */
export class OrderCreationFailedException extends BaseException {
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
 * Exceção lançada quando a atualização de um pedido falha
 */
export class OrderUpdateFailedException extends BaseException {
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
 * Exceção lançada quando os itens do pedido são inválidos
 */
export class InvalidOrderItemsException extends BaseException {
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
 * Exceção lançada quando uma transação de banco de dados falha
 */
export class DatabaseTransactionFailedException extends BaseException {
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
