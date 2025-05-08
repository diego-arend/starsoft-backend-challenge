import { Order } from '../../order/entities/order.entity';

export interface SearchResult {
  items: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
