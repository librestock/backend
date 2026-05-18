import { Schema } from 'effect';

export const BanUserSchema = Schema.Struct({
  reason: Schema.optional(Schema.String),
  expiresAt: Schema.optional(Schema.DateFromString),
}).annotations({ identifier: 'BanUser' });

export type BanUser = Schema.Schema.Type<typeof BanUserSchema>;
