import { ApiProperty } from '@nestjs/swagger';
import {
  AuditAction,
  AuditEntityType,
  type AuditChanges,
  type AuditLogResponseDto as AuditLogResponseDtoShape,
} from '@librestock/types';

export class AuditLogResponseDto implements AuditLogResponseDtoShape {
  @ApiProperty({
    description: 'Unique identifier',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'User ID who performed the action',
    format: 'uuid',
    nullable: true,
  })
  user_id: string | null;

  @ApiProperty({
    description: 'Action performed',
    enum: AuditAction,
  })
  action: AuditAction;

  @ApiProperty({
    description: 'Type of entity affected',
    enum: AuditEntityType,
  })
  entity_type: AuditEntityType;

  @ApiProperty({
    description: 'ID of the affected entity',
    format: 'uuid',
  })
  entity_id: string;

  @ApiProperty({
    description: 'Changes made (before/after)',
    nullable: true,
    example: { before: { name: 'Old Name' }, after: { name: 'New Name' } },
  })
  changes: AuditChanges | null;

  @ApiProperty({
    description: 'IP address of the requester',
    nullable: true,
  })
  ip_address: string | null;

  @ApiProperty({
    description: 'User agent of the requester',
    nullable: true,
  })
  user_agent: string | null;

  @ApiProperty({
    description: 'Creation timestamp',
    format: 'date-time',
  })
  created_at: Date;
}
