import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import {
  Resource,
  Permission,
  type RolePermissionDto as RolePermissionDtoShape,
} from '@librestock/types';

export class RolePermissionDto implements RolePermissionDtoShape {
  @ApiProperty({ description: 'Resource', enum: Resource })
  @IsEnum(Resource)
  resource: Resource;

  @ApiProperty({ description: 'Permission', enum: Permission })
  @IsEnum(Permission)
  permission: Permission;
}
