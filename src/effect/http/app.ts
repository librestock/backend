import {
  HttpApp,
  HttpApiBuilder,
  HttpRouter,
  HttpServerResponse,
} from '@effect/platform';
import * as HttpServerRequest from '@effect/platform/HttpServerRequest';
import { Effect, Layer, Option } from 'effect';
import { auth } from '../../auth';
import { apiRouter } from '../modules';
import { HealthApiLive } from '../modules/health/router';
import { respondCause } from '../platform/errors';
import {
  resolveLocale,
  translateMessage,
  type AnyMessageKey,
  type MessageArgs,
} from '../platform/messages';
import { corsMiddleware } from './cors';
import { securityHeadersMiddleware } from './security-headers';
import { requestLoggingMiddleware } from './logging';
import { AppApi } from './api';

const MAX_REQUEST_BODY_BYTES = 10 * 1024 * 1024;

const stripQueryString = (url: string) => {
  const queryIndex = url.indexOf('?');
  return queryIndex >= 0 ? url.slice(0, queryIndex) : url;
};

const makeErrorResponse = (
  statusCode: number,
  error: string,
  messageKey: AnyMessageKey,
  path: string,
  locale: ReturnType<typeof resolveLocale>,
  messageArgs?: MessageArgs,
  headers?: Record<string, string>,
) =>
  HttpServerResponse.unsafeJson(
    {
      statusCode,
      error,
      messageKey,
      ...(messageArgs ? { messageArgs } : {}),
      message: translateMessage(locale, messageKey, messageArgs),
      path,
      timestamp: new Date().toISOString(),
    },
    {
      status: statusCode,
      headers,
    },
  );

const bodyLimitMiddleware = <E, R>(httpApp: HttpApp.Default<E, R>) =>
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
      const acceptLanguageHeader = request.headers['accept-language'];
      const locale = resolveLocale(
        typeof acceptLanguageHeader === 'string' ? acceptLanguageHeader : null,
      );

      return Effect.succeed(
        makeErrorResponse(
          413,
          'Payload Too Large',
          'http.requestBodyTooLarge',
          stripQueryString(request.url),
          locale,
        ),
      );
    }

    return HttpServerRequest.withMaxBodySize(
      httpApp,
      Option.some(MAX_REQUEST_BODY_BYTES),
    );
  });

// ---------------------------------------------------------------------------
// HttpApiBuilder layer for the health group
//
// The health routes are declared via HttpApiGroup / HttpApiEndpoint in
// src/effect/http/api.ts and implemented in HealthApiLive. The built
// HttpApp.Default is mounted below so it coexists with the legacy HttpRouter.
// ---------------------------------------------------------------------------

const healthApiLayer = Layer.provide(
  HttpApiBuilder.api(AppApi),
  HealthApiLive,
);

/**
 * The built health HttpApp.
 *
 * This Effect is run once at startup (inside buildHttpApp below) with
 * HealthService in scope. The result is an HttpApp whose handlers are
 * pure Effects with no external requirements (HealthService closes over
 * DrizzleDatabase and BetterAuth at layer-build time).
 */
const healthBuilderApp = HttpApiBuilder.httpApp.pipe(
  Effect.provide(healthApiLayer),
  Effect.provide(HttpApiBuilder.Router.Live),
  Effect.provide(HttpApiBuilder.Middleware.layer),
);

// ---------------------------------------------------------------------------
// Full HTTP app builder
//
// Exported as an Effect so main.ts can build it inside the Layer graph where
// HealthService (and the platform layers it needs) are already available.
// ---------------------------------------------------------------------------

export const buildHttpApp = Effect.gen(function* () {
  // Build the health API HttpApp once. HealthService is in scope from the
  // applicationLayer provided in main.ts.
  const healthApp = yield* healthBuilderApp;

  const appRouter = HttpRouter.empty.pipe(
    // Health routes handled by HttpApiBuilder (typed, schema-validated)
    HttpRouter.mountApp('/health-check', healthApp, { includePrefix: true }),
    // Legacy routes remain on HttpRouter until migrated
    HttpRouter.mountApp('/api/auth', HttpApp.fromWebHandler(auth.handler), {
      includePrefix: true,
    }),
    HttpRouter.concat(apiRouter),
    HttpRouter.catchAllCause(respondCause),
  );

  const base = yield* HttpRouter.toHttpApp(appRouter).pipe(
    Effect.map((app) => app.pipe(Effect.catchAllCause(respondCause))),
  );

  return requestLoggingMiddleware(
    securityHeadersMiddleware(corsMiddleware(bodyLimitMiddleware(base))),
  );
});
