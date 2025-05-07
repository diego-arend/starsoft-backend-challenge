import { OrderStatus } from '../entities/order.entity';

export interface OrderItemDocument {
  uuid: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface OrderDocument {
  uuid: string;
  customerId: string;
  status: OrderStatus | string;
  total: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItemDocument[];
}
