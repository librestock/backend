import { Schema } from 'effect';
import { EmailSchema } from '@librestock/types/common';

const HttpUrlSchema = Schema.Trim.pipe(
  Schema.pattern(/^https?:\/\/\S+$/),
  Schema.maxLength(500),
);

export const CreateSupplierSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(200)),
  contact_person: Schema.optional(Schema.String.pipe(Schema.maxLength(200))),
  email: Schema.optional(EmailSchema),
  phone: Schema.optional(Schema.String.pipe(Schema.maxLength(50))),
  address: Schema.optional(Schema.String),
  website: Schema.optional(HttpUrlSchema),
  notes: Schema.optional(Schema.String),
  is_active: Schema.optional(Schema.Boolean),
}).annotations({ identifier: 'CreateSupplier' });

export const UpdateSupplierSchema = Schema.Struct({
  name: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(200)),
  ),
  contact_person: Schema.optional(Schema.String.pipe(Schema.maxLength(200))),
  email: Schema.optional(EmailSchema),
  phone: Schema.optional(Schema.String.pipe(Schema.maxLength(50))),
  address: Schema.optional(Schema.String),
  website: Schema.optional(HttpUrlSchema),
  notes: Schema.optional(Schema.String),
  is_active: Schema.optional(Schema.Boolean),
}).annotations({ identifier: 'UpdateSupplier' });
