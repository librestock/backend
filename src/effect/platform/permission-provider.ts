import { Context, type Effect } from 'effect';
import type { Permission, Resource } from '@librestock/types/auth';

export interface UserPermissions {
  readonly roleNames: string[];
  readonly permissions: Partial<Record<Resource, Permission[]>>;
}

export class PermissionProvider extends Context.Tag(
  '@librestock/effect/platform/PermissionProvider',
)<
  PermissionProvider,
  {
    readonly getPermissionsForUser: (userId: string) => Effect.Effect<UserPermissions, unknown>;
  }
>() {}
