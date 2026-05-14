/**
 * Router-test harness for `productPhotosRouter` + `photosRouter`.
 *
 * The router depends on `PhotosService`, `PermissionProvider`, a Better
 * Auth session, and (for `DELETE`/message envelopes) `AuditLogWriter`
 * isn't used here — photos doesn't audit on its current routes — so we
 * still provide a no-op one in case that changes.
 *
 * We merge both routers with `HttpRouter.concat` to mirror the real
 * application wiring where the two sit at `/products` and `/photos`
 * respectively. `HttpRouter.catchAllCause(respondCause)` is re-applied
 * so guard/decode failures are mapped to 401/403/400.
 *
 * NOTE: the upload route parses `multipart/form-data` via
 * `HttpServerRequest.schemaBodyMultipart`. Decoding a real multipart body
 * in a unit test requires a `FileSystem` and `Path` layer and writes
 * temp files to disk — overkill for a boundary test. Consumers of this
 * harness are expected to mock `@effect/platform`'s multipart entry point
 * at the test-file level (see `router.spec.ts`).
 */
import { HttpApp, HttpRouter } from '@effect/platform';
import { type Context, Effect, Layer } from 'effect';
import type { Permission, Resource } from '@librestock/types/auth';
import { AuditLogWriter, type AuditWriteParams } from '../../../platform/audit';
import { BetterAuth, type BetterAuthService } from '../../../platform/better-auth';
import { respondCause } from '../../../platform/errors';
import { PermissionProvider } from '../../../platform/permission-provider';
import { photosRouter, productPhotosRouter } from '../router';
import { PhotosService } from '../service';

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

export interface PhotosRouterHarnessOptions {
  readonly service: Record<string, unknown>;
  readonly permissions?: Partial<Record<Resource, Permission[]>>;
  readonly session?: ReturnType<typeof makeFakeSession> | null;
  readonly auditLog?: (
    params: AuditWriteParams,
  ) => Effect.Effect<void, never, unknown>;
}

export interface PhotosRouterHarness {
  readonly handler: (request: Request) => Promise<Response>;
  readonly auditSpy: (
    params: AuditWriteParams,
  ) => Effect.Effect<void, never, unknown>;
}

export const makePhotosRouterHarness = (
  opts: PhotosRouterHarnessOptions,
): PhotosRouterHarness => {
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
    PhotosService,
    opts.service as unknown as Context.Tag.Service<typeof PhotosService>,
  );

  const combined = HttpRouter.concat(productPhotosRouter, photosRouter).pipe(
    HttpRouter.catchAllCause(respondCause),
  );
  const app = Effect.runSync(HttpRouter.toHttpApp(combined));

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
