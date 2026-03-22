import { Effect, Layer } from 'effect';
import { DrizzleDatabase } from '../../platform/drizzle';
import { BetterAuth } from '../../platform/better-auth';
import { makeHealthService } from './service';

jest.mock('../../platform/better-auth', () => {
  const { Context, Layer } =
    jest.requireActual<typeof import('effect')>('effect');

  return {
    BetterAuth: Context.GenericTag('@librestock/test/BetterAuth'),
    betterAuthLayer: Layer.empty,
  };
});

describe('makeHealthService', () => {
  const originalBetterAuthSecret = process.env.BETTER_AUTH_SECRET;

  beforeEach(() => {
    process.env.BETTER_AUTH_SECRET = 'test-secret';
  });

  afterAll(() => {
    if (originalBetterAuthSecret === undefined) {
      delete process.env.BETTER_AUTH_SECRET;
      return;
    }

    process.env.BETTER_AUTH_SECRET = originalBetterAuthSecret;
  });

  it('returns an ok liveness payload', async () => {
    const service = makeHealthService();

    await expect(
      Effect.runPromise(service.live as Effect.Effect<any, never, never>),
    ).resolves.toEqual({
      status: 'ok',
      info: {},
      error: {},
      details: {},
    });
  });

  it('reports readiness when the database is reachable', async () => {
    const service = makeHealthService();
    const dataSource = {
      execute: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

    const result = await Effect.runPromise(
      (service.ready.pipe(
        Effect.provideService(DrizzleDatabase, dataSource as any),
      ) as Effect.Effect<any, never, never>),
    );

    expect(result).toEqual({
      status: 'ok',
      info: {
        database: {
          status: 'up',
        },
      },
      error: {},
      details: {
        database: {
          status: 'up',
        },
      },
    });
  });

  it('reports a degraded health-check when the database is down', async () => {
    const service = makeHealthService();
    const dataSource = {
      execute: jest.fn().mockRejectedValue(new Error('database offline')),
    };

    const result = await Effect.runPromise(
      (service.healthCheck.pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.succeed(DrizzleDatabase, dataSource as any),
            Layer.succeed(BetterAuth, {
              auth: {} as any,
              api: {} as any,
              handler: jest.fn(),
            }),
          ),
        ),
      ) as Effect.Effect<any, never, never>),
    );

    expect(result).toEqual({
      status: 'error',
      info: {
        'better-auth': {
          status: 'up',
          message: 'Better Auth is properly configured',
        },
      },
      error: {
        database: {
          status: 'down',
          message: 'database offline',
        },
      },
      details: {
        database: {
          status: 'down',
          message: 'database offline',
        },
        'better-auth': {
          status: 'up',
          message: 'Better Auth is properly configured',
        },
      },
    });
  });
});
