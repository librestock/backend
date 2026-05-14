import type { OrderStatus } from '../orders/order-status.enum'
import type { OrderId } from '../common/entity-id.type'
import type { OrderFulfillmentLine } from './order-fulfillment-line.type'

export interface OrderFulfillmentView {
  readonly orderId: OrderId
  readonly status: OrderStatus
  readonly confirmedAt: Date | null
  readonly shippedAt: Date | null
  readonly deliveredAt: Date | null
  readonly items: ReadonlyArray<OrderFulfillmentLine>
}
