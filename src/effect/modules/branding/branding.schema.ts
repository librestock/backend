import { Schema } from 'effect';

const HttpUrlSchema = Schema.Trim.pipe(
  Schema.pattern(/^https?:\/\/\S+$/),
  Schema.maxLength(500),
);

export const UpdateBrandingSchema = Schema.Struct({
  app_name: Schema.optional(Schema.String.pipe(Schema.maxLength(100))),
  tagline: Schema.optional(Schema.String.pipe(Schema.maxLength(255))),
  logo_url: Schema.optional(Schema.NullOr(HttpUrlSchema)),
  favicon_url: Schema.optional(Schema.NullOr(HttpUrlSchema)),
  primary_color: Schema.optional(
    Schema.String.pipe(Schema.pattern(/^#[\dA-Fa-f]{6}$/)),
  ),
}).annotations({ identifier: 'UpdateBranding' });
