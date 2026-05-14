import type { PaginationMeta } from '../common/pagination-meta.type'
import type { LocationResponseDto } from './location-response.type'

export interface PaginatedLocationsResponseDto {
  data: LocationResponseDto[]
  meta: PaginationMeta
}
