import { OrderStatus } from '../../modules/order/entities/order.entity';

class MockOrderItem {
  id: number;
  productId: string;
  productName: string;
  price: number;
  quantity: number;

  constructor(data: Partial<MockOrderItem> = {}) {
    Object.assign(this, data);
  }
}

// Classe mock que implementa a interface Order completa
class MockOrder {
  id: number;
  uuid: string;
  customerId: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  updatedAt: string;
  items: MockOrderItem[];

  constructor(data: Partial<MockOrder> = {}) {
    Object.assign(this, {
      id: 1,
      uuid: '123e4567-e89b-12d3-a456-426614174000',
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      status: OrderStatus.DELIVERED,
      total: 2500,
      createdAt: '2023-01-15T14:30:00Z',
      updatedAt: '2023-01-16T09:45:00Z',
      items: [],
      ...data,
    });
  }

  // Implementação do método que falta
  generateUuid(): void {
    if (!this.uuid) {
      this.uuid = `mock-uuid-${Math.random().toString(36).substring(2, 15)}`;
    }
  }
}

// Criar objetos mock usando a classe MockOrder
export const mockOrders = [
  new MockOrder({
    id: 1,
    uuid: '123e4567-e89b-12d3-a456-426614174000',
    customerId: '550e8400-e29b-41d4-a716-446655440000',
    status: OrderStatus.DELIVERED,
    total: 2500,
    createdAt: '2023-01-15T14:30:00Z',
    updatedAt: '2023-01-16T09:45:00Z',
    items: [
      new MockOrderItem({
        id: 101,
        productId: '550e8400-e29b-41d4-a716-446655440001',
        productName: 'Smartphone Galaxy S22',
        price: 1250,
        quantity: 2,
      }),
    ],
  }),
  new MockOrder({
    id: 2,
    uuid: '223e4567-e89b-12d3-a456-426614174001',
    customerId: '550e8400-e29b-41d4-a716-446655440000',
    status: OrderStatus.PROCESSING,
    total: 1800,
    createdAt: '2023-02-20T10:15:00Z',
    updatedAt: '2023-02-20T10:30:00Z',
    items: [
      new MockOrderItem({
        id: 201,
        productId: '550e8400-e29b-41d4-a716-446655440002',
        productName: 'Laptop Ultrabook Pro',
        price: 1800,
        quantity: 1,
      }),
    ],
  }),
  new MockOrder({
    id: 3,
    uuid: '323e4567-e89b-12d3-a456-426614174002',
    customerId: '650e8400-e29b-41d4-a716-446655440003',
    status: OrderStatus.PENDING,
    total: 350,
    createdAt: '2023-03-10T16:45:00Z',
    updatedAt: '2023-03-10T16:45:00Z',
    items: [
      new MockOrderItem({
        id: 301,
        productId: '550e8400-e29b-41d4-a716-446655440003',
        productName: 'Wireless Headphones',
        price: 175,
        quantity: 2,
      }),
    ],
  }),
];

export const mockOrder = mockOrders[0];

// Helper para criar objetos de resultado de busca compatíveis com a interface SearchResult
export const createMockSearchResult = (
  items = mockOrders,
  total = items.length,
  page = 1,
  limit = 10,
) => {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};
