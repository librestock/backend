import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  IsEnum,
  IsString,
  MaxLength,
  IsNumber,
} from 'class-validator';
import type { LocationId, OrderId, ProductId } from '@librestock/types/common'
import type { CreateStockMovementDto as CreateStockMovementDtoShape } from '@librestock/types/stock-movements'
import { StockMovementReason } from '@librestock/types/stock-movements'

export class CreateStockMovementDto implements CreateStockMovementDtoShape {
  @ApiProperty({ description: 'Product ID', format: 'uuid' })
  @IsUUID()
  product_id: ProductId;

  @ApiProperty({
    description: 'Source location ID',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  from_location_id?: LocationId;

  @ApiProperty({
    description: 'Destination location ID',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  to_location_id?: LocationId;

  @ApiProperty({ description: 'Quantity to move', minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: 'Reason for the stock movement',
    enum: StockMovementReason,
  })
  @IsEnum(StockMovementReason)
  reason: StockMovementReason;

  @ApiProperty({
    description: 'Related order ID',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  order_id?: OrderId;

  @ApiProperty({
    description: 'Reference number',
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference_number?: string;

  @ApiProperty({
    description: 'Cost per unit',
    type: 'number',
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost_per_unit?: number;

  @ApiProperty({
    description: 'Additional notes',
    maxLength: 1000,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
