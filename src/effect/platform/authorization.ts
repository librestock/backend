import { Data, Effect } from 'effect';
import type { Permission, Resource } from '@librestock/types/auth';
import { requireSession } from './session';
import { RolesService } from '../modules/roles/service';

export class PermissionDenied extends Data.TaggedError('PermissionDenied')<{
  readonly message: string;
}> {
  readonly statusCode = 403 as const;
}

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
          message: 'Insufficient permissions',
        }),
      );
    }
  });
