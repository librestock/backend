import { ApiProperty } from '@nestjs/swagger';
import type {
  AreaSummaryDto as AreaSummaryDtoShape,
  InventoryResponseDto as InventoryResponseDtoShape,
  LocationSummaryDto as LocationSummaryDtoShape,
  ProductSummaryDto as ProductSummaryDtoShape,
} from '@librestock/types';
import { BaseResponseDto } from '../../../common/dto/base-response.dto';

export class ProductSummaryDto implements ProductSummaryDtoShape {
  @ApiProperty({ description: 'Product ID', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Product SKU' })
  sku: string;

  @ApiProperty({ description: 'Product name' })
  name: string;

  @ApiProperty({ description: 'Unit of measure', nullable: true })
  unit: string | null;
}

export class LocationSummaryDto implements LocationSummaryDtoShape {
  @ApiProperty({ description: 'Location ID', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Location name' })
  name: string;

  @ApiProperty({ description: 'Location type' })
  type: string;
}

export class AreaSummaryDto implements AreaSummaryDtoShape {
  @ApiProperty({ description: 'Area ID', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Area name' })
  name: string;

  @ApiProperty({ description: 'Area code' })
  code: string;
}

export class InventoryResponseDto
  extends BaseResponseDto
  implements InventoryResponseDtoShape
{
  @ApiProperty({
    description: 'Unique identifier',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Product ID',
    format: 'uuid',
  })
  product_id: string;

  @ApiProperty({
    description: 'Product details',
    type: ProductSummaryDto,
    nullable: true,
  })
  product: ProductSummaryDto | null;

  @ApiProperty({
    description: 'Location ID',
    format: 'uuid',
  })
  location_id: string;

  @ApiProperty({
    description: 'Location details',
    type: LocationSummaryDto,
    nullable: true,
  })
  location: LocationSummaryDto | null;

  @ApiProperty({
    description: 'Area ID (specific placement within location)',
    format: 'uuid',
    nullable: true,
  })
  area_id: string | null;

  @ApiProperty({
    description: 'Area details',
    type: AreaSummaryDto,
    nullable: true,
  })
  area: AreaSummaryDto | null;

  @ApiProperty({
    description: 'Quantity in stock',
    example: 100,
  })
  quantity: number;

  @ApiProperty({
    description: 'Batch number',
    example: 'BATCH-2024-001',
  })
  batchNumber: string;

  @ApiProperty({
    description: 'Expiry date',
    nullable: true,
    format: 'date-time',
  })
  expiry_date: Date | null;

  @ApiProperty({
    description: 'Cost per unit',
    nullable: true,
    example: 25.99,
  })
  cost_per_unit: number | null;

  @ApiProperty({
    description: 'Date when received',
    nullable: true,
    format: 'date-time',
  })
  received_date: Date | null;
}
