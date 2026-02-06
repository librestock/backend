import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsUUID,
  IsBoolean,
  IsOptional,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  BulkCreateProductsDto as BulkCreateProductsDtoShape,
  BulkUpdateStatusDto as BulkUpdateStatusDtoShape,
  BulkDeleteDto as BulkDeleteDtoShape,
  BulkRestoreDto as BulkRestoreDtoShape,
  BulkOperationResultDto as BulkOperationResultDtoShape,
} from '@librestock/types';
import { CreateProductDto } from './create-product.dto';

export class BulkCreateProductsDto implements BulkCreateProductsDtoShape {
  @ApiProperty({
    description: 'Array of products to create',
    type: [CreateProductDto],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateProductDto)
  products: CreateProductDto[];
}

export class BulkUpdateStatusDto implements BulkUpdateStatusDtoShape {
  @ApiProperty({
    description: 'Array of product IDs to update',
    type: [String],
    format: 'uuid',
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  ids: string[];

  @ApiProperty({
    description: 'New active status',
  })
  @IsBoolean()
  is_active: boolean;
}

export class BulkDeleteDto implements BulkDeleteDtoShape {
  @ApiProperty({
    description: 'Array of product IDs to delete',
    type: [String],
    format: 'uuid',
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  ids: string[];

  @ApiProperty({
    description: 'Permanently delete (hard delete) instead of soft delete',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  permanent?: boolean = false;
}

export class BulkRestoreDto implements BulkRestoreDtoShape {
  @ApiProperty({
    description: 'Array of product IDs to restore',
    type: [String],
    format: 'uuid',
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  ids: string[];
}

export class BulkOperationResultDto implements BulkOperationResultDtoShape {
  @ApiProperty({ description: 'Number of successfully processed items' })
  success_count: number;

  @ApiProperty({ description: 'Number of failed items' })
  failure_count: number;

  @ApiProperty({
    description: 'IDs that were successfully processed',
    type: [String],
  })
  succeeded: string[];

  @ApiProperty({
    description: 'Details of failed operations',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        error: { type: 'string' },
      },
    },
  })
  failures: { id?: string; sku?: string; error: string }[];
}
