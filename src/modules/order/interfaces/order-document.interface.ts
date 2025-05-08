import { OrderStatus } from '../entities/order.entity';

/**
 * Item structure for Elasticsearch documents
 */
interface OrderItemDocument {
  uuid: string;
  id?: number;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

/**
 * Order structure for Elasticsearch documents
 */
export interface OrderDocument {
  uuid: string;
  id?: number;
  customerId: string;
  status: OrderStatus;
  total: number;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItemDocument[];
}
