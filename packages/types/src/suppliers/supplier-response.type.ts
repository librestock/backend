import type { BaseResponseDto } from '../common/base-response.type'

export interface SupplierResponseDto extends BaseResponseDto {
  id: string
  name: string
  contact_person: string | null
  email: string | null
  phone: string | null
  address: string | null
  website: string | null
  notes: string | null
  is_active: boolean
}
