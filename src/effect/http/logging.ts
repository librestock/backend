import { Context, Effect } from 'effect';
import { HttpApp, HttpMiddleware } from '@effect/platform';
import * as HttpServerRequest from '@effect/platform/HttpServerRequest';

const stripQueryString = (url: string) => {
  const queryIndex = url.indexOf('?');
  return queryIndex >= 0 ? url.slice(0, queryIndex) : url;
};

export const requestLoggingMiddleware = HttpMiddleware.make((httpApp) =>
  Effect.withFiberRuntime((fiber) => {
    const request = Context.unsafeGet(
      fiber.currentContext,
      HttpServerRequest.HttpServerRequest,
    );
    const startTime = Date.now();
    const requestIdHeader = request.headers['x-request-id'];
    const requestId =
      typeof requestIdHeader === 'string' && requestIdHeader.length > 0
        ? requestIdHeader
        : 'unknown';
    const path = stripQueryString(request.url);
    const userAgent = request.headers['user-agent'] ?? 'unknown';

    return HttpApp.withPreResponseHandler(httpApp, (_request, response) =>
      Effect.sync(() => {
        const payload = {
          message: 'HTTP request',
          requestId,
          method: request.method,
          path,
          statusCode: response.status,
          duration: `${Date.now() - startTime}ms`,
          userAgent,
        };
        const serialized = JSON.stringify(payload);

        if (response.status >= 500) {
          console.error(serialized);
        } else {
          console.log(serialized);
        }

        return response;
      }),
    );
  }),
);
