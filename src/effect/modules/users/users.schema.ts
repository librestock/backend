import { Schema } from 'effect';

export const UpdateUserRolesSchema = Schema.Struct({
  roles: Schema.Array(Schema.UUID),
}).annotations({ identifier: 'UpdateUserRoles' });

export const BanUserSchema = Schema.Struct({
  reason: Schema.optional(Schema.String),
  expiresAt: Schema.optional(Schema.DateFromString),
}).annotations({ identifier: 'BanUser' });
