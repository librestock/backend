import { Schema } from 'effect';

export const CreateUserSchema = Schema.Struct({
  name: Schema.Trim.pipe(Schema.minLength(1), Schema.maxLength(100)),
  email: Schema.Trim.pipe(Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)),
  password: Schema.String.pipe(Schema.minLength(8), Schema.maxLength(128)),
  roles: Schema.Array(Schema.UUID),
}).annotations({ identifier: 'CreateUser' });

export const UpdateUserRolesSchema = Schema.Struct({
  roles: Schema.Array(Schema.UUID),
}).annotations({ identifier: 'UpdateUserRoles' });

export const BanUserSchema = Schema.Struct({
  reason: Schema.optional(Schema.String),
  expiresAt: Schema.optional(Schema.DateFromString),
}).annotations({ identifier: 'BanUser' });
