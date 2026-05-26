import { Permission, Resource } from '@librestock/types/auth';

export interface DefaultRoleSeed {
  readonly name: string;
  readonly description: string;
  readonly permissions: { resource: Resource; permission: Permission }[];
}

export const defaultRoleSeedDefinitions: DefaultRoleSeed[] = [
  {
    name: 'Admin',
    description: 'Full system access',
    permissions: [
      { resource: Resource.DASHBOARD, permission: Permission.READ },
      { resource: Resource.ORDERS, permission: Permission.READ },
      { resource: Resource.ORDERS, permission: Permission.WRITE },
      { resource: Resource.CLIENTS, permission: Permission.READ },
      { resource: Resource.CLIENTS, permission: Permission.WRITE },
      { resource: Resource.SUPPLIERS, permission: Permission.READ },
      { resource: Resource.SUPPLIERS, permission: Permission.WRITE },
      { resource: Resource.STOCK_MOVEMENTS, permission: Permission.READ },
      { resource: Resource.STOCK_MOVEMENTS, permission: Permission.WRITE },
      { resource: Resource.PRODUCTS, permission: Permission.READ },
      { resource: Resource.PRODUCTS, permission: Permission.WRITE },
      { resource: Resource.LOCATIONS, permission: Permission.READ },
      { resource: Resource.LOCATIONS, permission: Permission.WRITE },
      { resource: Resource.INVENTORY, permission: Permission.READ },
      { resource: Resource.INVENTORY, permission: Permission.WRITE },
      { resource: Resource.AUDIT_LOGS, permission: Permission.READ },
      { resource: Resource.USERS, permission: Permission.READ },
      { resource: Resource.USERS, permission: Permission.WRITE },
      { resource: Resource.SETTINGS, permission: Permission.READ },
      { resource: Resource.SETTINGS, permission: Permission.WRITE },
      { resource: Resource.ROLES, permission: Permission.READ },
      { resource: Resource.ROLES, permission: Permission.WRITE },
    ],
  },
  {
    name: 'Warehouse Manager',
    description: 'Manage warehouse operations',
    permissions: [
      { resource: Resource.DASHBOARD, permission: Permission.READ },
      { resource: Resource.STOCK_MOVEMENTS, permission: Permission.READ },
      { resource: Resource.STOCK_MOVEMENTS, permission: Permission.WRITE },
      { resource: Resource.SUPPLIERS, permission: Permission.READ },
      { resource: Resource.SUPPLIERS, permission: Permission.WRITE },
      { resource: Resource.PRODUCTS, permission: Permission.READ },
      { resource: Resource.PRODUCTS, permission: Permission.WRITE },
      { resource: Resource.LOCATIONS, permission: Permission.READ },
      { resource: Resource.LOCATIONS, permission: Permission.WRITE },
      { resource: Resource.INVENTORY, permission: Permission.READ },
      { resource: Resource.INVENTORY, permission: Permission.WRITE },
      { resource: Resource.SETTINGS, permission: Permission.READ },
      { resource: Resource.SETTINGS, permission: Permission.WRITE },
    ],
  },
  {
    name: 'Picker',
    description: 'Pick and manage inventory',
    permissions: [
      { resource: Resource.DASHBOARD, permission: Permission.READ },
      { resource: Resource.ORDERS, permission: Permission.READ },
      { resource: Resource.STOCK_MOVEMENTS, permission: Permission.READ },
      { resource: Resource.PRODUCTS, permission: Permission.READ },
      { resource: Resource.LOCATIONS, permission: Permission.READ },
      { resource: Resource.INVENTORY, permission: Permission.READ },
      { resource: Resource.INVENTORY, permission: Permission.WRITE },
      { resource: Resource.SETTINGS, permission: Permission.READ },
      { resource: Resource.SETTINGS, permission: Permission.WRITE },
    ],
  },
  {
    name: 'Sales',
    description: 'View products and orders',
    permissions: [
      { resource: Resource.DASHBOARD, permission: Permission.READ },
      { resource: Resource.ORDERS, permission: Permission.READ },
      { resource: Resource.ORDERS, permission: Permission.WRITE },
      { resource: Resource.CLIENTS, permission: Permission.READ },
      { resource: Resource.CLIENTS, permission: Permission.WRITE },
      { resource: Resource.PRODUCTS, permission: Permission.READ },
      { resource: Resource.INVENTORY, permission: Permission.READ },
      { resource: Resource.SETTINGS, permission: Permission.READ },
      { resource: Resource.SETTINGS, permission: Permission.WRITE },
    ],
  },
];
