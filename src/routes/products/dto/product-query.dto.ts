import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  IsBoolean,
  IsNumber,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  ProductSortField,
  SortOrder,
  type ProductQueryDto as ProductQueryDtoShape,
} from '@librestock/types';

export { ProductSortField, SortOrder };

export class ProductQueryDto implements ProductQueryDtoShape {
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
    description: 'Search term for name or SKU',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiProperty({
    description: 'Filter by category ID',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @ApiProperty({
    description: 'Filter by brand ID',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  brand_id?: string;

  @ApiProperty({
    description: 'Filter by primary supplier ID',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  primary_supplier_id?: string;

  @ApiProperty({
    description: 'Filter by active status',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({
    description: 'Filter by perishable status',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_perishable?: boolean;

  @ApiProperty({
    description: 'Minimum price filter',
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min_price?: number;

  @ApiProperty({
    description: 'Maximum price filter',
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  max_price?: number;

  @ApiProperty({
    description: 'Include soft-deleted products',
    default: false,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  include_deleted?: boolean = false;

  @ApiProperty({
    description: 'Field to sort by',
    enum: ProductSortField,
    default: ProductSortField.NAME,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProductSortField)
  sort_by?: ProductSortField = ProductSortField.NAME;

  @ApiProperty({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.ASC,
    required: false,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sort_order?: SortOrder = SortOrder.ASC;
}
