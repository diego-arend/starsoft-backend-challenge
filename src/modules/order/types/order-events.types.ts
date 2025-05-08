export enum OrderEventType {
  CREATED = 'order.created',
  UPDATED = 'order.updated',
  CANCELED = 'order.canceled',
  DELETED = 'order.deleted',
}

export interface OrderEvent {
  type: OrderEventType;
  orderUuid: string;
  payload: any;
}
