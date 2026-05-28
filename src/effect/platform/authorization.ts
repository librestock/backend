import * as HttpServerRequest from '@effect/platform/HttpServerRequest';
import { Effect } from 'effect';
import { eq } from 'drizzle-orm';
import type { Permission, Resource } from '@stocket/types/auth';
import { DrizzleDatabase } from './drizzle';
import { superAdmins } from './db/schema';
import { PermissionProvider } from './permission-provider';
import {
  ForbiddenError,
  InternalError,
  NotFoundError,
} from './domain-errors';
import { isPlatformHost, resolveRequestHost } from './host';
import { requireSession } from './session';
import { getRequestTenantId, resolveTenantForSession } from './tenant-context';

export class PermissionDenied extends ForbiddenError('PermissionDenied') {}
export class PlatformHostRequired extends NotFoundError(
  'PlatformHostRequired',
)<{
  readonly host?: string | null;
}> {}
export class SuperAdminDenied extends ForbiddenError('SuperAdminDenied') {}
export class SuperAdminInfrastructureError extends InternalError(
  'SuperAdminInfrastructureError',
)<{
  readonly cause?: unknown;
}> {}

export const requirePermission = (resource: Resource, permission: Permission) =>
  Effect.gen(function* () {
    const session = yield* requireSession;
    const tenantId =
      (yield* getRequestTenantId) ??
      (yield* resolveTenantForSession(session)).tenantId;
    const permissionProvider = yield* PermissionProvider;
    const { permissions } = yield* permissionProvider.getPermissionsForUser(
      session.user.id,
      tenantId,
    );
    const resourcePermissions = permissions[resource] ?? [];

    yield* Effect.filterOrFail(
      Effect.succeed(resourcePermissions.includes(permission)),
      Boolean,
      () =>
        new PermissionDenied({
          messageKey: 'auth.permissionDenied',
        }),
    );
  });

export const requireSuperAdmin = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const host = resolveRequestHost(request);

  yield* Effect.filterOrFail(
    Effect.succeed(isPlatformHost(host)),
    Boolean,
    () =>
      new PlatformHostRequired({
        host,
        messageKey: 'platform.hostRequired',
      }),
  );

  const session = yield* requireSession;
  const db = yield* DrizzleDatabase;
  const rows = yield* Effect.tryPromise({
    try: () =>
      db
        .select({ user_id: superAdmins.user_id })
        .from(superAdmins)
        .where(eq(superAdmins.user_id, session.user.id))
        .limit(1),
    catch: (cause) =>
      new SuperAdminInfrastructureError({
        cause,
        messageKey: 'superadmin.infrastructureFailed',
      }),
  });

  yield* Effect.filterOrFail(
    Effect.succeed(rows[0]),
    Boolean,
    () => new SuperAdminDenied({ messageKey: 'superadmin.forbidden' }),
  );

  return session;
});
