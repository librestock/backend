import { Schema } from 'effect'
import { NullableMaxLength200String } from '../common/schema-helpers.schema'

export const UpdateOrderSchema = Schema.Struct({
  delivery_address: Schema.optional(Schema.Trim),
  delivery_deadline: Schema.optional(Schema.NullOr(Schema.DateFromString)),
  yacht_name: Schema.optional(NullableMaxLength200String),
  special_instructions: Schema.optional(Schema.NullOr(Schema.String)),
  assigned_to: Schema.optional(Schema.NullOr(Schema.UUID)),
}).annotations({
  identifier: 'UpdateOrder',
})

export type UpdateOrder = Schema.Schema.Type<typeof UpdateOrderSchema>
