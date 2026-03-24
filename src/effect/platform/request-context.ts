import { Headers, HttpServerRequest } from '@effect/platform';
import { Context, Effect, Option } from 'effect';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import { resolveLocale, type SupportedLocale } from './messages';

export interface RequestContext {
  readonly requestId: string;
  readonly path: string;
  readonly method: string;
  readonly ip: string | null;
  readonly locale: SupportedLocale;
}

export const CurrentRequestContext = Context.GenericTag<RequestContext>(
  '@librestock/effect/CurrentRequestContext',
);

export const getRequestId = Effect.map(HttpServerRequest.HttpServerRequest, (request) => {
  const headerValue = Headers.get(request.headers, 'x-request-id');

  if (Option.isSome(headerValue) && uuidValidate(headerValue.value)) {
    return headerValue.value;
  }

  return uuidv4();
});

export const getRequestPath = Effect.map(HttpServerRequest.HttpServerRequest, (request) => {
  const {url} = request;
  const queryStart = url.indexOf('?');
  return queryStart >= 0 ? url.slice(0, queryStart) : url;
});

export const getRequestContext = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const requestId = yield* getRequestId;
  const path = yield* getRequestPath;
  const locale = resolveLocale(
    Option.getOrNull(Headers.get(request.headers, 'accept-language')),
  );

  return {
    requestId,
    path,
    method: request.method,
    ip: Option.getOrNull(request.remoteAddress),
    locale,
  } satisfies RequestContext;
});
