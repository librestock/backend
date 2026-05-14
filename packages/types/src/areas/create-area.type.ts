export interface CreateAreaDto {
  location_id: string
  parent_id?: string
  name: string
  code?: string
  description?: string
  is_active?: boolean
}
