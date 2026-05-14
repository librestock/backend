import type { PaginationMeta } from '../common/pagination-meta.type'
import type { UserResponseDto } from './user-response.type'

export interface PaginatedUsersResponseDto {
  data: UserResponseDto[]
  meta: PaginationMeta
}
