import { Schema } from 'effect';
import { LimitSchema, PageSchema } from '@librestock/types/common';
import { StockMovementReason } from '@librestock/types/stock-movements';

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

const NullableDateString = Schema.DateFromString;

export const StockMovementIdSchema = Schema.UUID.annotations({
  identifier: 'StockMovementId',
});

export const StockMovementQuerySchema = Schema.Struct({
  page: Schema.optionalWith(PageSchema, { default: () => 1 }),
  limit: Schema.optionalWith(LimitSchema, { default: () => 20 }),
  product_id: Schema.optional(Schema.UUID),
  location_id: Schema.optional(Schema.UUID),
  reason: Schema.optional(Schema.Literal(...StockMovementReasonValues)),
  date_from: Schema.optional(NullableDateString),
  date_to: Schema.optional(NullableDateString),
}).annotations({ identifier: 'StockMovementQuery' });

export const CreateStockMovementSchema = Schema.Struct({
  product_id: Schema.UUID,
  from_location_id: Schema.optional(Schema.UUID),
  to_location_id: Schema.optional(Schema.UUID),
  quantity: Schema.Number.pipe(Schema.int(), Schema.greaterThanOrEqualTo(1)),
  reason: Schema.Literal(...StockMovementReasonValues),
  order_id: Schema.optional(Schema.UUID),
  reference_number: Schema.optional(Schema.String.pipe(Schema.maxLength(100))),
  cost_per_unit: Schema.optional(Schema.Number.pipe(Schema.nonNegative())),
  notes: Schema.optional(Schema.String.pipe(Schema.maxLength(1000))),
}).annotations({ identifier: 'CreateStockMovement' });
