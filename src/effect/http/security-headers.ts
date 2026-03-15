import { HttpApp, HttpMiddleware, HttpServerResponse } from '@effect/platform';
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

export const securityHeadersMiddleware = HttpMiddleware.make((httpApp) =>
  HttpApp.withPreResponseHandler(httpApp, (_request, response) =>
    Effect.succeed(HttpServerResponse.setHeaders(response, SECURITY_HEADERS)),
  ),
);
