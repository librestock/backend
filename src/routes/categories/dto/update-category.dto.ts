import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { UpdateCategoryDto as UpdateCategoryDtoShape } from '@librestock/types';

export class UpdateCategoryDto implements UpdateCategoryDtoShape {
  @ApiProperty({
    description: 'Category name',
    type: String,
    minLength: 1,
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    description: 'Parent category ID',
    type: String,
    format: 'uuid',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsUUID()
  parent_id?: string | null;

  @ApiProperty({
    description: 'Category description',
    type: String,
    maxLength: 500,
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;
}
