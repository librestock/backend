import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { CreateRoleDto as CreateRoleDtoShape } from '@librestock/types';
import { RolePermissionDto } from './role-permission.dto';

export class CreateRoleDto implements CreateRoleDtoShape {
  @ApiProperty({ description: 'Role name', example: 'Manager' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ description: 'Role description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Permissions to assign',
    type: [RolePermissionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolePermissionDto)
  permissions: RolePermissionDto[];
}
