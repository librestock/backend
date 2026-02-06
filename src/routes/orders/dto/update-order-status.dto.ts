import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrderStatus } from '@librestock/types';
import type { UpdateOrderStatusType as UpdateOrderStatusTypeShape } from '@librestock/types';

export class UpdateOrderStatusDto implements UpdateOrderStatusTypeShape {
  @ApiProperty({
    description: 'New order status',
    enum: OrderStatus,
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
