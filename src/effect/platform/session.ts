import { HttpServerRequest } from '@effect/platform';
import { Data, Effect } from 'effect';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { BetterAuth } from './better-auth';

export class SessionUnauthorized extends Data.TaggedError('SessionUnauthorized')<{
  readonly message: string;
}> {
  readonly statusCode = 401 as const;
}

export class SessionInfrastructureError extends Data.TaggedError(
  'SessionInfrastructureError',
)<{
  readonly message: string;
  readonly cause?: unknown;
}> {
  readonly statusCode = 500 as const;
}

export const getRequestHeaders: Effect.Effect<
  globalThis.Headers,
  never,
  HttpServerRequest.HttpServerRequest
> = Effect.map(
  HttpServerRequest.HttpServerRequest,
  (request) => new globalThis.Headers(Object.entries(request.headers)),
);

export const getOptionalSession = Effect.gen(function* () {
  const betterAuth = yield* BetterAuth;
  const requestHeaders = yield* getRequestHeaders;

  const session = yield* Effect.tryPromise({
    try: () => betterAuth.api.getSession({ headers: requestHeaders }),
    catch: (cause) =>
      new SessionInfrastructureError({
        cause,
        message: 'Failed to resolve user session',
      }),
  });

  if (!session) {
    return null;
  }

  return {
    ...session,
    user: {
      ...session.user,
      role: session.user.role ?? undefined,
    },
  } as UserSession;
});

export const requireSession = Effect.flatMap(getOptionalSession, (session) =>
  session
    ? Effect.succeed(session)
    : Effect.fail(
        new SessionUnauthorized({
          message: 'Unauthorized',
        }),
      ),
);
