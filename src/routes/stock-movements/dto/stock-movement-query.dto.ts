import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  StockMovementReason,
  type StockMovementQueryDto as StockMovementQueryDtoShape,
} from '@librestock/types';

export class StockMovementQueryDto implements StockMovementQueryDtoShape {
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
    description: 'Filter by product ID',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  product_id?: string;

  @ApiProperty({
    description: 'Filter by location ID (matches from or to)',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  location_id?: string;

  @ApiProperty({
    description: 'Filter by reason',
    enum: StockMovementReason,
    required: false,
  })
  @IsOptional()
  @IsEnum(StockMovementReason)
  reason?: StockMovementReason;

  @ApiProperty({
    description: 'Filter by start date (ISO 8601)',
    required: false,
  })
  @IsOptional()
  @IsString()
  date_from?: string;

  @ApiProperty({
    description: 'Filter by end date (ISO 8601)',
    required: false,
  })
  @IsOptional()
  @IsString()
  date_to?: string;
}
