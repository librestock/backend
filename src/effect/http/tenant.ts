import type { HttpApp } from '@effect/platform';
import * as HttpServerRequest from '@effect/platform/HttpServerRequest';
import { Effect } from 'effect';
import { requireSession } from '../platform/session';
import { resolveTenantForSession } from '../platform/tenant-context';

const getPathname = (url: string) => {
  try {
    return new URL(url, 'http://localhost').pathname;
  } catch {
    const queryIndex = url.indexOf('?');
    return queryIndex >= 0 ? url.slice(0, queryIndex) : url;
  }
};

const requiresTenantContext = (
  request: HttpServerRequest.HttpServerRequest,
) => {
  const pathname = getPathname(request.url);

  if (request.method === 'OPTIONS') {
    return false;
  }

  return pathname === '/api/v1' || pathname.startsWith('/api/v1/');
};

export const tenantContextMiddleware = <E, R>(httpApp: HttpApp.Default<E, R>) =>
  Effect.flatMap(HttpServerRequest.HttpServerRequest, (request) => {
    if (!requiresTenantContext(request)) {
      return httpApp;
    }

    return Effect.gen(function* () {
      const session = yield* requireSession;
      yield* resolveTenantForSession(session);
      return yield* httpApp;
    });
  });
