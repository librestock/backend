import { Schema } from 'effect'
import { LimitSchema, PageSchema } from '../common/schema-helpers.schema'

export const SupplierIdSchema = Schema.UUID.annotations({
  identifier: 'SupplierId',
});

export const SupplierQuerySchema = Schema.Struct({
  page: Schema.optionalWith(PageSchema, { default: () => 1 }),
  limit: Schema.optionalWith(LimitSchema, { default: () => 20 }),
  q: Schema.optional(Schema.Trim),
  is_active: Schema.optional(Schema.BooleanFromString),
}).annotations({ identifier: 'SupplierQuery' });
