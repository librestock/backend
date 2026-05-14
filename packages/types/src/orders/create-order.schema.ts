import { Schema } from 'effect'
import {
  NonNegativeNumberSchema,
  PositiveIntSchema,
} from '../common/schema-helpers.schema'

export const CreateOrderItemSchema = Schema.Struct({
  product_id: Schema.UUID,
  quantity: PositiveIntSchema,
  unit_price: NonNegativeNumberSchema,
  notes: Schema.optional(Schema.NullOr(Schema.String)),
}).annotations({
  identifier: 'CreateOrderItem',
})

export const CreateOrderSchema = Schema.Struct({
  client_id: Schema.UUID,
  delivery_address: Schema.Trim,
  delivery_deadline: Schema.optional(Schema.NullOr(Schema.DateFromString)),
  yacht_name: Schema.optional(
    Schema.NullOr(Schema.Trim.pipe(Schema.maxLength(200))),
  ),
  special_instructions: Schema.optional(Schema.NullOr(Schema.String)),
  items: Schema.Array(CreateOrderItemSchema).pipe(Schema.minItems(1)),
}).annotations({
  identifier: 'CreateOrder',
})

export type CreateOrderItem = Schema.Schema.Type<typeof CreateOrderItemSchema>
export type CreateOrder = Schema.Schema.Type<typeof CreateOrderSchema>
