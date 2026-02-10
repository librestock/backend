import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { UpdateRoleDto as UpdateRoleDtoShape } from '@librestock/types';
import { RolePermissionDto } from './role-permission.dto';

export class UpdateRoleDto implements UpdateRoleDtoShape {
  @ApiPropertyOptional({ description: 'Role name', example: 'Manager' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Role description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Permissions to assign',
    type: [RolePermissionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolePermissionDto)
  permissions?: RolePermissionDto[];
}
