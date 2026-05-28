/**
 * Router-test harness for `locationsRouter`.
 *
 * Builds a web handler with stubbed `LocationsService`, `PermissionProvider`,
 * `BetterAuth` (for session), and `AuditLogWriter` layers. The top-level
 * `HttpRouter.catchAllCause(respondCause)` is re-applied here to mirror
 * `buildHttpApp` — without it, guard failures escape as 500 instead of
 * 401/403.
 */
import { HttpApp, HttpRouter } from '@effect/platform';
import { type Context, Effect, Layer } from 'effect';
import type { Permission, Resource } from '@stocket/types/auth';
import { AuditLogWriter, type AuditWriteParams } from '../../../platform/audit';
import { BetterAuth, type BetterAuthService } from '../../../platform/better-auth';
import { respondCause } from '../../../platform/errors';
import { PermissionProvider } from '../../../platform/permission-provider';
import { locationsRouter } from '../router';
import { LocationsService } from '../service';

export const FAKE_USER_ID = '00000000-0000-4000-a000-000000000001';

export const makeFakeSession = (userId = FAKE_USER_ID) => ({
  user: {
    id: userId,
    name: 'Test User',
    email: 'test@example.com',
    image: null,
    emailVerified: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    role: 'user' as const,
  },
  session: {
    id: 'session-1',
    userId,
    token: 'tok',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    expiresAt: new Date('2026-12-01T00:00:00.000Z'),
  },
});

export interface LocationsRouterHarnessOptions {
  readonly service: Record<string, unknown>;
  readonly permissions?: Partial<Record<Resource, Permission[]>>;
  /** `null` → `requireSession` fails with `SessionUnauthorized`. */
  readonly session?: ReturnType<typeof makeFakeSession> | null;
  readonly auditLog?: (
    params: AuditWriteParams,
  ) => Effect.Effect<void, never, unknown>;
}

export interface LocationsRouterHarness {
  readonly handler: (request: Request) => Promise<Response>;
  readonly auditSpy: (
    params: AuditWriteParams,
  ) => Effect.Effect<void, never, unknown>;
}

export const makeLocationsRouterHarness = (
  opts: LocationsRouterHarnessOptions,
): LocationsRouterHarness => {
  const permissions = opts.permissions ?? {};
  const session =
    opts.session === undefined ? makeFakeSession() : opts.session;
  const auditSpy = opts.auditLog ?? (() => Effect.void);

  const permissionProviderLayer = Layer.succeed(PermissionProvider, {
    getPermissionsForUser: () =>
      Effect.succeed({ roleNames: [], permissions }),
  });

  const betterAuthLayer = Layer.succeed(BetterAuth, {
    api: {
      getSession: async () => session,
    } as unknown as BetterAuthService['api'],
    auth: {} as BetterAuthService['auth'],
    handler: (() => {
      throw new Error('handler not available in tests');
    }) as unknown as BetterAuthService['handler'],
  });

  const auditLayer = Layer.succeed(AuditLogWriter, { log: auditSpy });
  const serviceLayer = Layer.succeed(
    LocationsService,
    opts.service as unknown as Context.Tag.Service<typeof LocationsService>,
  );

  const routerWithErrorHandling = locationsRouter.pipe(
    HttpRouter.catchAllCause(respondCause),
  );
  const app = Effect.runSync(HttpRouter.toHttpApp(routerWithErrorHandling));

  const { handler } = HttpApp.toWebHandlerLayer(
    app as never,
    Layer.mergeAll(
      serviceLayer,
      auditLayer,
      betterAuthLayer,
      permissionProviderLayer,
    ) as never,
  );

  return { handler, auditSpy };
};
