import type { BaseResponseDto } from '../common/base-response.type'

export interface AreaResponseDto extends BaseResponseDto {
  id: string
  location_id: string
  parent_id: string | null
  name: string
  code: string
  description: string
  is_active: boolean
  children?: AreaResponseDto[]
}
