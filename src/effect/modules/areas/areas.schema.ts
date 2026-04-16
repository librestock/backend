import { Schema } from 'effect';

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
