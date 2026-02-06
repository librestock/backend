import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum } from 'class-validator';
import { UserRole, type UpdateUserRolesDto as UpdateUserRolesDtoShape } from '@librestock/types';

export class UpdateUserRolesDto implements UpdateUserRolesDtoShape {
  @ApiProperty({
    description: 'Roles to assign to the user',
    enum: UserRole,
    isArray: true,
    example: [UserRole.ADMIN],
  })
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles: UserRole[];
}
