import { Schema } from 'effect'
import { LimitSchema, PageSchema } from '../common/schema-helpers.schema'

export const UserIdSchema = Schema.UUID.annotations({ identifier: 'UserId' });

export const UserQuerySchema = Schema.Struct({
  page: Schema.optionalWith(PageSchema, { default: () => 1 }),
  limit: Schema.optionalWith(LimitSchema, { default: () => 20 }),
  search: Schema.optional(Schema.Trim),
  role: Schema.optional(Schema.Trim),
}).annotations({ identifier: 'UserQuery' });
