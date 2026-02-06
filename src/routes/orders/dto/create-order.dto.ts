import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsInt,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  Min,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import type {
  CreateOrderType as CreateOrderTypeShape,
  CreateOrderItemType as CreateOrderItemTypeShape,
} from '@librestock/types';

export class CreateOrderItemDto implements CreateOrderItemTypeShape {
  @ApiProperty({ description: 'Product ID', format: 'uuid' })
  @IsUUID()
  product_id: string;

  @ApiProperty({ description: 'Quantity ordered', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Unit price', minimum: 0, type: 'number' })
  @IsNumber()
  @Min(0)
  unit_price: number;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateOrderDto implements CreateOrderTypeShape {
  @ApiProperty({ description: 'Client ID', format: 'uuid' })
  @IsUUID()
  client_id: string;

  @ApiProperty({ description: 'Delivery address' })
  @IsString()
  @Transform(({ value }) => value?.trim())
  delivery_address: string;

  @ApiProperty({
    description: 'Delivery deadline (ISO date)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  delivery_deadline?: string;

  @ApiProperty({ description: 'Yacht name', required: false, maxLength: 200 })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  @MaxLength(200)
  yacht_name?: string;

  @ApiProperty({ description: 'Special instructions', required: false })
  @IsOptional()
  @IsString()
  special_instructions?: string;

  @ApiProperty({
    description: 'Order items',
    type: [CreateOrderItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
