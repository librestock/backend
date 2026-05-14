import { OrderStatus } from './order-status.enum';
import type {
  ClientId,
  OrderId,
  OrderItemId,
  ProductId,
  UserId,
} from '../common/entity-id.type'

export interface OrderItemResponseDto {
  id: OrderItemId
  product_id: ProductId
  product_name: string | null;
  product_sku: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes: string | null;
  quantity_picked: number;
  quantity_packed: number;
  created_at: Date;
  updated_at: Date;
}

export interface OrderResponseDto {
  id: OrderId
  order_number: string;
  client_id: ClientId
  client_name: string | null;
  status: OrderStatus;
  delivery_address: string;
  delivery_deadline: Date | null;
  yacht_name: string | null;
  special_instructions: string | null;
  total_amount: number;
  assigned_to: UserId | null
  created_by: UserId
  confirmed_at: Date | null;
  shipped_at: Date | null;
  delivered_at: Date | null;
  kanban_task_id: string | null;
  items: OrderItemResponseDto[];
  created_at: Date;
  updated_at: Date;
}

// Backward-compatible aliases (deprecated).
export type OrderItemResponseType = OrderItemResponseDto
export type OrderResponseType = OrderResponseDto
