import { OrderStatus } from '../entities/order.entity';

export class OrderItemResponseDto {
  uuid: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;

  constructor(partial: Partial<OrderItemResponseDto>) {
    Object.assign(this, partial);
  }
}

export class OrderResponseDto {
  uuid: string;
  customerId: string;
  status: OrderStatus;
  total: number;
  items: OrderItemResponseDto[];
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<OrderResponseDto>) {
    Object.assign(this, partial);
    if (partial.items) {
      this.items = partial.items.map((item) => new OrderItemResponseDto(item));
    }
  }
}
