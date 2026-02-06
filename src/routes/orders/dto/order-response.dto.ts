import { ApiProperty } from '@nestjs/swagger';
import {
  OrderStatus,
  type OrderResponseType as OrderResponseTypeShape,
  type OrderItemResponseType as OrderItemResponseTypeShape,
} from '@librestock/types';
import { BaseResponseDto } from '../../../common/dto/base-response.dto';

export class OrderItemResponseDto
  extends BaseResponseDto
  implements OrderItemResponseTypeShape
{
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Product ID', format: 'uuid' })
  product_id: string;

  @ApiProperty({ description: 'Product name', nullable: true })
  product_name: string | null;

  @ApiProperty({ description: 'Product SKU', nullable: true })
  product_sku: string | null;

  @ApiProperty({ description: 'Quantity ordered' })
  quantity: number;

  @ApiProperty({ description: 'Unit price', type: 'number' })
  unit_price: number;

  @ApiProperty({ description: 'Subtotal amount', type: 'number' })
  subtotal: number;

  @ApiProperty({ description: 'Additional notes', nullable: true })
  notes: string | null;

  @ApiProperty({ description: 'Quantity picked', default: 0 })
  quantity_picked: number;

  @ApiProperty({ description: 'Quantity packed', default: 0 })
  quantity_packed: number;
}

export class OrderResponseDto
  extends BaseResponseDto
  implements OrderResponseTypeShape
{
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Order number' })
  order_number: string;

  @ApiProperty({ description: 'Client ID', format: 'uuid' })
  client_id: string;

  @ApiProperty({ description: 'Client company name', nullable: true })
  client_name: string | null;

  @ApiProperty({ description: 'Order status', enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty({ description: 'Delivery address' })
  delivery_address: string;

  @ApiProperty({ description: 'Delivery deadline', nullable: true })
  delivery_deadline: Date | null;

  @ApiProperty({ description: 'Yacht name', nullable: true })
  yacht_name: string | null;

  @ApiProperty({ description: 'Special instructions', nullable: true })
  special_instructions: string | null;

  @ApiProperty({ description: 'Total order amount', type: 'number' })
  total_amount: number;

  @ApiProperty({
    description: 'Assigned user ID',
    format: 'uuid',
    nullable: true,
  })
  assigned_to: string | null;

  @ApiProperty({ description: 'User ID who created the order', format: 'uuid' })
  created_by: string;

  @ApiProperty({ description: 'Confirmed timestamp', nullable: true })
  confirmed_at: Date | null;

  @ApiProperty({ description: 'Shipped timestamp', nullable: true })
  shipped_at: Date | null;

  @ApiProperty({ description: 'Delivered timestamp', nullable: true })
  delivered_at: Date | null;

  @ApiProperty({ description: 'Kanban task ID', nullable: true })
  kanban_task_id: string | null;

  @ApiProperty({
    description: 'Order items',
    type: [OrderItemResponseDto],
  })
  items: OrderItemResponseDto[];
}
