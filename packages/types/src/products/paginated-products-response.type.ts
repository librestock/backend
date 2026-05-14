import type { PaginationMeta } from '../common/pagination-meta.type'
import type { ProductResponseDto } from './product-response.type'

export interface PaginatedProductsResponseDto {
  data: ProductResponseDto[]
  meta: PaginationMeta
}
