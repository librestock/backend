import { Schema } from 'effect'
import { LimitSchema, PageSchema } from '../common/schema-helpers.schema'
import { SortOrder } from '../common/sort-order.enum'
import { InventorySortField } from './inventory-sort-field.enum'

const InventorySortFieldValues = [
  InventorySortField.QUANTITY,
  InventorySortField.EXPIRY_DATE,
  InventorySortField.RECEIVED_DATE,
  InventorySortField.CREATED_AT,
  InventorySortField.UPDATED_AT,
] as const;
const SortOrderValues = [SortOrder.ASC, SortOrder.DESC] as const;

export const InventoryIdSchema = Schema.UUID.annotations({
  identifier: 'InventoryId',
});

export const InventoryQuerySchema = Schema.Struct({
  page: Schema.optionalWith(PageSchema, { default: () => 1 }),
  limit: Schema.optionalWith(LimitSchema, { default: () => 20 }),
  product_id: Schema.optional(Schema.UUID),
  location_id: Schema.optional(Schema.UUID),
  area_id: Schema.optional(Schema.UUID),
  search: Schema.optional(Schema.Trim),
  low_stock: Schema.optional(Schema.BooleanFromString),
  expiring_soon: Schema.optional(Schema.BooleanFromString),
  min_quantity: Schema.optional(Schema.NumberFromString.pipe(Schema.nonNegative())),
  max_quantity: Schema.optional(Schema.NumberFromString.pipe(Schema.nonNegative())),
  sort_by: Schema.optionalWith(Schema.Literal(...InventorySortFieldValues), {
    default: () => InventorySortField.UPDATED_AT,
  }),
  sort_order: Schema.optionalWith(Schema.Literal(...SortOrderValues), {
    default: () => SortOrder.DESC,
  }),
}).pipe(
  Schema.filter((query) => {
    if (query.min_quantity === undefined || query.max_quantity === undefined) {
      return true
    }
    return query.min_quantity <= query.max_quantity
  }, {
    message: () => 'min_quantity must be less than or equal to max_quantity',
  }),
).annotations({ identifier: 'InventoryQuery' });
