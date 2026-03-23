import { Effect } from 'effect';
import type { HttpApp } from '@effect/platform';
import * as HttpServerRequest from '@effect/platform/HttpServerRequest';

const stripQueryString = (url: string) => {
  const queryIndex = url.indexOf('?');
  return queryIndex >= 0 ? url.slice(0, queryIndex) : url;
};

export const requestLoggingMiddleware = <E, R>(httpApp: HttpApp.Default<E, R>): HttpApp.Default<E, R | HttpServerRequest.HttpServerRequest> =>
  Effect.flatMap(HttpServerRequest.HttpServerRequest, (request) => {
    const startTime = Date.now();
    const requestIdHeader = request.headers['x-request-id'];
    const requestId =
      typeof requestIdHeader === 'string' && requestIdHeader.length > 0
        ? requestIdHeader
        : 'unknown';
    const path = stripQueryString(request.url);
    const userAgent = request.headers['user-agent'] ?? 'unknown';

    return Effect.flatMap(httpApp, (response) => {
      const payload = {
        messageKey: 'http.request',
        requestId,
        method: request.method,
        path,
        statusCode: response.status,
        duration: `${Date.now() - startTime}ms`,
        userAgent,
      };

      const log = response.status >= 500
        ? Effect.logError(payload)
        : Effect.log(payload);

      return Effect.as(log, response);
    });
  });
