import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ClientStatus } from '@librestock/types';
import type { ClientQueryDto as ClientQueryDtoShape } from '@librestock/types';

export class ClientQueryDto implements ClientQueryDtoShape {
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
    description: 'Search term for company_name and email',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  q?: string;

  @ApiProperty({
    description: 'Filter by account status',
    enum: ClientStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(ClientStatus)
  account_status?: ClientStatus;
}
