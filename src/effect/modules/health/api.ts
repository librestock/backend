import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from '@effect/platform';
import { Schema } from 'effect';

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

export class ServiceDown extends Schema.TaggedError<ServiceDown>()(
  'ServiceDown',
  {
    details: Schema.Record({ key: Schema.String, value: HealthDetails }),
  },
  HttpApiSchema.annotations({ status: 503 }),
) {}

// The group is mounted under `/health-check` in src/effect/http/app.ts with
// `includePrefix: true`, so endpoint paths here must be relative to that
// prefix. Don't repeat `/health-check` or routes resolve to
// `/health-check/health-check/...`.
export class HealthApi extends HttpApiGroup.make('health')
  .add(
    HttpApiEndpoint.get('live', '/live').addSuccess(HealthCheckResponseSchema),
  )
  .add(
    HttpApiEndpoint.get('ready', '/ready')
      .addSuccess(HealthCheckResponseSchema)
      .addError(ServiceDown),
  )
  .add(
    HttpApiEndpoint.get('check', '/')
      .addSuccess(HealthCheckResponseSchema)
      .addError(ServiceDown),
  ) {}
