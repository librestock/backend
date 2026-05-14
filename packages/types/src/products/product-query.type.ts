import type { SortOrder } from '../common/sort-order.enum'
import type { ProductSortField } from './product-sort-field.enum'

export interface ProductQueryDto {
  page?: number
  limit?: number
  search?: string
  category_id?: string
  primary_supplier_id?: string
  is_active?: boolean
  is_perishable?: boolean
  min_price?: number
  max_price?: number
  include_deleted?: boolean
  sort_by?: ProductSortField
  sort_order?: SortOrder
}
