import { SetMetadata } from '@nestjs/common';
import type { Resource, Permission } from '@librestock/types';

export const PERMISSION_KEY = 'required_permission';

export interface RequiredPermission {
  resource: Resource;
  permission: Permission;
}

export const RequirePermission = (resource: Resource, permission: Permission) =>
  SetMetadata(PERMISSION_KEY, { resource, permission });
