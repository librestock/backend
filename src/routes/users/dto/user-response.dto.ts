import { ApiProperty } from '@nestjs/swagger';
import type { UserResponseDto as UserResponseDtoShape } from '@librestock/types/users'

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
  ban_reason: string | null;

  @ApiProperty({ description: 'Ban expiry date', nullable: true })
  ban_expires: string | Date | null;

  @ApiProperty({ description: 'Account creation date' })
  created_at: string | Date;
}
