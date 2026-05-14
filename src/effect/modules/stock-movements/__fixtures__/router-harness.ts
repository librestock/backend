/**
 * Shared test harness for `stock-movements/router.spec.ts`.
 *
 * Mirrors `suppliers/__fixtures__/router-harness.ts`: stubs
 * `PermissionProvider`, `AuditLogWriter`, and the module service, and
 * wraps the router with `catchAllCause(respondCause)` so guard/session
 * failures surface as 401/403 instead of 500.
 */
import { HttpApp, HttpRouter } from '@effect/platform';
import { type Context, Effect, Layer } from 'effect';
import type { Permission, Resource } from '@librestock/types/auth';
import { AuditLogWriter, type AuditWriteParams } from '../../../platform/audit';
import { respondCause } from '../../../platform/errors';
import { PermissionProvider } from '../../../platform/permission-provider';
import { stockMovementsRouter } from '../router';
import { StockMovementsService } from '../service';

export interface StockMovementsRouterHarnessOptions {
  readonly service: Record<string, unknown>;
  readonly permissions?: Partial<Record<Resource, Permission[]>>;
  readonly auditLog?: (
    params: AuditWriteParams,
  ) => Effect.Effect<void, never, unknown>;
}

export interface StockMovementsRouterHarness {
  readonly handler: (request: Request) => Promise<Response>;
  readonly auditSpy: (
    params: AuditWriteParams,
  ) => Effect.Effect<void, never, unknown>;
}

export const makeStockMovementsRouterHarness = (
  opts: StockMovementsRouterHarnessOptions,
): StockMovementsRouterHarness => {
  const permissions = opts.permissions ?? {};
  const auditSpy = opts.auditLog ?? (() => Effect.void);

  const permissionProviderLayer = Layer.succeed(PermissionProvider, {
    getPermissionsForUser: () =>
      Effect.succeed({ roleNames: ['Tester'], permissions }),
  });

  const auditLayer = Layer.succeed(AuditLogWriter, { log: auditSpy });
  const serviceLayer = Layer.succeed(
    StockMovementsService,
    opts.service as unknown as Context.Tag.Service<
      typeof StockMovementsService
    >,
  );

  const routerWithErrorHandling = stockMovementsRouter.pipe(
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
