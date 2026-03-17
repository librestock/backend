import { Effect } from 'effect';
import type { OrderResponseDto, OrderItemResponseDto } from '@librestock/types/orders';
import type { Order } from './entities/order.entity';
import type { OrderItem } from './entities/order-item.entity';
import { OrdersInfrastructureError } from './orders.errors';

export class OrderUtils {
  public static toOrderItemResponseDto(item: OrderItem): OrderItemResponseDto {
    return {
      id: item.id,
      product_id: item.product_id,
      product_name: item.product?.name ?? null,
      product_sku: item.product?.sku ?? null,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      subtotal: Number(item.subtotal),
      notes: item.notes,
      quantity_picked: item.quantity_picked,
      quantity_packed: item.quantity_packed,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  }

  public static toOrderResponseDto(order: Order): OrderResponseDto {
    return {
      id: order.id,
      order_number: order.order_number,
      client_id: order.client_id,
      client_name: order.client?.company_name ?? null,
      status: order.status,
      delivery_address: order.delivery_address,
      delivery_deadline: order.delivery_deadline,
      yacht_name: order.yacht_name,
      special_instructions: order.special_instructions,
      total_amount: Number(order.total_amount),
      assigned_to: order.assigned_to,
      created_by: order.created_by,
      confirmed_at: order.confirmed_at,
      shipped_at: order.shipped_at,
      delivered_at: order.delivered_at,
      kanban_task_id: order.kanban_task_id,
      items: (order.items ?? []).map((item) => OrderUtils.toOrderItemResponseDto(item)),
      created_at: order.created_at,
      updated_at: order.updated_at,
    };
  }

  public static tryAsync<A>(
    action: string,
    execute: () => Promise<A>,
  ): Effect.Effect<A, OrdersInfrastructureError> {
    return Effect.tryPromise({
      try: execute,
      catch: (cause) =>
        new OrdersInfrastructureError({
          action,
          cause,
          message: `Orders service failed to ${action}`,
        }),
    });
  }

  public static generateOrderPrefix(date: Date): string {
    return `ORD-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  }
}
