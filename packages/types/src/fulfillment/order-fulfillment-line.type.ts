import type {
  OrderItemId,
  ProductId,
} from '../common/entity-id.type'

export interface OrderFulfillmentLine {
  readonly orderItemId: OrderItemId
  readonly productId: ProductId
  readonly quantity: number
  readonly quantityPicked: number
  readonly quantityPacked: number
}
