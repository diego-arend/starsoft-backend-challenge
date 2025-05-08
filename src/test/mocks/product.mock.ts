export const mockProducts = [
  {
    id: 1,
    uuid: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Smartphone Galaxy S22',
    price: 1250,
    description: 'Latest smartphone with advanced features',
    createdAt: '2023-01-01T10:00:00Z',
    updatedAt: '2023-01-01T10:00:00Z',
  },
  {
    id: 2,
    uuid: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Laptop Ultrabook Pro',
    price: 1800,
    description: 'Powerful laptop for professionals',
    createdAt: '2023-01-02T11:30:00Z',
    updatedAt: '2023-01-02T11:30:00Z',
  },
  {
    id: 3,
    uuid: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Wireless Headphones',
    price: 175,
    description: 'High-quality noise-cancelling headphones',
    createdAt: '2023-01-03T09:15:00Z',
    updatedAt: '2023-01-03T09:15:00Z',
  },
];

export const mockProduct = mockProducts[0];

export const createProductMock = (overrides = {}) => {
  return {
    ...mockProduct,
    ...overrides,
  };
};
