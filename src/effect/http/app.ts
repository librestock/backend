import { HttpApp, HttpRouter, HttpServerResponse } from '@effect/platform';
import * as HttpServerRequest from '@effect/platform/HttpServerRequest';
import { Effect, Option } from 'effect';
import { auth } from '../../auth';
import { apiRouter } from '../modules';
import { healthRouter } from '../modules/health/router';
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
