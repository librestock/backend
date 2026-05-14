import type { PaginationMeta } from '../common/pagination-meta.type'
import type { AuditLogResponseDto } from './audit-log-response.type'

export interface PaginatedAuditLogsResponseDto {
  data: AuditLogResponseDto[]
  meta: PaginationMeta
}
