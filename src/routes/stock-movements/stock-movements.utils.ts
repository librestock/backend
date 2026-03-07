import type { StockMovementResponseDto } from './dto';
import type { StockMovement } from './entities/stock-movement.entity';
import {
  asLocationId,
  asOrderId,
  asProductId,
  asStockMovementId,
  asUserId,
} from '@librestock/types/common'

export function toStockMovementResponseDto(
  sm: StockMovement,
): StockMovementResponseDto {
  return {
    id: asStockMovementId(sm.id),
    product_id: asProductId(sm.product_id),
    product: sm.product
      ? { id: asProductId(sm.product.id), name: sm.product.name, sku: sm.product.sku }
      : null,
    from_location_id: sm.from_location_id ? asLocationId(sm.from_location_id) : null,
    from_location: sm.fromLocation
      ? { id: asLocationId(sm.fromLocation.id), name: sm.fromLocation.name }
      : null,
    to_location_id: sm.to_location_id ? asLocationId(sm.to_location_id) : null,
    to_location: sm.toLocation
      ? { id: asLocationId(sm.toLocation.id), name: sm.toLocation.name }
      : null,
    quantity: sm.quantity,
    reason: sm.reason,
    order_id: sm.order_id ? asOrderId(sm.order_id) : null,
    reference_number: sm.reference_number,
    cost_per_unit: sm.cost_per_unit,
    user_id: asUserId(sm.user_id),
    notes: sm.notes,
    created_at: sm.created_at,
  };
}
