import { Effect } from 'effect';
import type { StockMovementResponseDto } from './dto';
import type { StockMovement } from './entities/stock-movement.entity';
import { StockMovementsInfrastructureError } from './stock-movements.errors';

export const stockMovementTryAsync = <A>(
  action: string,
  run: () => Promise<A>,
) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new StockMovementsInfrastructureError({
        action,
        cause,
        message: `Stock movements service failed to ${action}`,
      }),
  });

export function toStockMovementResponseDto(
  sm: StockMovement,
): StockMovementResponseDto {
  return {
    id: sm.id,
    product_id: sm.product_id,
    product: sm.product
      ? { id: sm.product.id, name: sm.product.name, sku: sm.product.sku }
      : null,
    from_location_id: sm.from_location_id,
    from_location: sm.fromLocation
      ? { id: sm.fromLocation.id, name: sm.fromLocation.name }
      : null,
    to_location_id: sm.to_location_id,
    to_location: sm.toLocation
      ? { id: sm.toLocation.id, name: sm.toLocation.name }
      : null,
    quantity: sm.quantity,
    reason: sm.reason,
    order_id: sm.order_id,
    reference_number: sm.reference_number,
    cost_per_unit: sm.cost_per_unit,
    user_id: sm.user_id,
    notes: sm.notes,
    created_at: sm.created_at,
  };
}
