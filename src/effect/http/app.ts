import { HttpApp, HttpRouter, HttpServerResponse } from '@effect/platform';
import * as HttpServerRequest from '@effect/platform/HttpServerRequest';
import { Effect, GlobalValue, Option, Ref } from 'effect';
import { auth } from '../../auth';
import { apiRouter } from '../modules';
import { healthRouter } from '../modules/health/router';
import { respondCause } from '../platform/errors';
import { corsMiddleware } from './cors';
import { securityHeadersMiddleware } from './security-headers';
import { requestLoggingMiddleware } from './logging';

const MAX_REQUEST_BODY_BYTES = 10 * 1024 * 1024;
const AUTH_RATE_LIMIT_WINDOW_MS = 60_000;
const AUTH_RATE_LIMIT_MAX_REQUESTS = 100;

interface RateLimitState {
  readonly count: number;
  readonly resetAt: number;
}

type RateLimitOutcome =
  | {
      readonly _tag: 'allowed';
      readonly remaining: number;
    }
  | {
      readonly _tag: 'blocked';
      readonly retryAfterSeconds: number;
    };

const stripQueryString = (url: string) => {
  const queryIndex = url.indexOf('?');
  return queryIndex >= 0 ? url.slice(0, queryIndex) : url;
};

const makeErrorResponse = (
  statusCode: number,
  error: string,
  message: string,
  path: string,
  headers?: Record<string, string>,
) =>
  HttpServerResponse.unsafeJson(
    {
      statusCode,
      error,
      message,
      path,
      timestamp: new Date().toISOString(),
    },
    {
      status: statusCode,
      headers,
    },
  );

const authRateLimitBuckets = GlobalValue.globalValue(
  Symbol.for('@librestock/effect/http/auth-rate-limit'),
  () => Effect.runSync(Ref.make(new Map<string, RateLimitState>())),
);

const bodyLimitMiddleware = (httpApp: HttpApp.Default<any, any>) =>
  Effect.flatMap(HttpServerRequest.HttpServerRequest, (request) => {
    const contentLengthHeader = request.headers['content-length'];
    const contentLength =
      typeof contentLengthHeader === 'string'
        ? Number.parseInt(contentLengthHeader, 10)
        : Number.NaN;

    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_REQUEST_BODY_BYTES
    ) {
      return Effect.succeed(
        makeErrorResponse(
          413,
          'Payload Too Large',
          'Request body exceeds the 10MB limit',
          stripQueryString(request.url),
        ),
      );
    }

    return HttpServerRequest.withMaxBodySize(
      httpApp,
      Option.some(MAX_REQUEST_BODY_BYTES),
    );
  });

const getClientIp = (request: HttpServerRequest.HttpServerRequest) => {
  const forwardedFor = request.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0]?.trim() ?? 'unknown';
  }

  return Option.getOrElse(request.remoteAddress, () => 'unknown');
};

const authRateLimitMiddleware = (httpApp: HttpApp.Default<any, any>) =>
  Effect.flatMap(HttpServerRequest.HttpServerRequest, (request) => {
    const now = Date.now();
    const path = stripQueryString(request.url);
    const key = getClientIp(request);

    return Ref.modify(
      authRateLimitBuckets,
      (currentBuckets): readonly [RateLimitOutcome, Map<string, RateLimitState>] => {
        const buckets = new Map(currentBuckets);

        for (const [bucketKey, bucket] of buckets.entries()) {
          if (bucket.resetAt <= now) {
            buckets.delete(bucketKey);
          }
        }

        const current = buckets.get(key);
        if (!current || current.resetAt <= now) {
          buckets.set(key, {
            count: 1,
            resetAt: now + AUTH_RATE_LIMIT_WINDOW_MS,
          });
          return [
            {
              _tag: 'allowed',
              remaining: AUTH_RATE_LIMIT_MAX_REQUESTS - 1,
            },
            buckets,
          ] as const;
        }

        if (current.count >= AUTH_RATE_LIMIT_MAX_REQUESTS) {
          return [
            {
              _tag: 'blocked',
              retryAfterSeconds: Math.max(
                1,
                Math.ceil((current.resetAt - now) / 1000),
              ),
            },
            buckets,
          ] as const;
        }

        const nextCount = current.count + 1;
        buckets.set(key, {
          count: nextCount,
          resetAt: current.resetAt,
        });
        return [
          {
            _tag: 'allowed',
            remaining: Math.max(0, AUTH_RATE_LIMIT_MAX_REQUESTS - nextCount),
          },
          buckets,
        ] as const;
      },
    ).pipe(
      Effect.flatMap((outcome) =>
        outcome._tag === 'blocked'
          ? Effect.succeed(
              makeErrorResponse(
                429,
                'Too Many Requests',
                'Too many authentication attempts. Please try again later.',
                path,
                {
                  'retry-after': String(outcome.retryAfterSeconds),
                  'x-ratelimit-limit': String(AUTH_RATE_LIMIT_MAX_REQUESTS),
                  'x-ratelimit-remaining': '0',
                },
              ),
            )
          : HttpApp.withPreResponseHandler(httpApp, (_request, response) =>
              Effect.succeed(
                HttpServerResponse.setHeaders(response, {
                  'x-ratelimit-limit': String(AUTH_RATE_LIMIT_MAX_REQUESTS),
                  'x-ratelimit-remaining': String(outcome.remaining),
                }),
              ),
            ),
      ),
    );
  });

const authHandlerRouter = HttpRouter.empty.pipe(
  HttpRouter.mountApp(
    '/api/auth',
    authRateLimitMiddleware(HttpApp.fromWebHandler(auth.handler)),
    {
      includePrefix: true,
    },
  ),
);

const appRouter = HttpRouter.concatAll(healthRouter, authHandlerRouter, apiRouter).pipe(
  HttpRouter.catchAllCause(respondCause),
);

const baseHttpApp = Effect.runSync(HttpRouter.toHttpApp(appRouter)).pipe(
  Effect.catchAllCause(respondCause),
);

export const httpApp = requestLoggingMiddleware(
  securityHeadersMiddleware(
    corsMiddleware(
      bodyLimitMiddleware(baseHttpApp),
    ),
  ),
);
