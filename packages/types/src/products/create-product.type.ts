export interface CreateProductDto {
  sku: string
  name: string
  description?: string | null
  category_id: string
  volume_ml?: number | null
  weight_kg?: number | null
  dimensions_cm?: string | null
  standard_cost?: number | null
  standard_price?: number | null
  markup_percentage?: number | null
  reorder_point: number
  primary_supplier_id?: string | null
  supplier_sku?: string | null
  barcode?: string | null
  unit?: string | null
  is_active: boolean
  is_perishable: boolean
  notes?: string | null
}
