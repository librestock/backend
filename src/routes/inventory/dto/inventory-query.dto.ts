import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  IsEnum,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  InventorySortField,
  SortOrder,
  type InventoryQueryDto as InventoryQueryDtoShape,
} from '@librestock/types';

export { InventorySortField, SortOrder };

export class InventoryQueryDto implements InventoryQueryDtoShape {
  @ApiProperty({
    description: 'Page number (1-based)',
    minimum: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description: 'Filter by product ID',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  product_id?: string;

  @ApiProperty({
    description: 'Filter by location ID',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  location_id?: string;

  @ApiProperty({
    description: 'Filter by area ID',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  area_id?: string;

  @ApiProperty({
    description: 'Search term for batch number',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiProperty({
    description: 'Filter for low stock (quantity <= reorder_point)',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  low_stock?: boolean;

  @ApiProperty({
    description: 'Filter for expiring soon (expiry_date within 30 days)',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  expiring_soon?: boolean;

  @ApiProperty({
    description: 'Minimum quantity filter',
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min_quantity?: number;

  @ApiProperty({
    description: 'Maximum quantity filter',
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  max_quantity?: number;

  @ApiProperty({
    description: 'Field to sort by',
    enum: InventorySortField,
    default: InventorySortField.UPDATED_AT,
    required: false,
  })
  @IsOptional()
  @IsEnum(InventorySortField)
  sort_by?: InventorySortField = InventorySortField.UPDATED_AT;

  @ApiProperty({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.DESC,
    required: false,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sort_order?: SortOrder = SortOrder.DESC;
}
