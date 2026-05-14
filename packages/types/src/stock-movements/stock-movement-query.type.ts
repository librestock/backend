import type { StockMovementReason } from './stock-movement-reason.enum'
import type { LocationId, ProductId } from '../common/entity-id.type'

export interface StockMovementQueryDto {
  page?: number
  limit?: number
  product_id?: ProductId
  location_id?: LocationId
  reason?: StockMovementReason
  date_from?: Date
  date_to?: Date
}
