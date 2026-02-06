import { ApiProperty } from '@nestjs/swagger';

/**
 * Base response DTO with timestamp fields
 */
export abstract class BaseResponseDto {
  @ApiProperty({
    description: 'Creation timestamp',
    format: 'date-time',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    format: 'date-time',
  })
  updated_at: Date;
}

/**
 * Base response DTO with timestamp and audit fields
 * Use this for entities that have soft delete and audit tracking
 */
export abstract class BaseAuditResponseDto extends BaseResponseDto {
  @ApiProperty({
    description: 'Deletion timestamp (for soft-deleted records)',
    format: 'date-time',
    nullable: true,
    required: false,
  })
  deleted_at?: Date | null;

  @ApiProperty({
    description: 'User ID who created the record',
    nullable: true,
    required: false,
  })
  created_by?: string | null;

  @ApiProperty({
    description: 'User ID who last updated the record',
    nullable: true,
    required: false,
  })
  updated_by?: string | null;

  @ApiProperty({
    description: 'User ID who deleted the record',
    nullable: true,
    required: false,
  })
  deleted_by?: string | null;
}
