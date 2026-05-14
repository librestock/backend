import type { SortOrder } from '../common/sort-order.enum'
import type { LocationSortField } from './location-sort-field.enum'
import type { LocationType } from './location-type.enum'

export interface LocationQueryDto {
  page?: number
  limit?: number
  search?: string
  type?: LocationType
  is_active?: boolean
  sort_by?: LocationSortField
  sort_order?: SortOrder
}
