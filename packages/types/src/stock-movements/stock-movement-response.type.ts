import type { StockMovementReason } from './stock-movement-reason.enum'
import type {
  LocationId,
  OrderId,
  ProductId,
  StockMovementId,
  UserId,
} from '../common/entity-id.type'

export interface StockMovementLocationSummary {
  id: LocationId
  name: string
}

export interface StockMovementProductSummary {
  id: ProductId
  name: string
  sku: string
}

export interface StockMovementResponseDto {
  id: StockMovementId
  product_id: ProductId
  product: StockMovementProductSummary | null
  from_location_id: LocationId | null
  from_location: StockMovementLocationSummary | null
  to_location_id: LocationId | null
  to_location: StockMovementLocationSummary | null
  quantity: number
  reason: StockMovementReason
  order_id: OrderId | null
  reference_number: string | null
  cost_per_unit: number | null
  user_id: UserId
  notes: string | null
  created_at: string | Date
}
