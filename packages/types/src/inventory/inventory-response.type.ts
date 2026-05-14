import type { BaseResponseDto } from '../common/base-response.type'
import type {
  AreaId,
  InventoryId,
  LocationId,
  ProductId,
} from '../common/entity-id.type'
import type { AreaSummaryDto } from './area-summary.type'
import type { LocationSummaryDto } from './location-summary.type'
import type { ProductSummaryDto } from './product-summary.type'

export interface InventoryResponseDto extends BaseResponseDto {
  id: InventoryId
  product_id: ProductId
  product: ProductSummaryDto | null
  location_id: LocationId
  location: LocationSummaryDto | null
  area_id: AreaId | null
  area: AreaSummaryDto | null
  quantity: number
  batchNumber: string
  expiry_date: string | Date | null
  cost_per_unit: number | null
  received_date: string | Date | null
}
