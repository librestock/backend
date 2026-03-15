import { Schema } from 'effect';
import { PageSchema, LimitSchema } from '@librestock/types/common';
import { LocationSortField, LocationType } from '@librestock/types/locations';
import { SortOrder } from '@librestock/types/common';

const LocationTypeValues = [
  LocationType.WAREHOUSE,
  LocationType.SUPPLIER,
  LocationType.IN_TRANSIT,
  LocationType.CLIENT,
] as const;

const LocationSortFieldValues = [
  LocationSortField.NAME,
  LocationSortField.TYPE,
  LocationSortField.CREATED_AT,
  LocationSortField.UPDATED_AT,
] as const;

const SortOrderValues = [SortOrder.ASC, SortOrder.DESC] as const;
const QueryBooleanSchema = Schema.Union(Schema.Boolean, Schema.BooleanFromString);

export const LocationIdSchema = Schema.UUID.annotations({
  identifier: 'LocationId',
});

export const LocationQuerySchema = Schema.Struct({
  page: Schema.optionalWith(PageSchema, { default: () => 1 }),
  limit: Schema.optionalWith(LimitSchema, { default: () => 20 }),
  search: Schema.optional(Schema.Trim),
  type: Schema.optional(Schema.Literal(...LocationTypeValues)),
  is_active: Schema.optional(QueryBooleanSchema),
  sort_by: Schema.optionalWith(Schema.Literal(...LocationSortFieldValues), {
    default: () => LocationSortField.NAME,
  }),
  sort_order: Schema.optionalWith(Schema.Literal(...SortOrderValues), {
    default: () => SortOrder.ASC,
  }),
}).annotations({ identifier: 'LocationQuery' });

export const CreateLocationSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(200)),
  type: Schema.Literal(...LocationTypeValues),
  address: Schema.optional(Schema.String),
  contact_person: Schema.optional(Schema.String.pipe(Schema.maxLength(200))),
  phone: Schema.optional(Schema.String.pipe(Schema.maxLength(50))),
  is_active: Schema.optional(Schema.Boolean),
}).annotations({ identifier: 'CreateLocation' });

export const UpdateLocationSchema = Schema.Struct({
  name: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(200)),
  ),
  type: Schema.optional(Schema.Literal(...LocationTypeValues)),
  address: Schema.optional(Schema.String),
  contact_person: Schema.optional(Schema.String.pipe(Schema.maxLength(200))),
  phone: Schema.optional(Schema.String.pipe(Schema.maxLength(50))),
  is_active: Schema.optional(Schema.Boolean),
}).annotations({ identifier: 'UpdateLocation' });
