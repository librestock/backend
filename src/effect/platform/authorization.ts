import { Effect } from 'effect';
import type { Permission, Resource } from '@librestock/types/auth';
import { PermissionProvider } from './permission-provider';
import { ForbiddenError } from './domain-errors';
import { requireSession } from './session';
import { getRequestTenantId, resolveTenantForSession } from './tenant-context';

export class PermissionDenied extends ForbiddenError('PermissionDenied') {}

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

    if (!resourcePermissions.includes(permission)) {
      return yield* Effect.fail(
        new PermissionDenied({
          messageKey: 'auth.permissionDenied',
        }),
      );
    }
  });
