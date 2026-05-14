import type { RolePermissionDto } from './role-permission.type'

export interface RoleResponseDto {
  id: string
  name: string
  description: string | null
  is_system: boolean
  permissions: RolePermissionDto[]
  created_at: string | Date
  updated_at: string | Date
}
