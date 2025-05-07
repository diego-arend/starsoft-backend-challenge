import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import {
  ReconciliationOperationType,
  ReconciliationStatus,
} from '../types/reconciliation-types';

/**
 * Entity for tracking failed Elasticsearch operations
 */
@Entity('order_reconciliation')
export class OrderReconciliation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid' })
  @Index()
  orderUuid: string;

  @Column({
    type: 'enum',
    enum: ReconciliationOperationType,
  })
  operationType: ReconciliationOperationType;

  @Column({
    type: 'enum',
    enum: ReconciliationStatus,
    default: ReconciliationStatus.PENDING,
  })
  status: ReconciliationStatus;

  @Column({ nullable: true, type: 'text' })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
