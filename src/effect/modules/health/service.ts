import { Effect } from 'effect';
import { sql } from 'drizzle-orm';
import { BetterAuth } from '../../platform/better-auth';
import { DrizzleDatabase } from '../../platform/drizzle';
import { type AnyMessageKey, type MessageArgs } from '../../platform/messages';

interface HealthDetails {
  readonly status: 'up' | 'down';
  readonly message?: string;
  readonly messageKey?: AnyMessageKey;
  readonly messageArgs?: MessageArgs;
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
  const db = yield* DrizzleDatabase;

  return yield* Effect.tryPromise({
    try: async () => {
      await db.execute(sql`SELECT 1`);
      return { status: 'up' as const };
    },
    catch: () => ({
      status: 'down' as const,
      messageKey: 'health.databaseUnreachable' as const,
    }),
  });
});

const checkBetterAuth = Effect.gen(function* () {
  yield* BetterAuth;

  if (!process.env.BETTER_AUTH_SECRET) {
    return {
      status: 'down' as const,
      messageKey: 'health.betterAuthSecretMissing' as const,
    };
  }

  return {
    status: 'up' as const,
    messageKey: 'health.betterAuthConfigured' as const,
  };
});

export const makeHealthService = () => ({
  live: Effect.succeed(makeHealthResponse({})),
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

export class HealthService extends Effect.Service<HealthService>()(
  '@librestock/effect/HealthService',
  {
    succeed: makeHealthService(),
  },
) {}
