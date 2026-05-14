import type { RolePermissionDto } from './role-permission.type'

export interface CreateRoleDto {
  name: string
  description?: string
  permissions: RolePermissionDto[]
}
