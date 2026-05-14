import type { BaseAuditResponseDto } from '../common/base-response.type'
import type { CategorySummaryDto } from './category-summary.type'
import type { ProductLinksDto } from './product-links.type'
import type { SupplierSummaryDto } from './supplier-summary.type'

export interface ProductResponseDto extends BaseAuditResponseDto {
  id: string
  sku: string
  name: string
  description: string | null
  category_id: string
  category?: CategorySummaryDto | null
  volume_ml: number | null
  weight_kg: number | null
  dimensions_cm: string | null
  standard_cost: number | null
  standard_price: number | null
  markup_percentage: number | null
  reorder_point: number
  primary_supplier_id: string | null
  primary_supplier?: SupplierSummaryDto | null
  supplier_sku: string | null
  barcode: string | null
  unit: string | null
  is_active: boolean
  is_perishable: boolean
  notes: string | null
  _links?: ProductLinksDto
}
