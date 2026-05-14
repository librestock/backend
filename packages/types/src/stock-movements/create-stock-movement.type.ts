import type { StockMovementReason } from './stock-movement-reason.enum'
import type {
  LocationId,
  OrderId,
  ProductId,
} from '../common/entity-id.type'

export interface CreateStockMovementDto {
  product_id: ProductId
  from_location_id?: LocationId
  to_location_id?: LocationId
  quantity: number
  reason: StockMovementReason
  order_id?: OrderId
  reference_number?: string
  cost_per_unit?: number
  notes?: string
}
