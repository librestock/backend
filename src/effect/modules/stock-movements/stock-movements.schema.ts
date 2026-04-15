import { Schema } from 'effect';
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
