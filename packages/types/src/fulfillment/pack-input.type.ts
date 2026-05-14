import type { OrderItemId } from '../common/entity-id.type'

export interface PackInput {
  readonly orderItemId: OrderItemId
  readonly quantity: number
}
