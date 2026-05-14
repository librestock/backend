import { Schema } from 'effect'
import { LimitSchema, PageSchema } from '../common/schema-helpers.schema'
import { StockMovementReason } from './stock-movement-reason.enum'

const StockMovementReasonValues = [
  StockMovementReason.PURCHASE_RECEIVE,
  StockMovementReason.SALE,
  StockMovementReason.WASTE,
  StockMovementReason.DAMAGED,
  StockMovementReason.EXPIRED,
  StockMovementReason.COUNT_CORRECTION,
  StockMovementReason.RETURN_FROM_CLIENT,
  StockMovementReason.RETURN_TO_SUPPLIER,
  StockMovementReason.INTERNAL_TRANSFER,
] as const;

export const StockMovementIdSchema = Schema.UUID.annotations({
  identifier: 'StockMovementId',
});

export const StockMovementQuerySchema = Schema.Struct({
  page: Schema.optionalWith(PageSchema, { default: () => 1 }),
  limit: Schema.optionalWith(LimitSchema, { default: () => 20 }),
  product_id: Schema.optional(Schema.UUID),
  location_id: Schema.optional(Schema.UUID),
  reason: Schema.optional(Schema.Literal(...StockMovementReasonValues)),
  date_from: Schema.optional(Schema.DateFromString),
  date_to: Schema.optional(Schema.DateFromString),
}).annotations({ identifier: 'StockMovementQuery' });
