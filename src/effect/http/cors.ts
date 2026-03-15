import { HttpServerResponse } from '@effect/platform';
import * as HttpServerRequest from '@effect/platform/HttpServerRequest';
import type { HttpApp } from '@effect/platform';
import { Effect } from 'effect';

const CORS_MAX_AGE_SECONDS = 86_400;

const parseCorsOrigins = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

const createCorsConfig = () => {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isProduction = nodeEnv === 'production';
  const origins = parseCorsOrigins(process.env.CORS_ORIGIN);

  if (isProduction && (origins.length === 0 || origins.includes('*'))) {
    throw new Error(
      'CORS_ORIGIN must be set to a specific origin in production (not "*" or empty)',
    );
  }

  const isAllowedOrigin =
    origins.length === 0 || (origins.length === 1 && origins[0] === '*')
      ? (origin: string) => typeof origin === 'string' && origin.length > 0
      : (origin: string) => origins.includes(origin);

  return { isAllowedOrigin };
};

const { isAllowedOrigin } = createCorsConfig();

const ALLOWED_METHODS = 'GET, HEAD, PUT, PATCH, POST, DELETE';

const getCorsHeaders = (
  origin: string | undefined,
): Record<string, string> | null => {
  if (!origin || !isAllowedOrigin(origin)) return null;

  return {
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
    vary: 'Origin',
  };
};

const getPreflightHeaders = (
  origin: string,
  accessControlRequestHeaders?: string,
): Record<string, string> => ({
  'access-control-allow-origin': origin,
  'access-control-allow-credentials': 'true',
  'access-control-allow-methods': ALLOWED_METHODS,
  ...(accessControlRequestHeaders
    ? { 'access-control-allow-headers': accessControlRequestHeaders }
    : {}),
  'access-control-max-age': String(CORS_MAX_AGE_SECONDS),
  vary: 'Origin, Access-Control-Request-Headers',
});

export const corsMiddleware = <E, R>(httpApp: HttpApp.Default<E, R>): HttpApp.Default<E, R | HttpServerRequest.HttpServerRequest> =>
  Effect.flatMap(HttpServerRequest.HttpServerRequest, (request) => {
    const origin = request.headers['origin'];

    if (request.method === 'OPTIONS' && origin && isAllowedOrigin(origin)) {
      const accessControlRequestHeaders =
        request.headers['access-control-request-headers'];
      return Effect.succeed(
        HttpServerResponse.empty({
          status: 204,
          headers: getPreflightHeaders(
            origin,
            typeof accessControlRequestHeaders === 'string'
              ? accessControlRequestHeaders
              : undefined,
          ),
        }),
      );
    }

    const corsHeaders = getCorsHeaders(origin);

    if (!corsHeaders) {
      return httpApp;
    }

    return Effect.map(httpApp, (response) =>
      HttpServerResponse.setHeaders(response, corsHeaders),
    );
  });
