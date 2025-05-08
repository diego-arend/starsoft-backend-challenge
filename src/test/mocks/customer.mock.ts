export const mockCustomers = [
  {
    id: 1,
    uuid: '550e8400-e29b-41d4-a716-446655440000',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '555-123-4567',
    createdAt: '2023-01-01T10:00:00Z',
    updatedAt: '2023-01-01T10:00:00Z',
  },
  {
    id: 2,
    uuid: '650e8400-e29b-41d4-a716-446655440003',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '555-987-6543',
    createdAt: '2023-01-05T14:30:00Z',
    updatedAt: '2023-01-05T14:30:00Z',
  },
];

export const mockCustomer = mockCustomers[0];

export const createCustomerMock = (overrides = {}) => {
  return {
    ...mockCustomer,
    ...overrides,
  };
};
