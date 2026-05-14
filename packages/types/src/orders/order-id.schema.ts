import { Schema } from 'effect'

export const OrderIdSchema = Schema.UUID.annotations({
  identifier: 'OrderId',
})
