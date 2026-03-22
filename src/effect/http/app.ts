import { HttpApp, HttpRouter, HttpServerResponse } from '@effect/platform';
import * as HttpServerRequest from '@effect/platform/HttpServerRequest';
import { Effect, Option } from 'effect';
import { auth } from '../../auth';
import { apiRouter } from '../modules';
import { healthRouter } from '../modules/health/router';
import { respondCause } from '../platform/errors';
import { corsMiddleware } from './cors';
import { securityHeadersMiddleware } from './security-headers';
import { requestLoggingMiddleware } from './logging';

const MAX_REQUEST_BODY_BYTES = 10 * 1024 * 1024;

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

const authHandlerRouter = HttpRouter.empty.pipe(
  HttpRouter.mountApp('/api/auth', HttpApp.fromWebHandler(auth.handler), {
    includePrefix: true,
  }),
);

const appRouter = HttpRouter.concatAll(
  healthRouter,
  authHandlerRouter,
  apiRouter,
).pipe(HttpRouter.catchAllCause(respondCause));

const baseHttpApp = Effect.runSync(HttpRouter.toHttpApp(appRouter)).pipe(
  Effect.catchAllCause(respondCause),
);

export const httpApp = requestLoggingMiddleware(
  securityHeadersMiddleware(corsMiddleware(bodyLimitMiddleware(baseHttpApp))),
);
