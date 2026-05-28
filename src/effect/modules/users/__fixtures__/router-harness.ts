/**
 * Shared test harness for `users/router.spec.ts`.
 *
 * Similar to the other module harnesses, but note: the users router
 * uses `getRequestHeaders` and `Effect.provideService(BetterAuthHeaders, ...)`
 * on the service call. We don't wire a `BetterAuth` / `BetterAuthHeaders`
 * tag here because the mocked service never reads it — `provideService`
 * is a no-op when the underlying effect doesn't require the tag.
 */
import { HttpApp, HttpRouter } from '@effect/platform';
import { type Context, Effect, Layer } from 'effect';
import type { Permission, Resource } from '@stocket/types/auth';
import { AuditLogWriter, type AuditWriteParams } from '../../../platform/audit';
import { respondCause } from '../../../platform/errors';
import { PermissionProvider } from '../../../platform/permission-provider';
import { usersRouter } from '../router';
import { UsersService } from '../service';

export interface UsersRouterHarnessOptions {
  readonly service: Record<string, unknown>;
  readonly permissions?: Partial<Record<Resource, Permission[]>>;
  readonly auditLog?: (
    params: AuditWriteParams,
  ) => Effect.Effect<void, never, unknown>;
}

export interface UsersRouterHarness {
  readonly handler: (request: Request) => Promise<Response>;
  readonly auditSpy: (
    params: AuditWriteParams,
  ) => Effect.Effect<void, never, unknown>;
}

export const makeUsersRouterHarness = (
  opts: UsersRouterHarnessOptions,
): UsersRouterHarness => {
  const permissions = opts.permissions ?? {};
  const auditSpy = opts.auditLog ?? (() => Effect.void);

  const permissionProviderLayer = Layer.succeed(PermissionProvider, {
    getPermissionsForUser: () =>
      Effect.succeed({ roleNames: ['Tester'], permissions }),
  });

  const auditLayer = Layer.succeed(AuditLogWriter, { log: auditSpy });
  const serviceLayer = Layer.succeed(
    UsersService,
    opts.service as unknown as Context.Tag.Service<typeof UsersService>,
  );

  const routerWithErrorHandling = usersRouter.pipe(
    HttpRouter.catchAllCause(respondCause),
  );
  const app = Effect.runSync(HttpRouter.toHttpApp(routerWithErrorHandling));

  const { handler } = HttpApp.toWebHandlerLayer(
    app as never,
    Layer.mergeAll(
      serviceLayer,
      auditLayer,
      permissionProviderLayer,
    ) as never,
  );

  return { handler, auditSpy };
};
