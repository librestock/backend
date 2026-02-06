import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsNumber,
  MaxLength,
  MinLength,
  Min,
  Max,
  Matches,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Transform } from 'class-transformer';
import type { CreateProductDto as CreateProductDtoShape } from '@librestock/types';
import { Product } from '../entities/product.entity';

@ValidatorConstraint({ name: 'priceGreaterThanCost', async: false })
export class PriceGreaterThanCostConstraint
  implements ValidatorConstraintInterface
{
  validate(_value: any, args: ValidationArguments) {
    const obj = args.object as CreateProductDto;
    if (
      obj.standard_price !== undefined &&
      obj.standard_price !== null &&
      obj.standard_cost !== undefined &&
      obj.standard_cost !== null
    ) {
      return obj.standard_price >= obj.standard_cost;
    }
    return true;
  }

  defaultMessage() {
    return 'Standard price must be greater than or equal to standard cost';
  }
}

export class CreateProductDto
  implements Partial<Product>, CreateProductDtoShape
{
  @ApiProperty({
    description: 'Product SKU',
    example: 'PROD-001',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @Transform(({ value }) => value?.trim())
  @MinLength(1)
  @MaxLength(50)
  sku: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Marine Pump',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @Transform(({ value }) => value?.trim())
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: 'Product description',
    maxLength: 1000,
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value?.trim() ? value.trim() : null))
  @MaxLength(1000)
  description?: string | null;

  @ApiProperty({
    description: 'Category ID',
    format: 'uuid',
  })
  @IsUUID()
  category_id: string;

  @ApiProperty({
    description: 'Brand ID',
    format: 'uuid',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsUUID()
  brand_id?: string | null;

  @ApiProperty({
    description: 'Volume in milliliters',
    nullable: true,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  volume_ml?: number | null;

  @ApiProperty({
    description: 'Weight in kilograms',
    nullable: true,
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight_kg?: number | null;

  @ApiProperty({
    description: 'Dimensions in cm (format: LxWxH, e.g., 10x20x5)',
    maxLength: 50,
    nullable: true,
    required: false,
    example: '10x20x5',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value?.trim() ? value.trim() : null))
  @MaxLength(50)
  @Matches(/^\d+(\.\d+)?x\d+(\.\d+)?x\d+(\.\d+)?$/, {
    message:
      'Dimensions must be in format LxWxH (e.g., 10x20x5 or 10.5x20.25x5)',
  })
  dimensions_cm?: string | null;

  @ApiProperty({
    description: 'Standard cost',
    nullable: true,
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  standard_cost?: number | null;

  @ApiProperty({
    description: 'Standard price (must be >= standard_cost)',
    nullable: true,
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Validate(PriceGreaterThanCostConstraint)
  standard_price?: number | null;

  @ApiProperty({
    description: 'Markup percentage',
    nullable: true,
    required: false,
    minimum: 0,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  markup_percentage?: number | null;

  @ApiProperty({
    description: 'Reorder point threshold',
    example: 10,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  reorder_point: number;

  @ApiProperty({
    description: 'Primary supplier ID',
    format: 'uuid',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsUUID()
  primary_supplier_id?: string | null;

  @ApiProperty({
    description: 'Supplier SKU',
    maxLength: 50,
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value?.trim() ? value.trim() : null))
  @MaxLength(50)
  supplier_sku?: string | null;

  @ApiProperty({
    description: 'Product barcode',
    maxLength: 100,
    nullable: true,
    required: false,
    example: '0641628607549',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value?.trim() ? value.trim() : null))
  @MaxLength(100)
  barcode?: string | null;

  @ApiProperty({
    description: 'Unit of measure',
    maxLength: 50,
    nullable: true,
    required: false,
    example: 'units',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value?.trim() ? value.trim() : null))
  @MaxLength(50)
  unit?: string | null;

  @ApiProperty({
    description: 'Whether the product is active',
  })
  @IsBoolean()
  is_active: boolean;

  @ApiProperty({
    description: 'Whether the product is perishable',
  })
  @IsBoolean()
  is_perishable: boolean;

  @ApiProperty({
    description: 'Additional notes',
    maxLength: 500,
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value?.trim() ? value.trim() : null))
  @MaxLength(500)
  notes?: string | null;
}
