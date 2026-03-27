import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from '@effect/platform';
import { Schema } from 'effect';

// ---------------------------------------------------------------------------
// Response schemas
// ---------------------------------------------------------------------------

const HealthDetails = Schema.Struct({
  status: Schema.Literal('up', 'down'),
  messageKey: Schema.optional(Schema.String),
});

export const HealthCheckResponseSchema = Schema.Struct({
  status: Schema.Literal('ok', 'error'),
  info: Schema.Record({ key: Schema.String, value: HealthDetails }),
  error: Schema.Record({ key: Schema.String, value: HealthDetails }),
  details: Schema.Record({ key: Schema.String, value: HealthDetails }),
});

// ---------------------------------------------------------------------------
// Error types — annotated with HTTP status so HttpApiBuilder encodes them correctly
// ---------------------------------------------------------------------------

export class ServiceDown extends Schema.TaggedError<ServiceDown>()(
  'ServiceDown',
  {
    details: Schema.Record({ key: Schema.String, value: HealthDetails }),
  },
  HttpApiSchema.annotations({ status: 503 }),
) {}

// ---------------------------------------------------------------------------
// API group
// ---------------------------------------------------------------------------

export class HealthApi extends HttpApiGroup.make('health')
  .add(
    HttpApiEndpoint.get('live', '/health-check/live').addSuccess(
      HealthCheckResponseSchema,
    ),
  )
  .add(
    HttpApiEndpoint.get('ready', '/health-check/ready')
      .addSuccess(HealthCheckResponseSchema)
      .addError(ServiceDown),
  )
  .add(
    HttpApiEndpoint.get('check', '/health-check')
      .addSuccess(HealthCheckResponseSchema)
      .addError(ServiceDown),
  ) {}
