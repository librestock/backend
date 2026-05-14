import type { AuditAction } from './audit-action.enum'
import type { AuditEntityType } from './audit-entity-type.enum'

export interface AuditLogQueryDto {
  page?: number
  limit?: number
  entity_type?: AuditEntityType
  entity_id?: string
  user_id?: string
  action?: AuditAction
  from_date?: string
  to_date?: string
}
