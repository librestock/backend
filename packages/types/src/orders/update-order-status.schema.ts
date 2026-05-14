import { Schema } from 'effect'
import { OrderStatus } from './order-status.enum'

const OrderStatusValues = [
  OrderStatus.DRAFT,
  OrderStatus.CONFIRMED,
  OrderStatus.SOURCING,
  OrderStatus.PICKING,
  OrderStatus.PACKED,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
  OrderStatus.ON_HOLD,
] as const

export const OrderStatusSchema = Schema.Literal(...OrderStatusValues)

export const UpdateOrderStatusSchema = Schema.Struct({
  status: OrderStatusSchema,
}).annotations({
  identifier: 'UpdateOrderStatus',
})

export type UpdateOrderStatus = Schema.Schema.Type<
  typeof UpdateOrderStatusSchema
>
