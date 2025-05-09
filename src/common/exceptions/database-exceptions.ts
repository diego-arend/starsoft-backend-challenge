import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';

/**
 * Exception thrown when a database entity is not found
 */
export class EntityNotFoundException extends BaseException {
  /**
   * Creates a new EntityNotFoundException
   *
   * @param entityName - Name of the entity type
   * @param identifier - UUID, ID or other identifier of the entity
   */
  constructor(entityName: string, identifier: string | number) {
    const idType = typeof identifier === 'string' ? 'UUID' : 'ID';
    super(
      `${entityName} with ${idType} ${identifier} not found`,
      HttpStatus.NOT_FOUND,
      `${entityName.toUpperCase()}_NOT_FOUND`,
    );
  }
}

/**
 * Exception thrown when an entity cannot be modified due to its state
 */
export class EntityNotModifiableException extends BaseException {
  /**
   * Creates a new EntityNotModifiableException
   *
   * @param entityName - Name of the entity type
   * @param identifier - UUID, ID or other identifier of the entity
   * @param reason - Reason why the entity cannot be modified
   */
  constructor(entityName: string, identifier: string | number, reason: string) {
    super(
      `${entityName} ${identifier} cannot be modified: ${reason}`,
      HttpStatus.BAD_REQUEST,
      `${entityName.toUpperCase()}_NOT_MODIFIABLE`,
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
 * Exception thrown when entity creation fails
 */
export class EntityCreationFailedException extends BaseException {
  /**
   * Creates a new EntityCreationFailedException
   *
   * @param entityName - Name of the entity type
   * @param details - Additional error details
   */
  constructor(entityName: string, details?: any) {
    super(
      `Failed to create ${entityName}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      `${entityName.toUpperCase()}_CREATION_FAILED`,
      details,
    );
  }
}

/**
 * Exception thrown when entity update fails
 */
export class EntityUpdateFailedException extends BaseException {
  /**
   * Creates a new EntityUpdateFailedException
   *
   * @param entityName - Name of the entity type
   * @param details - Additional error details
   */
  constructor(entityName: string, details?: any) {
    super(
      `Failed to update ${entityName}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      `${entityName.toUpperCase()}_UPDATE_FAILED`,
      details,
    );
  }
}

/**
 * Exception thrown when entity data validation fails
 */
export class EntityValidationException extends BaseException {
  /**
   * Creates a new EntityValidationException
   *
   * @param entityName - Name of the entity type
   * @param message - Detailed validation error message
   * @param details - Additional error details
   */
  constructor(entityName: string, message: string, details?: any) {
    super(
      message,
      HttpStatus.BAD_REQUEST,
      `${entityName.toUpperCase()}_VALIDATION_FAILED`,
      details,
    );
  }
}
