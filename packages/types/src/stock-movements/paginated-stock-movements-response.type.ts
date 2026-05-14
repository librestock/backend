import type { PaginationMeta } from '../common/pagination-meta.type'
import type { StockMovementResponseDto } from './stock-movement-response.type'

export interface PaginatedStockMovementsResponseDto {
  data: StockMovementResponseDto[]
  meta: PaginationMeta
}
