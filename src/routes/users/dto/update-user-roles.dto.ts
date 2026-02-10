import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';
import type { UpdateUserRolesDto as UpdateUserRolesDtoShape } from '@librestock/types';

export class UpdateUserRolesDto implements UpdateUserRolesDtoShape {
  @ApiProperty({
    description: 'Role IDs to assign to the user',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  roles: string[];
}
