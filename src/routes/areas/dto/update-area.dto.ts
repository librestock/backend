import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import type { UpdateAreaDto as UpdateAreaDtoShape } from '@librestock/types';

export class UpdateAreaDto implements UpdateAreaDtoShape {
  @ApiProperty({
    description: 'Parent area ID (for nested areas)',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  parent_id?: string | null;

  @ApiProperty({ description: 'Area name', example: 'Zone A', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    description: 'Area code (short identifier)',
    example: 'A1',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiProperty({
    description: 'Area description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Whether the area is active',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
