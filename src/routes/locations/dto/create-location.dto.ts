import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { CreateLocationDto as CreateLocationDtoShape } from '@librestock/types';
import { LocationType } from '@librestock/types';

export class CreateLocationDto implements CreateLocationDtoShape {
  @ApiProperty({
    description: 'Location name',
    example: 'Main Warehouse',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: 'Location type',
    enum: LocationType,
    example: LocationType.WAREHOUSE,
  })
  @IsEnum(LocationType)
  type: LocationType;

  @ApiProperty({
    description: 'Physical address',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'Contact person name',
    type: String,
    maxLength: 200,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contact_person?: string;

  @ApiProperty({
    description: 'Phone number',
    type: String,
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({
    description: 'Whether the location is active',
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
