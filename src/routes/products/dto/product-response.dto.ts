import { ApiProperty } from '@nestjs/swagger';
import type {
  CategorySummaryDto as CategorySummaryDtoShape,
  SupplierSummaryDto as SupplierSummaryDtoShape,
  ProductLinksDto as ProductLinksDtoShape,
  ProductResponseDto as ProductResponseDtoShape,
} from '@librestock/types';
import { HateoasLink } from '../../../common/hateoas/hateoas-link.dto';
import { BaseAuditResponseDto } from '../../../common/dto/base-response.dto';

export class CategorySummaryDto implements CategorySummaryDtoShape {
  @ApiProperty({
    description: 'Category ID',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Electronics',
  })
  name: string;

  @ApiProperty({
    description: 'Parent category ID',
    format: 'uuid',
    nullable: true,
  })
  parent_id: string | null;
}

export class SupplierSummaryDto implements SupplierSummaryDtoShape {
  @ApiProperty({
    description: 'Supplier ID',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Supplier name',
    example: 'Acme Corp',
  })
  name: string;
}

export class ProductLinksDto implements ProductLinksDtoShape {
  @ApiProperty({ description: 'Link to this product', type: HateoasLink })
  self: HateoasLink;

  @ApiProperty({
    description: 'Link to update this product',
    type: HateoasLink,
  })
  update: HateoasLink;

  @ApiProperty({
    description: 'Link to delete this product',
    type: HateoasLink,
  })
  delete: HateoasLink;

  @ApiProperty({
    description: 'Link to the product category',
    type: HateoasLink,
  })
  category: HateoasLink;
}

export class ProductResponseDto
  extends BaseAuditResponseDto
  implements ProductResponseDtoShape
{
  @ApiProperty({
    description: 'Unique identifier',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Product SKU',
    example: 'PROD-001',
  })
  sku: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Marine Pump',
  })
  name: string;

  @ApiProperty({
    description: 'Product description',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'Category ID',
    format: 'uuid',
  })
  category_id: string;

  @ApiProperty({
    description: 'Nested category information',
    type: CategorySummaryDto,
    nullable: true,
    required: false,
  })
  category?: CategorySummaryDto | null;

  @ApiProperty({
    description: 'Brand ID',
    format: 'uuid',
    nullable: true,
  })
  brand_id: string | null;

  @ApiProperty({
    description: 'Volume in milliliters',
    nullable: true,
  })
  volume_ml: number | null;

  @ApiProperty({
    description: 'Weight in kilograms',
    nullable: true,
  })
  weight_kg: number | null;

  @ApiProperty({
    description: 'Dimensions in cm (format: LxWxH)',
    nullable: true,
    example: '10x20x5',
  })
  dimensions_cm: string | null;

  @ApiProperty({
    description: 'Standard cost',
    nullable: true,
  })
  standard_cost: number | null;

  @ApiProperty({
    description: 'Standard price',
    nullable: true,
  })
  standard_price: number | null;

  @ApiProperty({
    description: 'Markup percentage',
    nullable: true,
  })
  markup_percentage: number | null;

  @ApiProperty({
    description: 'Reorder point threshold',
    example: 10,
  })
  reorder_point: number;

  @ApiProperty({
    description: 'Primary supplier ID',
    format: 'uuid',
    nullable: true,
  })
  primary_supplier_id: string | null;

  @ApiProperty({
    description: 'Nested supplier information',
    type: SupplierSummaryDto,
    nullable: true,
    required: false,
  })
  primary_supplier?: SupplierSummaryDto | null;

  @ApiProperty({
    description: 'Supplier SKU',
    nullable: true,
  })
  supplier_sku: string | null;

  @ApiProperty({
    description: 'Product barcode',
    nullable: true,
    example: '0641628607549',
  })
  barcode: string | null;

  @ApiProperty({
    description: 'Unit of measure',
    nullable: true,
    example: 'units',
  })
  unit: string | null;

  @ApiProperty({
    description: 'Whether the product is active',
  })
  is_active: boolean;

  @ApiProperty({
    description: 'Whether the product is perishable',
  })
  is_perishable: boolean;

  @ApiProperty({
    description: 'Additional notes',
    nullable: true,
  })
  notes: string | null;

  @ApiProperty({
    description: 'HATEOAS links',
    type: ProductLinksDto,
    required: false,
  })
  _links?: ProductLinksDto;
}
