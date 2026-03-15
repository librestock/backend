import { Schema } from 'effect';
import { LimitSchema, NullableTrimmedString, PageSchema } from '@librestock/types/common';

export const UserIdSchema = Schema.UUID.annotations({ identifier: 'UserId' });

export const UserQuerySchema = Schema.Struct({
  page: Schema.optionalWith(PageSchema, { default: () => 1 }),
  limit: Schema.optionalWith(LimitSchema, { default: () => 20 }),
  search: Schema.optional(NullableTrimmedString),
  role: Schema.optional(NullableTrimmedString),
}).annotations({ identifier: 'UserQuery' });

export const UpdateUserRolesSchema = Schema.Struct({
  roles: Schema.Array(Schema.UUID),
}).annotations({ identifier: 'UpdateUserRoles' });

export const BanUserSchema = Schema.Struct({
  reason: Schema.optional(Schema.String),
  expiresAt: Schema.optional(Schema.DateFromString),
}).annotations({ identifier: 'BanUser' });
