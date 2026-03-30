import { Effect, Ref } from 'effect';
import { eq } from 'drizzle-orm';
import { Permission, Resource } from '@librestock/types/auth';
import type { CreateRoleDto, UpdateRoleDto } from '@librestock/types/roles';
import { DrizzleDatabase } from '../../platform/drizzle';
import { userRoles, roles, rolePermissions } from '../../platform/db/schema';
import type { UserPermissions } from '../../platform/permission-provider';
import { toRoleResponseDto, type RoleWithPermissions } from './roles.utils';
import {
  RoleNameAlreadyExists,
  RoleNotFound,
  RolesInfrastructureError,
  SystemRoleDeletionForbidden,
} from './roles.errors';
import { RolesRepository } from './repository';

export type { UserPermissions };

interface CacheEntry {
  readonly permissions: UserPermissions;
  readonly expiresAt: number;
}

const seedDefinitions: {
  readonly name: string;
  readonly description: string;
  readonly permissions: { resource: Resource; permission: Permission }[];
}[] = [
  {
    name: 'Admin',
    description: 'Full system access',
    permissions: [
      { resource: Resource.DASHBOARD, permission: Permission.READ },
      { resource: Resource.STOCK, permission: Permission.READ },
      { resource: Resource.STOCK, permission: Permission.WRITE },
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
      { resource: Resource.STOCK, permission: Permission.READ },
      { resource: Resource.STOCK, permission: Permission.WRITE },
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
      { resource: Resource.STOCK, permission: Permission.READ },
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
    description: 'View stock and products',
    permissions: [
      { resource: Resource.DASHBOARD, permission: Permission.READ },
      { resource: Resource.STOCK, permission: Permission.READ },
      { resource: Resource.PRODUCTS, permission: Permission.READ },
      { resource: Resource.INVENTORY, permission: Permission.READ },
      { resource: Resource.SETTINGS, permission: Permission.READ },
      { resource: Resource.SETTINGS, permission: Permission.WRITE },
    ],
  },
];

export class RolesService extends Effect.Service<RolesService>()(
  '@librestock/effect/RolesService',
  {
    effect: Effect.gen(function* () {
      const repository = yield* RolesRepository;
      const db = yield* DrizzleDatabase;
      const cache = yield* Ref.make(new Map<string, CacheEntry>());
      const cacheTtlMs = 60_000;

      const getRoleOrFail = (
        id: string,
      ): Effect.Effect<RoleWithPermissions, RoleNotFound | RolesInfrastructureError> =>
        Effect.flatMap(repository.findById(id), (role) =>
          role
            ? Effect.succeed(role)
            : Effect.fail(
                new RoleNotFound({
                  id,
                  messageKey: 'roles.notFound',
                }),
              ),
        );

      const fetchPermissionsFromDb = (
        userId: string,
      ): Effect.Effect<UserPermissions, RolesInfrastructureError> =>
        Effect.tryPromise({
          try: async () => {
            const rows = await db
              .select({
                role_name: roles.name,
                resource: rolePermissions.resource,
                permission: rolePermissions.permission,
              })
              .from(userRoles)
              .innerJoin(roles, eq(roles.id, userRoles.role_id))
              .innerJoin(rolePermissions, eq(rolePermissions.role_id, userRoles.role_id))
              .where(eq(userRoles.user_id, userId));

            const roleNames = [...new Set(rows.map((row) => row.role_name))];
            const permissionMap: Record<string, Set<string>> = {};

            for (const row of rows) {
              const resourcePermissions = (permissionMap[row.resource] ??= new Set());
              resourcePermissions.add(row.permission);
            }

            const permissions: Partial<Record<Resource, Permission[]>> = {};
            for (const [resource, permissionSet] of Object.entries(permissionMap)) {
              permissions[resource as Resource] = [...permissionSet] as Permission[];
            }

            return { roleNames, permissions };
          },
          catch: (cause) =>
            new RolesInfrastructureError({
              action: 'load user permissions',
              cause,
              messageKey: 'roles.loadPermissionsFailed',
            }),
        });

      const clearCacheForUser = (userId: string) =>
        Ref.update(cache, (current) => {
          const next = new Map(current);
          next.delete(userId);
          return next;
        });

      const clearAllCache = () =>
        Ref.set(cache, new Map());

      const getPermissionsForUser = (userId: string) =>
        Effect.gen(function* () {
          const currentCache = yield* Ref.get(cache);
          const cached = currentCache.get(userId);
          if (cached && cached.expiresAt > Date.now()) {
            return cached.permissions;
          }

          const permissions = yield* fetchPermissionsFromDb(userId);
          yield* Ref.update(cache, (entries) => {
            const next = new Map(entries);
            next.set(userId, {
              permissions,
              expiresAt: Date.now() + cacheTtlMs,
            });
            return next;
          });

          return permissions;
        });

      return {
        findAll: () =>
          Effect.map(repository.findAll(), (roles) =>
            roles.map(toRoleResponseDto),
          ).pipe(Effect.withSpan('RolesService.findAll')),
        findById: (id: string) =>
          Effect.map(getRoleOrFail(id), toRoleResponseDto).pipe(
            Effect.withSpan('RolesService.findById', { attributes: { id } }),
          ),
        create: (dto: CreateRoleDto) =>
          Effect.gen(function* () {
            const existing = yield* repository.findByName(dto.name);
            if (existing) {
              return yield* Effect.fail(
                new RoleNameAlreadyExists({
                  name: dto.name,
                  messageKey: 'roles.nameAlreadyExists',
                }),
              );
            }

            const role = yield* repository.create({
              name: dto.name,
              description: dto.description ?? null,
              is_system: false,
            });

            yield* repository.replacePermissions(role.id, dto.permissions);

            const created = yield* getRoleOrFail(role.id);
            return toRoleResponseDto(created);
          }).pipe(Effect.withSpan('RolesService.create')),
        update: (id: string, dto: UpdateRoleDto) =>
          Effect.gen(function* () {
            const role = yield* getRoleOrFail(id);

            const nextName = dto.name;
            if (nextName && nextName !== role.name) {
              const existing = yield* repository.findByName(nextName);
              if (existing) {
                return yield* Effect.fail(
                  new RoleNameAlreadyExists({
                    name: nextName,
                    messageKey: 'roles.nameAlreadyExists',
                  }),
                );
              }
            }

            const updateData: Partial<typeof roles.$inferInsert> = {};
            if (dto.name !== undefined) updateData.name = dto.name;
            if (dto.description !== undefined) {
              updateData.description = dto.description ?? null;
            }

            if (Object.keys(updateData).length > 0) {
              yield* repository.update(id, updateData);
            }

            if (dto.permissions !== undefined) {
              const {permissions} = dto;
              yield* repository.replacePermissions(id, permissions);
              yield* clearAllCache();
            }

            const updated = yield* getRoleOrFail(id);
            return toRoleResponseDto(updated);
          }).pipe(Effect.withSpan('RolesService.update', { attributes: { id } })),
        delete: (id: string) =>
          Effect.gen(function* () {
            const role = yield* getRoleOrFail(id);
            if (role.is_system) {
              return yield* Effect.fail(
                new SystemRoleDeletionForbidden({
                  id,
                  messageKey: 'roles.systemDeletionForbidden',
                }),
              );
            }

            yield* repository.delete(id);
            yield* clearAllCache();
          }).pipe(Effect.withSpan('RolesService.delete', { attributes: { id } })),
        getPermissionsForUser: (userId: string) =>
          getPermissionsForUser(userId).pipe(
            Effect.withSpan('RolesService.getPermissionsForUser', { attributes: { userId } }),
          ),
        clearCacheForUser: (userId: string) =>
          clearCacheForUser(userId).pipe(
            Effect.withSpan('RolesService.clearCacheForUser', { attributes: { userId } }),
          ),
        clearAllCache: () =>
          clearAllCache().pipe(Effect.withSpan('RolesService.clearAllCache')),
        seed: () =>
          Effect.forEach(seedDefinitions, (seed) =>
            Effect.gen(function* () {
              const existing = yield* repository.findByName(seed.name);
              if (existing) {
                return;
              }

              const role = yield* repository.create({
                name: seed.name,
                description: seed.description,
                is_system: true,
              });

              yield* repository.replacePermissions(role.id, seed.permissions);
            }),
          ).pipe(Effect.asVoid, Effect.withSpan('RolesService.seed')),
      };
    }),
    dependencies: [RolesRepository.Default],
  },
) {}
