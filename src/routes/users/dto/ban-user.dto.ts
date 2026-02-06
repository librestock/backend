import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';
import { type BanUserDto as BanUserDtoShape } from '@librestock/types';

export class BanUserDto implements BanUserDtoShape {
  @ApiProperty({ description: 'Reason for banning', required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({
    description: 'Ban expiry date (ISO 8601)',
    format: 'date-time',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
