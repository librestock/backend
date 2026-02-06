import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import type { UpdateOrderType as UpdateOrderTypeShape } from '@librestock/types';

export class UpdateOrderDto implements UpdateOrderTypeShape {
  @ApiProperty({ description: 'Delivery address', required: false })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  delivery_address?: string;

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
    description: 'Assigned user ID',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  assigned_to?: string;
}
