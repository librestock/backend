import type { Permission, Resource } from '@librestock/types/auth'
import type { RoleResponseDto } from './dto';
import type { RoleEntity } from './entities/role.entity';

export function toRoleResponseDto(entity: RoleEntity): RoleResponseDto {
  return {
    id: entity.id,
    name: entity.name,
    description: entity.description,
    is_system: entity.is_system,
    permissions: (entity.permissions ?? []).map((p) => ({
      resource: p.resource as Resource,
      permission: p.permission as Permission,
    })),
    created_at: entity.created_at,
    updated_at: entity.updated_at,
  };
}
