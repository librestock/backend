import { Schema } from 'effect';
import { LimitSchema, PageSchema, SortOrder } from '@librestock/types/common';
import { ProductSortField } from '@librestock/types/products';

const QueryBooleanSchema = Schema.BooleanFromString;
const ProductSortFieldValues = [
  ProductSortField.NAME,
  ProductSortField.SKU,
  ProductSortField.CREATED_AT,
  ProductSortField.UPDATED_AT,
  ProductSortField.STANDARD_PRICE,
  ProductSortField.STANDARD_COST,
  ProductSortField.REORDER_POINT,
] as const;
const SortOrderValues = [SortOrder.ASC, SortOrder.DESC] as const;

const NullableTrimmedString = (maxLength: number) =>
  Schema.NullOr(Schema.Trim.pipe(Schema.maxLength(maxLength)));

export const ProductIdSchema = Schema.UUID.annotations({ identifier: 'ProductId' });
export const ProductBooleanQuerySchema = QueryBooleanSchema.annotations({
  identifier: 'ProductBooleanQuery',
});

export const ProductQuerySchema = Schema.Struct({
  page: Schema.optionalWith(PageSchema, { default: () => 1 }),
  limit: Schema.optionalWith(LimitSchema, { default: () => 20 }),
  search: Schema.optional(Schema.Trim),
  category_id: Schema.optional(Schema.UUID),
  primary_supplier_id: Schema.optional(Schema.UUID),
  is_active: Schema.optional(QueryBooleanSchema),
  is_perishable: Schema.optional(QueryBooleanSchema),
  min_price: Schema.optional(Schema.NumberFromString.pipe(Schema.nonNegative())),
  max_price: Schema.optional(Schema.NumberFromString.pipe(Schema.nonNegative())),
  include_deleted: Schema.optionalWith(QueryBooleanSchema, { default: () => false }),
  sort_by: Schema.optionalWith(Schema.Literal(...ProductSortFieldValues), {
    default: () => ProductSortField.NAME,
  }),
  sort_order: Schema.optionalWith(Schema.Literal(...SortOrderValues), {
    default: () => SortOrder.ASC,
  }),
}).annotations({ identifier: 'ProductQuery' });

export const CreateProductSchema = Schema.Struct({
  sku: Schema.Trim.pipe(Schema.minLength(1), Schema.maxLength(50)),
  name: Schema.Trim.pipe(Schema.minLength(1), Schema.maxLength(200)),
  description: Schema.optional(NullableTrimmedString(1000)),
  category_id: Schema.UUID,
  volume_ml: Schema.optional(
    Schema.NullOr(Schema.Number.pipe(Schema.greaterThanOrEqualTo(1))),
  ),
  weight_kg: Schema.optional(
    Schema.NullOr(Schema.Number.pipe(Schema.nonNegative())),
  ),
  dimensions_cm: Schema.optional(
    Schema.NullOr(
      Schema.String.pipe(
        Schema.maxLength(50),
        Schema.pattern(/^\d+(\.\d+)?x\d+(\.\d+)?x\d+(\.\d+)?$/),
      ),
    ),
  ),
  standard_cost: Schema.optional(
    Schema.NullOr(Schema.Number.pipe(Schema.nonNegative())),
  ),
  standard_price: Schema.optional(
    Schema.NullOr(Schema.Number.pipe(Schema.nonNegative())),
  ),
  markup_percentage: Schema.optional(
    Schema.NullOr(
      Schema.Number.pipe(
        Schema.greaterThanOrEqualTo(0),
        Schema.lessThanOrEqualTo(1000),
      ),
    ),
  ),
  reorder_point: Schema.Number.pipe(Schema.nonNegative()),
  primary_supplier_id: Schema.optional(Schema.NullOr(Schema.UUID)),
  supplier_sku: Schema.optional(NullableTrimmedString(50)),
  barcode: Schema.optional(NullableTrimmedString(100)),
  unit: Schema.optional(NullableTrimmedString(50)),
  is_active: Schema.Boolean,
  is_perishable: Schema.Boolean,
  notes: Schema.optional(NullableTrimmedString(500)),
}).annotations({ identifier: 'CreateProduct' });

export const UpdateProductSchema = Schema.Struct({
  sku: Schema.optional(Schema.Trim.pipe(Schema.minLength(1), Schema.maxLength(50))),
  name: Schema.optional(Schema.Trim.pipe(Schema.minLength(1), Schema.maxLength(200))),
  description: Schema.optional(NullableTrimmedString(1000)),
  category_id: Schema.optional(Schema.UUID),
  volume_ml: Schema.optional(
    Schema.NullOr(Schema.Number.pipe(Schema.greaterThanOrEqualTo(1))),
  ),
  weight_kg: Schema.optional(
    Schema.NullOr(Schema.Number.pipe(Schema.nonNegative())),
  ),
  dimensions_cm: Schema.optional(
    Schema.NullOr(
      Schema.String.pipe(
        Schema.maxLength(50),
        Schema.pattern(/^\d+(\.\d+)?x\d+(\.\d+)?x\d+(\.\d+)?$/),
      ),
    ),
  ),
  standard_cost: Schema.optional(
    Schema.NullOr(Schema.Number.pipe(Schema.nonNegative())),
  ),
  standard_price: Schema.optional(
    Schema.NullOr(Schema.Number.pipe(Schema.nonNegative())),
  ),
  markup_percentage: Schema.optional(
    Schema.NullOr(
      Schema.Number.pipe(
        Schema.greaterThanOrEqualTo(0),
        Schema.lessThanOrEqualTo(1000),
      ),
    ),
  ),
  reorder_point: Schema.optional(Schema.Number.pipe(Schema.nonNegative())),
  primary_supplier_id: Schema.optional(Schema.NullOr(Schema.UUID)),
  supplier_sku: Schema.optional(NullableTrimmedString(50)),
  barcode: Schema.optional(NullableTrimmedString(100)),
  unit: Schema.optional(NullableTrimmedString(50)),
  is_active: Schema.optional(Schema.Boolean),
  is_perishable: Schema.optional(Schema.Boolean),
  notes: Schema.optional(NullableTrimmedString(500)),
}).annotations({ identifier: 'UpdateProduct' });

export const BulkCreateProductsSchema = Schema.Struct({
  products: Schema.Array(CreateProductSchema).pipe(
    Schema.minItems(1),
    Schema.maxItems(100),
  ),
}).annotations({ identifier: 'BulkCreateProducts' });

export const BulkUpdateStatusSchema = Schema.Struct({
  ids: Schema.Array(Schema.UUID).pipe(Schema.minItems(1), Schema.maxItems(100)),
  is_active: Schema.Boolean,
}).annotations({ identifier: 'BulkUpdateStatus' });

export const BulkDeleteSchema = Schema.Struct({
  ids: Schema.Array(Schema.UUID).pipe(Schema.minItems(1), Schema.maxItems(100)),
  permanent: Schema.optionalWith(Schema.Boolean, { default: () => false }),
}).annotations({ identifier: 'BulkDelete' });

export const BulkRestoreSchema = Schema.Struct({
  ids: Schema.Array(Schema.UUID).pipe(Schema.minItems(1), Schema.maxItems(100)),
}).annotations({ identifier: 'BulkRestore' });
