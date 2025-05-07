import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderDocument } from '../interfaces/order-document.interface';

/**
 * Maps Elasticsearch search response to array of Order entities
 *
 * @param searchResponse The response from Elasticsearch search
 * @returns Array of Order entities
 */
export function mapElasticsearchResponseToOrders(searchResponse: any): Order[] {
  return searchResponse.hits.hits.map((hit: any) => {
    const source = hit._source;
    const order = new Order();

    order.uuid = source.uuid;
    order.customerId = source.customerId;
    order.status = source.status;
    order.total = source.total;
    order.createdAt = new Date(source.createdAt);
    order.updatedAt = new Date(source.updatedAt);

    // Map items if they exist
    if (source.items && Array.isArray(source.items)) {
      order.items = source.items.map((item: any) => {
        const orderItem = new OrderItem();
        orderItem.uuid = item.uuid;
        orderItem.productId = item.productId;
        orderItem.productName = item.productName;
        orderItem.price = item.price;
        orderItem.quantity = item.quantity;
        orderItem.subtotal = item.subtotal;
        return orderItem;
      });
    } else {
      order.items = [];
    }

    return order;
  });
}

/**
 * Prepares a document for indexing/updating in Elasticsearch
 *
 * @param order The order to be prepared
 * @returns Document formatted for Elasticsearch
 */
export function prepareOrderDocument(order: Order): OrderDocument {
  return {
    uuid: order.uuid,
    customerId: order.customerId,
    status: order.status,
    total: order.total,
    createdAt: order.createdAt.toISOString(), // Convertendo Date para string
    updatedAt: order.updatedAt.toISOString(), // Convertendo Date para string
    items: order.items.map((item) => ({
      uuid: item.uuid,
      productId: item.productId,
      productName: item.productName,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.subtotal,
    })),
  };
}

/**
 * Creates formatted error log message for Elasticsearch operations
 *
 * @param operation The operation that failed
 * @param error The error object
 * @returns Formatted error message
 */
export function formatElasticsearchErrorMessage(
  operation: string,
  error: any,
): string {
  return `Failed to ${operation} in Elasticsearch: ${error.message}`;
}
