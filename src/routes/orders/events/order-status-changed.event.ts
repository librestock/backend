import { type OrderStatus } from '@librestock/types/orders';
import { type Order } from '../entities/order.entity';

export const ORDER_STATUS_CHANGED = 'order.status.changed';

export class OrderStatusChangedEvent {
  constructor(
    public readonly orderId: string,
    public readonly previousStatus: OrderStatus,
    public readonly newStatus: OrderStatus,
    public readonly order: Order,
    public readonly timestamp: Date,
  ) {}
}
