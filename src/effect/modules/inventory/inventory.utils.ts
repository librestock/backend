import { Effect } from 'effect';
import type { InventoryResponseDto } from '@librestock/types/inventory';
import type { Inventory } from './entities/inventory.entity';
import { InventoryInfrastructureError } from './inventory.errors';

export const inventoryTryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new InventoryInfrastructureError({
        action,
        cause,
        message: `Inventory service failed to ${action}`,
      }),
  });

export function toInventoryResponseDto(
  inventory: Inventory,
): InventoryResponseDto {
  return {
    id: inventory.id,
    product_id: inventory.product_id,
    product: inventory.product
      ? {
          id: inventory.product.id,
          sku: inventory.product.sku,
          name: inventory.product.name,
          unit: inventory.product.unit,
        }
      : null,
    location_id: inventory.location_id,
    location: inventory.location
      ? {
          id: inventory.location.id,
          name: inventory.location.name,
          type: inventory.location.type,
        }
      : null,
    area_id: inventory.area_id,
    area: inventory.area
      ? {
          id: inventory.area.id,
          name: inventory.area.name,
          code: inventory.area.code,
        }
      : null,
    quantity: inventory.quantity,
    batchNumber: inventory.batchNumber,
    expiry_date: inventory.expiry_date,
    cost_per_unit: inventory.cost_per_unit
      ? Number(inventory.cost_per_unit)
      : null,
    received_date: inventory.received_date,
    created_at: inventory.created_at,
    updated_at: inventory.updated_at,
  };
}
