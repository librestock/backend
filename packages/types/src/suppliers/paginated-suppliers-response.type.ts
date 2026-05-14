import type { PaginationMeta } from '../common/pagination-meta.type'
import type { SupplierResponseDto } from './supplier-response.type'

export interface PaginatedSuppliersResponseDto {
  data: SupplierResponseDto[]
  meta: PaginationMeta
}
