/**
 * Creates a mock for the reconciliation service
 *
 * @returns A mock implementation of OrderReconciliationService
 */
export function createMockReconciliationService() {
  return {
    recordFailedOperation: jest.fn().mockResolvedValue(undefined),
    processFailedOperations: jest.fn().mockResolvedValue(undefined),
  };
}
