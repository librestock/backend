/**
 * Shared test harness for `suppliers/router.spec.ts`.
 *
 * See `roles/__fixtures__/router-harness.ts` for the full rationale.
 * This file mirrors that helper for the `suppliersRouter` — same
 * stub strategy, different service tag and router.
 */
import { HttpApp, HttpRouter } from '@effect/platform';
import { type Context, Effect, Layer } from 'effect';
import type { Permission, Resource } from '@stocket/types/auth';
import { AuditLogWriter, type AuditWriteParams } from '../../../platform/audit';
import { respondCause } from '../../../platform/errors';
import { PermissionProvider } from '../../../platform/permission-provider';
import { suppliersRouter } from '../router';
import { SuppliersService } from '../service';

export interface SuppliersRouterHarnessOptions {
  readonly service: Record<string, unknown>;
  readonly permissions?: Partial<Record<Resource, Permission[]>>;
  readonly auditLog?: (
    params: AuditWriteParams,
  ) => Effect.Effect<void, never, unknown>;
}

export interface SuppliersRouterHarness {
  readonly handler: (request: Request) => Promise<Response>;
  readonly auditSpy: (
    params: AuditWriteParams,
  ) => Effect.Effect<void, never, unknown>;
}

export const makeSuppliersRouterHarness = (
  opts: SuppliersRouterHarnessOptions,
): SuppliersRouterHarness => {
  const permissions = opts.permissions ?? {};
  const auditSpy = opts.auditLog ?? (() => Effect.void);

  const permissionProviderLayer = Layer.succeed(PermissionProvider, {
    getPermissionsForUser: () =>
      Effect.succeed({ roleNames: ['Tester'], permissions }),
  });

  const auditLayer = Layer.succeed(AuditLogWriter, { log: auditSpy });
  const serviceLayer = Layer.succeed(
    SuppliersService,
    opts.service as unknown as Context.Tag.Service<typeof SuppliersService>,
  );

  const routerWithErrorHandling = suppliersRouter.pipe(
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
