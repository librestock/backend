import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, Matches, IsUrl, ValidateIf } from 'class-validator';
import type { UpdateBrandingDto as UpdateBrandingDtoShape } from '@librestock/types';

export class UpdateBrandingDto implements UpdateBrandingDtoShape {
  @ApiPropertyOptional({ description: 'Application name', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  app_name?: string;

  @ApiPropertyOptional({ description: 'Application tagline', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  tagline?: string;

  @ApiPropertyOptional({ description: 'Logo URL (relative or absolute)', maxLength: 500, type: 'string', nullable: true })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsUrl({ require_tld: false }, { message: 'logo_url must be a valid URL' })
  @MaxLength(500)
  logo_url?: string | null;

  @ApiPropertyOptional({ description: 'Favicon URL (relative or absolute)', maxLength: 500, type: 'string', nullable: true })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsUrl({ require_tld: false }, { message: 'favicon_url must be a valid URL' })
  @MaxLength(500)
  favicon_url?: string | null;

  @ApiPropertyOptional({ description: 'Primary brand color (hex)', example: '#3b82f6' })
  @IsOptional()
  @IsString()
  @Matches(/^#[\dA-Fa-f]{6}$/, { message: 'Primary color must be a valid hex color (e.g., #3b82f6)' })
  primary_color?: string;
}
