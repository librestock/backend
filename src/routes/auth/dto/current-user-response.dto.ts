import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Permission, Resource } from '@librestock/types';
import type { CurrentUserResponseDto as CurrentUserResponseDtoShape } from '@librestock/types';

export class CurrentUserResponseDto implements CurrentUserResponseDtoShape {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User display name' })
  name: string;

  @ApiProperty({ description: 'User email address' })
  email: string;

  @ApiPropertyOptional({ description: 'User avatar URL' })
  image?: string;

  @ApiProperty({
    description: 'User role names',
    type: [String],
    example: ['Admin'],
  })
  roles: string[];

  @ApiProperty({
    description: 'Resolved permissions by resource',
    example: { dashboard: ['read'], settings: ['read', 'write'] },
  })
  permissions: Partial<Record<Resource, Permission[]>>;
}
