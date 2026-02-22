import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEmail,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { UpdateSupplierDto as UpdateSupplierDtoShape } from '@librestock/types';

export class UpdateSupplierDto implements UpdateSupplierDtoShape {
  @ApiProperty({
    description: 'Supplier name',
    type: String,
    minLength: 1,
    maxLength: 200,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

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
    description: 'Email address',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

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
    description: 'Physical address',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'Website URL',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  website?: string;

  @ApiProperty({
    description: 'Additional notes',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Whether the supplier is active',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
