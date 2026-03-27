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

export class HealthService extends Effect.Service<HealthService>()(
  '@librestock/effect/HealthService',
  {
    effect: Effect.gen(function* () {
      // Acquire the platform services once at layer-build time and close over them.
      // This makes the public methods self-contained Effects with no external requirements,
      // which is required for HttpApiBuilder handler compatibility.
      const db = yield* DrizzleDatabase;
      const auth = yield* BetterAuth;

      const checkDatabase = Effect.tryPromise({
        try: async () => {
          await db.execute(sql`SELECT 1`);
          return { status: 'up' as const };
        },
        catch: () => ({
          status: 'down' as const,
          messageKey: 'health.databaseUnreachable' as AnyMessageKey,
        }),
      });

      const checkBetterAuth = Effect.sync(() => {
        if (!process.env.BETTER_AUTH_SECRET) {
          return {
            status: 'down' as const,
            messageKey: 'health.betterAuthSecretMissing' as AnyMessageKey,
          };
        }
        return {
          status: 'up' as const,
          messageKey: 'health.betterAuthConfigured' as AnyMessageKey,
        };
      });

      // Verify the auth reference is used (satisfies yield dependency)
      void auth;

      const live = Effect.succeed(makeHealthResponse({})).pipe(
        Effect.withSpan('HealthService.live'),
      );

      const ready = checkDatabase.pipe(
        Effect.catchAll((failure) => Effect.succeed(failure)),
        Effect.map((database) => makeHealthResponse({ database })),
        Effect.withSpan('HealthService.ready'),
      );

      const healthCheck = Effect.all({
        database: checkDatabase.pipe(
          Effect.catchAll((failure) => Effect.succeed(failure)),
        ),
        'better-auth': checkBetterAuth.pipe(
          Effect.catchAll((failure) => Effect.succeed(failure)),
        ),
      }).pipe(
        Effect.map(makeHealthResponse),
        Effect.withSpan('HealthService.healthCheck'),
      );

      return { live, ready, healthCheck };
    }),
    // DrizzleDatabase and BetterAuth are platform services wired externally in main.ts
    // via platformLayer; they are NOT listed here to avoid creating duplicate connections.
  },
) {}
