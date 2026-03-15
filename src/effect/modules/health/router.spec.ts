jest.mock('./service', () => {
  const { Context } = require('effect');

  return {
    HealthService: Context.GenericTag('@librestock/test/HealthService'),
  };
});

jest.mock('uuid', () => ({
  v4: () => '00000000-0000-4000-8000-000000000000',
  validate: () => true,
}));

import { Effect, Layer } from 'effect';
import { HttpApp, HttpRouter } from '@effect/platform';
import { healthRouter } from './router';
import { HealthService } from './service';

describe('healthRouter', () => {
  const makeHandler = (service: any) => {
    const app = Effect.runSync(HttpRouter.toHttpApp(healthRouter));

    return HttpApp.toWebHandlerLayer(
      app,
      Layer.succeed(HealthService, service),
    ).handler;
  };

  it('returns 200 for a healthy health-check', async () => {
    const handler = makeHandler({
      live: Effect.succeed({ status: 'ok', info: {}, error: {}, details: {} }),
      ready: Effect.succeed({ status: 'ok', info: {}, error: {}, details: {} }),
      healthCheck: Effect.succeed({
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      }),
    });

    const response = await handler(new Request('http://localhost/health-check'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'ok',
    });
  });

  it('returns 503 for a degraded health-check', async () => {
    const handler = makeHandler({
      live: Effect.succeed({ status: 'ok', info: {}, error: {}, details: {} }),
      ready: Effect.succeed({ status: 'ok', info: {}, error: {}, details: {} }),
      healthCheck: Effect.succeed({
        status: 'error',
        info: {},
        error: { database: { status: 'down', message: 'offline' } },
        details: { database: { status: 'down', message: 'offline' } },
      }),
    });

    const response = await handler(new Request('http://localhost/health-check'));

    expect(response.status).toBe(503);
  });

  it('serves liveness and readiness endpoints', async () => {
    const handler = makeHandler({
      live: Effect.succeed({
        status: 'ok',
        info: {},
        error: {},
        details: {},
      }),
      ready: Effect.succeed({
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      }),
      healthCheck: Effect.succeed({
        status: 'ok',
        info: {},
        error: {},
        details: {},
      }),
    });

    const liveResponse = await handler(
      new Request('http://localhost/health-check/live'),
    );
    const readyResponse = await handler(
      new Request('http://localhost/health-check/ready'),
    );

    expect(liveResponse.status).toBe(200);
    expect(readyResponse.status).toBe(200);
  });
});
