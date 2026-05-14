export interface CreateCategoryDto {
  name: string
  parent_id?: string | null
  description?: string | null
}
