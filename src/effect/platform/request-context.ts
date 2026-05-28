import { Headers, HttpServerRequest } from '@effect/platform';
import type { HttpMethod } from '@effect/platform/HttpMethod';
import { Context, Effect, Option } from 'effect';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import { resolveLocale, type SupportedLocale } from './messages';

export interface RequestContext {
  readonly requestId: string;
  readonly path: string;
  readonly method: HttpMethod;
  readonly ip: string | null;
  readonly locale: SupportedLocale;
  tenantId?: string;
  tenantName?: string;
  tenantSlug?: string;
}

export const CurrentRequestContext = Context.GenericTag<RequestContext>(
  '@stocket/effect/platform/CurrentRequestContext',
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

  const requestContext: RequestContext = {
    requestId,
    path,
    method: request.method,
    ip: Option.getOrNull(request.remoteAddress),
    locale,
  };

  return requestContext;
});

export const getRequestContext = Effect.flatMap(
  Effect.serviceOption(CurrentRequestContext),
  Option.match({
    onNone: () => makeRequestContext,
    onSome: Effect.succeed,
  }),
);
