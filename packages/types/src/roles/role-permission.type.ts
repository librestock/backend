import type { Permission } from '../auth/permission.enum'
import type { Resource } from '../auth/resource.enum'

export interface RolePermissionDto {
  resource: Resource
  permission: Permission
}
