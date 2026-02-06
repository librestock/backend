import { ApiProperty } from '@nestjs/swagger';
import type {
  PaginatedInventoryResponseDto as PaginatedInventoryResponseDtoShape,
  PaginationMeta as PaginationMetaShape,
} from '@librestock/types';
import { InventoryResponseDto } from './inventory-response.dto';

export class PaginationMeta implements PaginationMetaShape {
  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Total number of pages' })
  total_pages: number;

  @ApiProperty({ description: 'Whether there is a next page' })
  has_next: boolean;

  @ApiProperty({ description: 'Whether there is a previous page' })
  has_previous: boolean;
}

export class PaginatedInventoryResponseDto
  implements PaginatedInventoryResponseDtoShape
{
  @ApiProperty({
    description: 'List of inventory items',
    type: [InventoryResponseDto],
  })
  data: InventoryResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMeta,
  })
  meta: PaginationMeta;
}
