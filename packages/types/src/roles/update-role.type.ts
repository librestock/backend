import type { RolePermissionDto } from './role-permission.type'

export interface UpdateRoleDto {
  name?: string
  description?: string
  permissions?: RolePermissionDto[]
}
