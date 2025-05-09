import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoggerService } from '../../../logger/logger.service';
import { OrderReconciliation } from '../entities/order-reconciliation.entity';
import {
  ReconciliationOperationType,
  ReconciliationStatus,
} from '../types/reconciliation-types';

/**
 * Service for handling reconciliation of failed Elasticsearch operations
 */
@Injectable()
export class OrderReconciliationService {
  constructor(
    @InjectRepository(OrderReconciliation)
    private readonly reconciliationRepository: Repository<OrderReconciliation>,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Records failed Elasticsearch operations for later reconciliation
   *
   * @param operation - Type of failed operation (index/update/delete)
   * @param orderUuid - UUID of the problematic order
   * @param errorMessage - Optional error message detailing the failure
   */
  async recordFailedOperation(
    operation: string,
    orderUuid: string,
    errorMessage: string = '',
  ): Promise<void> {
    try {
      const operationType = this.mapOperationTypeString(operation);

      const reconciliationRecord = new OrderReconciliation();
      reconciliationRecord.orderUuid = orderUuid;
      reconciliationRecord.operationType = operationType;
      reconciliationRecord.status = ReconciliationStatus.PENDING;
      reconciliationRecord.errorMessage = errorMessage;

      await this.reconciliationRepository.save(reconciliationRecord);

      this.logger.warn(
        `Recorded failed Elasticsearch ${operation} operation for order ${orderUuid}`,
        'OrderReconciliationService',
      );
    } catch (error) {
      this.logger.error(
        `Failed to record reconciliation operation: ${error.message}`,
        error.stack,
        'OrderReconciliationService',
      );
    }
  }

  /**
   * Maps string operation type to enum value
   *
   * @param operation - String representation of operation
   * @returns Corresponding enum value
   */
  private mapOperationTypeString(
    operation: string,
  ): ReconciliationOperationType {
    const operationLower = operation.toLowerCase();

    if (operationLower === 'index') {
      return ReconciliationOperationType.INDEX;
    } else if (operationLower === 'update') {
      return ReconciliationOperationType.UPDATE;
    } else if (operationLower === 'delete') {
      return ReconciliationOperationType.DELETE;
    }

    this.logger.warn(
      `Unrecognized operation type: ${operation}, defaulting to INDEX`,
      'OrderReconciliationService',
    );
    return ReconciliationOperationType.INDEX;
  }

  /**
   * Method that only logs a message about processing operations
   * This is a placeholder for future implementation
   */
  async processFailedOperations(): Promise<void> {
    this.logger.log(
      'Processing failed Elasticsearch operations (not implemented yet)',
      'OrderReconciliationService',
    );
  }
}
