import {
  HttpApp,
  HttpApiBuilder,
  HttpApiSwagger,
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
// HttpApiBuilder layer for the typed API groups
//
// Routes declared via HttpApiGroup / HttpApiEndpoint in src/effect/http/api.ts
// and implemented by *ApiLive layers are compiled into a single HttpApp here.
// HttpApiSwagger registers a GET /docs route on the same builder router,
// serving an OpenAPI spec derived from AppApi.
// ---------------------------------------------------------------------------

const apiLayer = Layer.provide(HttpApiBuilder.api(AppApi), [
  HealthApiLive,
  HttpApiSwagger.layer({ path: '/docs' }),
]);

const apiBuilderApp = HttpApiBuilder.httpApp.pipe(
  Effect.provide(apiLayer),
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
  // Build the HttpApiBuilder app once. HealthService is in scope from the
  // applicationLayer provided in main.ts. The resulting HttpApp serves both
  // the typed API routes and the Swagger UI at /docs.
  const builderApp = yield* apiBuilderApp;

  const appRouter = HttpRouter.empty.pipe(
    // Health routes handled by HttpApiBuilder (typed, schema-validated)
    HttpRouter.mountApp('/health-check', builderApp, { includePrefix: true }),
    // Swagger UI served from the same HttpApi builder app
    HttpRouter.mountApp('/docs', builderApp, { includePrefix: true }),
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
