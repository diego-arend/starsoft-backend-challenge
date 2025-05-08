import { OrderStatus } from '../../modules/order/entities/order.entity';

export const mockOrders = [
  {
    id: 1,
    uuid: '123e4567-e89b-12d3-a456-426614174000',
    customerId: '550e8400-e29b-41d4-a716-446655440000',
    status: OrderStatus.DELIVERED,
    total: 2500,
    createdAt: '2023-01-15T14:30:00Z',
    updatedAt: '2023-01-16T09:45:00Z',
    items: [
      {
        id: 101,
        productId: '550e8400-e29b-41d4-a716-446655440001',
        productName: 'Smartphone Galaxy S22',
        price: 1250,
        quantity: 2,
      },
    ],
  },
  {
    id: 2,
    uuid: '223e4567-e89b-12d3-a456-426614174001',
    customerId: '550e8400-e29b-41d4-a716-446655440000',
    status: OrderStatus.PROCESSING,
    total: 1800,
    createdAt: '2023-02-20T10:15:00Z',
    updatedAt: '2023-02-20T10:30:00Z',
    items: [
      {
        id: 201,
        productId: '550e8400-e29b-41d4-a716-446655440002',
        productName: 'Laptop Ultrabook Pro',
        price: 1800,
        quantity: 1,
      },
    ],
  },
  {
    id: 3,
    uuid: '323e4567-e89b-12d3-a456-426614174002',
    customerId: '650e8400-e29b-41d4-a716-446655440003',
    status: OrderStatus.PENDING,
    total: 350,
    createdAt: '2023-03-10T16:45:00Z',
    updatedAt: '2023-03-10T16:45:00Z',
    items: [
      {
        id: 301,
        productId: '550e8400-e29b-41d4-a716-446655440003',
        productName: 'Wireless Headphones',
        price: 175,
        quantity: 2,
      },
    ],
  },
];

export const mockOrder = mockOrders[0];
