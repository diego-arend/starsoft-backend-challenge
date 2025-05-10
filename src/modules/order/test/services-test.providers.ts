export const createMockOrderEventsService = () => ({
  publishOrderCreated: jest.fn().mockResolvedValue(undefined),
  publishOrderStatusUpdated: jest.fn().mockResolvedValue(undefined),
});
