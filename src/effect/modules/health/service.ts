import { Effect } from 'effect';
import { BetterAuth } from '../../platform/better-auth';
import { TypeOrmDataSource } from '../../platform/typeorm';

interface HealthDetails {
  readonly status: 'up' | 'down';
  readonly message?: string;
}

export interface HealthCheckResponse {
  readonly status: 'ok' | 'error';
  readonly info: Record<string, HealthDetails>;
  readonly error: Record<string, HealthDetails>;
  readonly details: Record<string, HealthDetails>;
}

const makeHealthResponse = (
  details: Record<string, HealthDetails>,
): HealthCheckResponse => {
  const info = Object.fromEntries(
    Object.entries(details).filter(([, value]) => value.status === 'up'),
  );
  const error = Object.fromEntries(
    Object.entries(details).filter(([, value]) => value.status === 'down'),
  );

  return {
    status: Object.keys(error).length === 0 ? 'ok' : 'error',
    info,
    error,
    details,
  };
};

const checkDatabase = Effect.gen(function* () {
  const dataSource = yield* TypeOrmDataSource;

  return yield* Effect.tryPromise({
    try: async () => {
      await dataSource.query('SELECT 1');
      return { status: 'up' as const };
    },
    catch: (cause) => ({
      status: 'down' as const,
      message: cause instanceof Error ? cause.message : 'Database is unreachable',
    }),
  });
});

const checkBetterAuth = Effect.gen(function* () {
  yield* BetterAuth;

  if (!process.env.BETTER_AUTH_SECRET) {
    return {
      status: 'down' as const,
      message: 'BETTER_AUTH_SECRET is not configured',
    };
  }

  return {
    status: 'up' as const,
    message: 'Better Auth is properly configured',
  };
});

export interface HealthService {
  readonly live: Effect.Effect<HealthCheckResponse, never, any>;
  readonly ready: Effect.Effect<HealthCheckResponse, never, any>;
  readonly healthCheck: Effect.Effect<HealthCheckResponse, never, any>;
}

export const makeHealthService = (): HealthService => ({
  live: Effect.succeed(
    makeHealthResponse({}),
  ),
  ready: checkDatabase.pipe(
    Effect.catchAll((failure) => Effect.succeed(failure)),
    Effect.map((database) => makeHealthResponse({ database })),
  ),
  healthCheck: Effect.all({
    database: checkDatabase.pipe(
      Effect.catchAll((failure) => Effect.succeed(failure)),
    ),
    'better-auth': checkBetterAuth.pipe(
      Effect.catchAll((failure) => Effect.succeed(failure)),
    ),
  }).pipe(Effect.map(makeHealthResponse)),
});
