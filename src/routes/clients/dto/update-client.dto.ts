import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsNumber,
  Min,
  MaxLength,
  Transform,
} from 'class-validator';
import { ClientStatus } from '@librestock/types';
import type { UpdateClientDto as UpdateClientDtoShape } from '@librestock/types';

export class UpdateClientDto implements UpdateClientDtoShape {
  @ApiProperty({
    description: 'Company name',
    maxLength: 200,
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  @MaxLength(200)
  company_name?: string;

  @ApiProperty({
    description: 'Contact person',
    maxLength: 200,
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  @MaxLength(200)
  contact_person?: string;

  @ApiProperty({ description: 'Email address', required: false })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email?: string;

  @ApiProperty({ description: 'Yacht name', required: false, maxLength: 200 })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  @MaxLength(200)
  yacht_name?: string;

  @ApiProperty({ description: 'Phone number', required: false, maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({ description: 'Billing address', required: false })
  @IsOptional()
  @IsString()
  billing_address?: string;

  @ApiProperty({ description: 'Default delivery address', required: false })
  @IsOptional()
  @IsString()
  default_delivery_address?: string;

  @ApiProperty({
    description: 'Account status',
    enum: ClientStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(ClientStatus)
  account_status?: ClientStatus;

  @ApiProperty({
    description: 'Payment terms',
    required: false,
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  payment_terms?: string;

  @ApiProperty({
    description: 'Credit limit',
    type: 'number',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  credit_limit?: number;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
