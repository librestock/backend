import type { PaginationMeta } from '../common/pagination-meta.type'
import type { ClientResponseDto } from './client-response.type'

export interface PaginatedClientsResponseDto {
  data: ClientResponseDto[]
  meta: PaginationMeta
}
