import { Headers, HttpServerRequest } from '@effect/platform';
import { Effect, Option } from 'effect';
import type { LinkDefinition } from '../../common/hateoas/hateoas-link.dto';

const getProtocol = (request: HttpServerRequest.HttpServerRequest) => {
  const forwardedProtocol = Headers.get(request.headers, 'x-forwarded-proto');
  if (Option.isSome(forwardedProtocol) && forwardedProtocol.value.length > 0) {
    return forwardedProtocol.value.split(',')[0]!.trim();
  }

  return 'http';
};

export const getBaseUrl = Effect.map(
  HttpServerRequest.HttpServerRequest,
  (request) => {
    const hostHeader = Headers.get(request.headers, 'host');
    const host = Option.isSome(hostHeader) ? hostHeader.value : 'localhost';
    return `${getProtocol(request)}://${host}/api/v1`;
  },
);

type HateoasTarget = Record<string, unknown>;

const resolveHref = (
  target: HateoasTarget,
  baseUrl: string,
  definition: LinkDefinition,
) => {
  const href =
    typeof definition.href === 'function'
      ? definition.href(target)
      : definition.href;

  return href.startsWith('http') ? href : `${baseUrl}${href}`;
};

export const addHateoasLinks = <T extends HateoasTarget>(
  data: T,
  baseUrl: string,
  linkDefinitions: readonly LinkDefinition[],
): T & {
  readonly _links: Record<string, { href: string; method?: string }>;
} => ({
  ...data,
  _links: Object.fromEntries(
    linkDefinitions.map((definition) => [
      definition.rel,
      {
        href: resolveHref(data, baseUrl, definition),
        ...(definition.method ? { method: definition.method } : {}),
      },
    ]),
  ),
});
