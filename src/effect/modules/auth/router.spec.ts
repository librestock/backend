import { Effect, Layer } from 'effect';
import { HttpApp, HttpRouter } from '@effect/platform';
import { authRouter } from './router';
import { AuthService } from './service';

jest.mock('./service', () => {
  const { Context, Layer } =
    jest.requireActual<typeof import('effect')>('effect');

  return {
    AuthService: Context.GenericTag('@librestock/test/AuthService'),
    authLayer: Layer.empty,
  };
});

jest.mock('uuid', () => ({
  v4: () => '00000000-0000-4000-8000-000000000000',
  validate: () => true,
}));

describe('authRouter', () => {
  const makeHandler = (service: any) => {
    const app = Effect.runSync(HttpRouter.toHttpApp(authRouter));

    return HttpApp.toWebHandlerLayer(
      app,
      Layer.succeed(AuthService, service),
    ).handler;
  };

  it('returns the me payload', async () => {
    const handler = makeHandler({
      me: () =>
        Effect.succeed({
          id: 'user-1',
          name: 'Jane Doe',
          email: 'jane@example.com',
          roles: ['Admin'],
          permissions: {},
        }),
      profile: () => Effect.void,
      sessionClaims: () => Effect.void,
    });

    const response = await handler(new Request('http://localhost/auth/me'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: 'user-1',
      roles: ['Admin'],
    });
  });

  it('returns profile and session-claims payloads', async () => {
    const handler = makeHandler({
      me: () => Effect.void,
      profile: () =>
        Effect.succeed({
          id: 'user-1',
          name: 'Jane Doe',
          email: 'jane@example.com',
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-10T00:00:00.000Z',
        }),
      sessionClaims: () =>
        Effect.succeed({
          user_id: 'user-1',
          session_id: 'session-1',
          issued_at: 1,
          expires_at: 2,
        }),
    });

    const profileResponse = await handler(
      new Request('http://localhost/auth/profile'),
    );
    const claimsResponse = await handler(
      new Request('http://localhost/auth/session-claims'),
    );

    expect(profileResponse.status).toBe(200);
    expect(claimsResponse.status).toBe(200);
  });

  it('returns 401 when unauthenticated', async () => {
    const handler = makeHandler({
      me: () =>
        Effect.fail({
          _tag: 'SessionUnauthorized',
          message: 'Unauthorized',
          statusCode: 401,
        }),
      profile: () => Effect.void,
      sessionClaims: () => Effect.void,
    });

    const response = await handler(new Request('http://localhost/auth/me'));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      statusCode: 401,
      message: 'Unauthorized',
    });
  });
});
