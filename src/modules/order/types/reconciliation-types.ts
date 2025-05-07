/**
 * Status of the reconciliation record
 */
export enum ReconciliationStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
}

/**
 * Type of operation that failed
 */
export enum ReconciliationOperationType {
  INDEX = 'INDEX',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}
