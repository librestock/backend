import { ApiProperty } from '@nestjs/swagger';
import type { UserResponseDto as UserResponseDtoShape } from '@librestock/types';

export class UserResponseDto implements UserResponseDtoShape {
  @ApiProperty({ description: 'User ID', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'User name' })
  name: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiProperty({ description: 'User avatar URL', nullable: true })
  image: string | null;

  @ApiProperty({ description: 'Assigned role names', type: [String] })
  roles: string[];

  @ApiProperty({ description: 'Whether user is banned' })
  banned: boolean;

  @ApiProperty({ description: 'Ban reason', nullable: true })
  banReason: string | null;

  @ApiProperty({ description: 'Ban expiry date', nullable: true })
  banExpires: string | Date | null;

  @ApiProperty({ description: 'Account creation date' })
  createdAt: string | Date;
}
