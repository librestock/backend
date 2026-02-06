import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { CreateCategoryDto as CreateCategoryDtoShape } from '@librestock/types';

export class CreateCategoryDto implements CreateCategoryDtoShape {
  @ApiProperty({
    description: 'Category name',
    example: 'Electronics',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

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
