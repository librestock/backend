import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { RoleResponseDto as RoleResponseDtoShape } from '@librestock/types';
import { RolePermissionDto } from './role-permission.dto';

export class RoleResponseDto implements RoleResponseDtoShape {
  @ApiProperty({ description: 'Role ID', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Role name' })
  name: string;

  @ApiPropertyOptional({ description: 'Role description', nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Whether this is a system role' })
  is_system: boolean;

  @ApiProperty({ description: 'Role permissions', type: [RolePermissionDto] })
  permissions: RolePermissionDto[];

  @ApiProperty({ description: 'Creation timestamp' })
  created_at: string | Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updated_at: string | Date;
}
