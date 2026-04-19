/**
 * Shared test harness for `roles/router.spec.ts`.
 *
 * Builds a web handler for `rolesRouter` with stubbed:
 *   - `PermissionProvider` (per-test permission map)
 *   - `AuditLogWriter` (vitest spy so we can assert fire-and-forget calls)
 *   - `RolesService` (each test injects its own service stub)
 *
 * Tests also `vi.mock('../../platform/session', ...)` so `requireSession`
 * doesn't need a real Better Auth layer. The router is wrapped with
 * `HttpRouter.catchAllCause(respondCause)` to mirror `buildHttpApp` —
 * without it, `PermissionDenied` / `SessionUnauthorized` failures escape
 * as 500s instead of being mapped to 403 / 401.
 */
import { HttpApp, HttpRouter } from '@effect/platform';
import { type Context, Effect, Layer } from 'effect';
import type { Permission, Resource } from '@librestock/types/auth';
import { AuditLogWriter, type AuditWriteParams } from '../../../platform/audit';
import { respondCause } from '../../../platform/errors';
import { PermissionProvider } from '../../../platform/permission-provider';
import { rolesRouter } from '../router';
import { RolesService } from '../service';

export interface RolesRouterHarnessOptions {
  readonly service: Record<string, unknown>;
  /** Permissions keyed by resource → list of permissions. Defaults to empty (denies everything). */
  readonly permissions?: Partial<Record<Resource, Permission[]>>;
  /**
   * Optional spy used as the audit writer's `log` method. Tests assert
   * this is *called* — the underlying effect is fire-and-forget per
   * `backend/CLAUDE.md`, so coupling to its success is discouraged.
   */
  readonly auditLog?: (
    params: AuditWriteParams,
  ) => Effect.Effect<void, never, unknown>;
}

export interface RolesRouterHarness {
  readonly handler: (request: Request) => Promise<Response>;
  readonly auditSpy: (
    params: AuditWriteParams,
  ) => Effect.Effect<void, never, unknown>;
}

export const makeRolesRouterHarness = (
  opts: RolesRouterHarnessOptions,
): RolesRouterHarness => {
  const permissions = opts.permissions ?? {};
  const auditSpy = opts.auditLog ?? (() => Effect.void);

  const permissionProviderLayer = Layer.succeed(PermissionProvider, {
    getPermissionsForUser: () =>
      Effect.succeed({ roleNames: ['Tester'], permissions }),
  });

  const auditLayer = Layer.succeed(AuditLogWriter, { log: auditSpy });
  const serviceLayer = Layer.succeed(
    RolesService,
    opts.service as unknown as Context.Tag.Service<typeof RolesService>,
  );

  const routerWithErrorHandling = rolesRouter.pipe(
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
