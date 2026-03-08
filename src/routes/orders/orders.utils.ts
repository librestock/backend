import type { OrderResponseDto, OrderItemResponseDto } from './dto';
import type { Order } from './entities/order.entity';
import type { OrderItem } from './entities/order-item.entity';
import {
  asClientId,
  asEntityId,
  asOrderId,
  asProductId,
  asUserId,
} from '@librestock/types/common'

export function toOrderItemResponseDto(item: OrderItem): OrderItemResponseDto {
  return {
    id: asEntityId<'OrderItemId'>(item.id),
    product_id: asProductId(item.product_id),
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

export function toOrderResponseDto(order: Order): OrderResponseDto {
  return {
    id: asOrderId(order.id),
    order_number: order.order_number,
    client_id: asClientId(order.client_id),
    client_name: order.client?.company_name ?? null,
    status: order.status,
    delivery_address: order.delivery_address,
    delivery_deadline: order.delivery_deadline,
    yacht_name: order.yacht_name,
    special_instructions: order.special_instructions,
    total_amount: Number(order.total_amount),
    assigned_to: order.assigned_to ? asUserId(order.assigned_to) : null,
    created_by: asUserId(order.created_by),
    confirmed_at: order.confirmed_at,
    shipped_at: order.shipped_at,
    delivered_at: order.delivered_at,
    kanban_task_id: order.kanban_task_id,
    items: (order.items ?? []).map(toOrderItemResponseDto),
    created_at: order.created_at,
    updated_at: order.updated_at,
  };
}
