import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderRepository } from '../orders.repository';
import { getOrderState } from '../state/order-state';
import {
  ORDER_STATUS_CHANGED,
  OrderStatusChangedEvent,
} from './order-status-changed.event';

@Injectable()
export class OrderTimestampHandler {
  constructor(private readonly orderRepository: OrderRepository) {}

  @OnEvent(ORDER_STATUS_CHANGED)
  async handleStatusChanged(event: OrderStatusChangedEvent): Promise<void> {
    const field = getOrderState(event.newStatus).timestampField;
    if (!field) return;

    await this.orderRepository.update(event.orderId, { [field]: event.timestamp });
  }
}
