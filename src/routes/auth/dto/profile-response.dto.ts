import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ProfileResponseDto as ProfileResponseDtoShape } from '@librestock/types';

export class ProfileResponseDto implements ProfileResponseDtoShape {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User display name' })
  name: string;

  @ApiProperty({ description: 'User email address' })
  email: string;

  @ApiPropertyOptional({ description: 'User avatar URL' })
  image?: string;

  @ApiProperty({ description: 'Account creation timestamp', format: 'date-time' })
  createdAt: string;

  @ApiProperty({ description: 'Account last updated timestamp', format: 'date-time' })
  updatedAt: string;
}
