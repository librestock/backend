import { Schema } from 'effect';
import { ClientStatus } from '@librestock/types/clients';

const ClientStatusValues = [
  ClientStatus.ACTIVE,
  ClientStatus.SUSPENDED,
  ClientStatus.INACTIVE,
] as const;

const ClientStatusSchema = Schema.Literal(...ClientStatusValues);
const EmailSchema = Schema.Trim.pipe(
  Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
);

export const CreateClientSchema = Schema.Struct({
  company_name: Schema.Trim.pipe(Schema.maxLength(200)),
  contact_person: Schema.Trim.pipe(Schema.maxLength(200)),
  email: EmailSchema,
  yacht_name: Schema.optional(Schema.Trim.pipe(Schema.maxLength(200))),
  phone: Schema.optional(Schema.String.pipe(Schema.maxLength(50))),
  billing_address: Schema.optional(Schema.String),
  default_delivery_address: Schema.optional(Schema.String),
  account_status: Schema.optional(ClientStatusSchema),
  payment_terms: Schema.optional(Schema.String.pipe(Schema.maxLength(200))),
  credit_limit: Schema.optional(Schema.Number.pipe(Schema.nonNegative())),
  notes: Schema.optional(Schema.String),
}).annotations({ identifier: 'CreateClient' });

export const UpdateClientSchema = Schema.Struct({
  company_name: Schema.optional(Schema.Trim.pipe(Schema.maxLength(200))),
  contact_person: Schema.optional(Schema.Trim.pipe(Schema.maxLength(200))),
  email: Schema.optional(EmailSchema),
  yacht_name: Schema.optional(Schema.Trim.pipe(Schema.maxLength(200))),
  phone: Schema.optional(Schema.String.pipe(Schema.maxLength(50))),
  billing_address: Schema.optional(Schema.String),
  default_delivery_address: Schema.optional(Schema.String),
  account_status: Schema.optional(ClientStatusSchema),
  payment_terms: Schema.optional(Schema.String.pipe(Schema.maxLength(200))),
  credit_limit: Schema.optional(Schema.Number.pipe(Schema.nonNegative())),
  notes: Schema.optional(Schema.String),
}).annotations({ identifier: 'UpdateClient' });
