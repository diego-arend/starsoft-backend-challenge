export interface OrderEventMetadata {
  source: string;
  version: string;
  timestamp: string;
}

export interface OrderCreatedEvent {
  event_type: 'order_created'; // Exatamente como especificado no requisito
  order_id: string;
  customer_id: string;
  status: string;
  total: number;
  items_count: number;
  created_at: Date;
  metadata: OrderEventMetadata;
}

export interface OrderStatusUpdatedEvent {
  event_type: 'order_status_updated'; // Exatamente como especificado no requisito
  order_id: string;
  customer_id: string;
  previous_status: string;
  new_status: string;
  updated_at: string;
  metadata: OrderEventMetadata;
}

export type OrderEvent = OrderCreatedEvent | OrderStatusUpdatedEvent;
