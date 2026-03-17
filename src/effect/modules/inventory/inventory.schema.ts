import { Schema } from 'effect';
import { LimitSchema, NullableTrimmedString, PageSchema, SortOrder  } from '@librestock/types/common';
import { InventorySortField } from '@librestock/types/inventory';

const QueryBooleanSchema = Schema.Union(Schema.Boolean, Schema.BooleanFromString);
const InventorySortFieldValues = [
  InventorySortField.QUANTITY,
  InventorySortField.EXPIRY_DATE,
  InventorySortField.RECEIVED_DATE,
  InventorySortField.CREATED_AT,
  InventorySortField.UPDATED_AT,
] as const;
const SortOrderValues = [SortOrder.ASC, SortOrder.DESC] as const;

const NullableDateString = Schema.NullOr(Schema.DateFromString);
const NullableNonNegativeNumber = Schema.NullOr(Schema.Number.pipe(Schema.nonNegative()));

export const InventoryIdSchema = Schema.UUID.annotations({
  identifier: 'InventoryId',
});

export const InventoryQuerySchema = Schema.Struct({
  page: Schema.optionalWith(PageSchema, { default: () => 1 }),
  limit: Schema.optionalWith(LimitSchema, { default: () => 20 }),
  product_id: Schema.optional(Schema.UUID),
  location_id: Schema.optional(Schema.UUID),
  area_id: Schema.optional(Schema.UUID),
  search: Schema.optional(NullableTrimmedString),
  low_stock: Schema.optional(QueryBooleanSchema),
  expiring_soon: Schema.optional(QueryBooleanSchema),
  min_quantity: Schema.optional(Schema.NumberFromString.pipe(Schema.nonNegative())),
  max_quantity: Schema.optional(Schema.NumberFromString.pipe(Schema.nonNegative())),
  sort_by: Schema.optionalWith(Schema.Literal(...InventorySortFieldValues), {
    default: () => InventorySortField.UPDATED_AT,
  }),
  sort_order: Schema.optionalWith(Schema.Literal(...SortOrderValues), {
    default: () => SortOrder.DESC,
  }),
}).annotations({ identifier: 'InventoryQuery' });

export const CreateInventorySchema = Schema.Struct({
  product_id: Schema.UUID,
  location_id: Schema.UUID,
  area_id: Schema.optional(Schema.NullOr(Schema.UUID)),
  quantity: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  batchNumber: Schema.optional(Schema.String.pipe(Schema.maxLength(100))),
  expiry_date: Schema.optional(NullableDateString),
  cost_per_unit: Schema.optional(NullableNonNegativeNumber),
  received_date: Schema.optional(NullableDateString),
}).annotations({ identifier: 'CreateInventory' });

export const UpdateInventorySchema = Schema.Struct({
  location_id: Schema.optional(Schema.UUID),
  area_id: Schema.optional(Schema.NullOr(Schema.UUID)),
  quantity: Schema.optional(Schema.Number.pipe(Schema.int(), Schema.nonNegative())),
  batchNumber: Schema.optional(Schema.String.pipe(Schema.maxLength(100))),
  expiry_date: Schema.optional(NullableDateString),
  cost_per_unit: Schema.optional(NullableNonNegativeNumber),
  received_date: Schema.optional(NullableDateString),
}).annotations({ identifier: 'UpdateInventory' });

export const AdjustInventorySchema = Schema.Struct({
  adjustment: Schema.Number.pipe(Schema.int()),
}).annotations({ identifier: 'AdjustInventory' });
