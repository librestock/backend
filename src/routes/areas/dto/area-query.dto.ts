import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import type { AreaQueryDto as AreaQueryDtoShape } from '@librestock/types';

export class AreaQueryDto implements AreaQueryDtoShape {
  @ApiProperty({
    description: 'Filter by location ID',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  location_id?: string;

  @ApiProperty({
    description: 'Filter by parent area ID',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  parent_id?: string;

  @ApiProperty({
    description: 'Filter root areas only (no parent)',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  root_only?: boolean;

  @ApiProperty({
    description: 'Filter by active status',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({
    description: 'Include children in response (hierarchical)',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  include_children?: boolean;
}
