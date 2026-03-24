import { Effect } from 'effect';
import type { Permission, Resource } from '@librestock/types/auth';
import { RolesService } from '../modules/roles/service';
import { ForbiddenError } from './domain-errors';
import { requireSession } from './session';

export class PermissionDenied extends ForbiddenError('PermissionDenied')<{}> {}

export const requirePermission = (resource: Resource, permission: Permission) =>
  Effect.gen(function* () {
    const session = yield* requireSession;
    const rolesService = yield* RolesService;
    const { permissions } = yield* rolesService.getPermissionsForUser(
      session.user.id,
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
