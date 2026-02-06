import { ApiProperty } from '@nestjs/swagger';
import type {
  PaginatedLocationsResponseDto as PaginatedLocationsResponseDtoShape,
  PaginationMeta as PaginationMetaShape,
} from '@librestock/types';
import { LocationResponseDto } from './location-response.dto';

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

export class PaginatedLocationsResponseDto
  implements PaginatedLocationsResponseDtoShape
{
  @ApiProperty({
    description: 'List of locations',
    type: [LocationResponseDto],
  })
  data: LocationResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMeta,
  })
  meta: PaginationMeta;
}
