import type {
  InventoryId,
  OrderItemId,
} from '../common/entity-id.type'

export interface PickInput {
  readonly orderItemId: OrderItemId
  readonly inventoryId: InventoryId
  readonly quantity: number
}
