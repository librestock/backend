import { ApiProperty } from '@nestjs/swagger';
import type {
  PaginatedAuditLogsResponseDto as PaginatedAuditLogsResponseDtoShape,
  PaginationMeta as PaginationMetaShape,
} from '@librestock/types';
import { AuditLogResponseDto } from './audit-log-response.dto';

export class PaginationMetaDto implements PaginationMetaShape {
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

export class PaginatedAuditLogsResponseDto
  implements PaginatedAuditLogsResponseDtoShape
{
  @ApiProperty({
    description: 'Array of audit log entries',
    type: [AuditLogResponseDto],
  })
  data: AuditLogResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}
