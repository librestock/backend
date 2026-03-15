import { Schema } from 'effect';
import { Permission, Resource } from '@librestock/types/auth';

const ResourceValues = [
  Resource.DASHBOARD,
  Resource.STOCK,
  Resource.ORDERS,
  Resource.CLIENTS,
  Resource.SUPPLIERS,
  Resource.STOCK_MOVEMENTS,
  Resource.PRODUCTS,
  Resource.LOCATIONS,
  Resource.INVENTORY,
  Resource.AUDIT_LOGS,
  Resource.USERS,
  Resource.SETTINGS,
  Resource.ROLES,
] as const;

const PermissionValues = [Permission.READ, Permission.WRITE] as const;

const RolePermissionSchema = Schema.Struct({
  resource: Schema.Literal(...ResourceValues),
  permission: Schema.Literal(...PermissionValues),
});

export const RoleIdSchema = Schema.UUID.annotations({ identifier: 'RoleId' });

export const CreateRoleSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  description: Schema.optional(Schema.String.pipe(Schema.maxLength(500))),
  permissions: Schema.Array(RolePermissionSchema),
}).annotations({ identifier: 'CreateRole' });

export const UpdateRoleSchema = Schema.Struct({
  name: Schema.optional(
    Schema.String.pipe(Schema.minLength(1), Schema.maxLength(100)),
  ),
  description: Schema.optional(Schema.String.pipe(Schema.maxLength(500))),
  permissions: Schema.optional(Schema.Array(RolePermissionSchema)),
}).annotations({ identifier: 'UpdateRole' });
