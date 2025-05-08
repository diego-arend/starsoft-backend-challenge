import { Order } from '../entities/order.entity';
import { OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';

/**
 * Creates a sample order for testing
 */
export function createSampleOrder(): Order {
  return {
    id: 1,
    uuid: 'test-uuid',
    customerId: 'customer-123',
    status: OrderStatus.PENDING,
    items: [
      {
        id: 1,
        productId: 'product-1',
        productName: 'Test Product',
        quantity: 2,
        price: 1000,
      } as OrderItem,
    ],
    total: 2000,
    createdAt: new Date(),
    updatedAt: new Date(),

    generateUuid: function () {
      return this.uuid;
    },
  };
}
