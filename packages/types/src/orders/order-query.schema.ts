import { Schema } from 'effect'
import { OrderStatus } from './order-status.enum'
import {
  LimitSchema,
  PageSchema,
} from '../common/schema-helpers.schema'

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

export const OrderQuerySchema = Schema.Struct({
  page: Schema.optionalWith(PageSchema, { default: () => 1 }),
  limit: Schema.optionalWith(LimitSchema, { default: () => 20 }),
  q: Schema.optional(Schema.Trim),
  client_id: Schema.optional(Schema.UUID),
  status: Schema.optional(Schema.Literal(...OrderStatusValues)),
  date_from: Schema.optional(Schema.DateFromString),
  date_to: Schema.optional(Schema.DateFromString),
}).annotations({
  identifier: 'OrderQuery',
})

export type OrderQuery = Schema.Schema.Type<typeof OrderQuerySchema>
