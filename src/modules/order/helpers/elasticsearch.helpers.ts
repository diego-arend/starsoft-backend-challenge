import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderDocument } from '../interfaces/order-document.interface';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';

/**
 * Converts Elasticsearch documents to Order entities
 *
 * @param searchResponse Elasticsearch search response
 * @returns Array of Order entities
 */
export function mapElasticsearchResponseToOrders(
  searchResponse: SearchResponse<OrderDocument>,
): Order[] {
  const hits = searchResponse.hits.hits;

  if (hits.length === 0) {
    return [];
  }

  // Convert Elasticsearch documents to Order objects
  const orders = hits
    .map((hit) => {
      const orderData = hit._source;
      if (!orderData) {
        return null;
      }

      return createOrderFromDocument(orderData);
    })
    .filter((order): order is Order => order !== null);

  return orders;
}

/**
 * Creates an Order entity from an Elasticsearch document
 *
 * @param orderData Elasticsearch document
 * @returns Order entity
 */
export function createOrderFromDocument(orderData: OrderDocument): Order {
  // Create an Order object from Elasticsearch data
  const order = new Order();
  order.uuid = orderData.uuid;
  order.customerId = orderData.customerId;
  order.status = orderData.status as OrderStatus;
  order.total = orderData.total;
  order.createdAt = new Date(orderData.createdAt);
  order.updatedAt = new Date(orderData.updatedAt);

  // Process order items
  if (orderData.items && Array.isArray(orderData.items)) {
    order.items = orderData.items.map(createOrderItemFromDocument);
  } else {
    order.items = [];
  }

  return order;
}

/**
 * Creates an OrderItem entity from an Elasticsearch document
 *
 * @param itemData Elasticsearch item document
 * @returns OrderItem entity
 */
export function createOrderItemFromDocument(itemData: any): OrderItem {
  const orderItem = new OrderItem();
  orderItem.uuid = itemData.uuid;
  orderItem.productId = itemData.productId;
  orderItem.productName = itemData.productName;
  orderItem.price = itemData.price;
  orderItem.quantity = itemData.quantity;
  orderItem.subtotal = itemData.subtotal;
  return orderItem;
}
