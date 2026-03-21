import { Schema } from 'effect';

const QueryBooleanSchema = Schema.BooleanFromString;

export const AreaIdSchema = Schema.UUID.annotations({ identifier: 'AreaId' });

export const CreateAreaSchema = Schema.Struct({
  location_id: Schema.UUID,
  parent_id: Schema.optional(Schema.UUID),
  name: Schema.String.pipe(Schema.maxLength(100)),
  code: Schema.optional(Schema.String.pipe(Schema.maxLength(50))),
  description: Schema.optional(Schema.String),
  is_active: Schema.optional(Schema.Boolean),
}).annotations({ identifier: 'CreateArea' });

export const UpdateAreaSchema = Schema.Struct({
  parent_id: Schema.optional(Schema.NullOr(Schema.UUID)),
  name: Schema.optional(Schema.String.pipe(Schema.maxLength(100))),
  code: Schema.optional(Schema.String.pipe(Schema.maxLength(50))),
  description: Schema.optional(Schema.String),
  is_active: Schema.optional(Schema.Boolean),
}).annotations({ identifier: 'UpdateArea' });

export const AreaQuerySchema = Schema.Struct({
  location_id: Schema.optional(Schema.UUID),
  parent_id: Schema.optional(Schema.UUID),
  root_only: Schema.optional(QueryBooleanSchema),
  is_active: Schema.optional(QueryBooleanSchema),
  include_children: Schema.optional(QueryBooleanSchema),
}).annotations({ identifier: 'AreaQuery' });
