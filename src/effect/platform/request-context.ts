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

export const makeRequestContext = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const headerValue = Headers.get(request.headers, 'x-request-id');

  const requestId =
    Option.isSome(headerValue) && uuidValidate(headerValue.value)
      ? headerValue.value
      : uuidv4();
  const { url } = request;
  const queryStart = url.indexOf('?');
  const path = queryStart >= 0 ? url.slice(0, queryStart) : url;
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

export const getRequestContext = Effect.flatMap(
  Effect.serviceOption(CurrentRequestContext),
  Option.match({
    onNone: () => makeRequestContext,
    onSome: Effect.succeed,
  }),
);

export const getRequestId = Effect.map(
  getRequestContext,
  (context) => context.requestId,
);

export const getRequestPath = Effect.map(
  getRequestContext,
  (context) => context.path,
);
