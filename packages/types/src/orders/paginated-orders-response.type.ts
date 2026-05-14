import type { PaginationMeta } from '../common/pagination-meta.type'
import type { OrderResponseDto } from './order-response.type'

export interface PaginatedOrdersResponseDto {
  data: OrderResponseDto[]
  meta: PaginationMeta
}
