import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AuditAction,
  AuditEntityType,
  type AuditLogQueryDto as AuditLogQueryDtoShape,
} from '@librestock/types';

export class AuditLogQueryDto implements AuditLogQueryDtoShape {
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
    description: 'Filter by entity type',
    enum: AuditEntityType,
    required: false,
  })
  @IsOptional()
  @IsEnum(AuditEntityType)
  entity_type?: AuditEntityType;

  @ApiProperty({
    description: 'Filter by entity ID',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  entity_id?: string;

  @ApiProperty({
    description: 'Filter by user ID',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiProperty({
    description: 'Filter by action',
    enum: AuditAction,
    required: false,
  })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiProperty({
    description: 'Filter from date (ISO 8601)',
    format: 'date-time',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  from_date?: string;

  @ApiProperty({
    description: 'Filter to date (ISO 8601)',
    format: 'date-time',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  to_date?: string;
}
