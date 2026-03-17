import { HttpServerResponse } from '@effect/platform';
import type { HttpApp } from '@effect/platform';
import { Effect } from 'effect';

const isProduction = process.env.NODE_ENV === 'production';

const SECURITY_HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'SAMEORIGIN',
  'x-xss-protection': '0',
  'x-dns-prefetch-control': 'off',
  'x-download-options': 'noopen',
  'x-permitted-cross-domain-policies': 'none',
  'referrer-policy': 'no-referrer',
  ...(isProduction
    ? {
        'strict-transport-security': 'max-age=15552000; includeSubDomains',
      }
    : {}),
};

export const securityHeadersMiddleware = <E, R>(httpApp: HttpApp.Default<E, R>): HttpApp.Default<E, R> =>
  Effect.map(httpApp, (response) =>
    HttpServerResponse.setHeaders(response, SECURITY_HEADERS),
  );
