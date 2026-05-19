import type { AuditAction } from './audit-action.enum'
import type { AuditChanges } from './audit-changes.type'
import type { AuditEntityType } from './audit-entity-type.enum'

export interface AuditLogResponseDto {
  id: string
  user_id: string | null
  user_name: string | null
  action: AuditAction
  entity_type: AuditEntityType
  entity_id: string
  changes: AuditChanges | null
  user_agent: string | null
  created_at: string | Date
}
