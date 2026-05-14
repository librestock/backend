import type { PaginationMeta } from '../common/pagination-meta.type'
import type { InventoryResponseDto } from './inventory-response.type'

export interface PaginatedInventoryResponseDto {
  data: InventoryResponseDto[]
  meta: PaginationMeta
}
