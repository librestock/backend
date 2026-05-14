import { Schema } from 'effect'

export const AreaIdSchema = Schema.UUID.annotations({ identifier: 'AreaId' });

export const AreaQuerySchema = Schema.Struct({
  location_id: Schema.optional(Schema.UUID),
  parent_id: Schema.optional(Schema.UUID),
  root_only: Schema.optional(Schema.BooleanFromString),
  is_active: Schema.optional(Schema.BooleanFromString),
  include_children: Schema.optional(Schema.BooleanFromString),
}).annotations({ identifier: 'AreaQuery' });
