import { Context, Effect } from 'effect';
import { DataSource } from 'typeorm';
import { Permission, Resource } from '@librestock/types/auth';
import type { CreateRoleDto, UpdateRoleDto, RoleResponseDto } from '../../../routes/roles/dto';
import { RoleEntity } from '../../../routes/roles/entities/role.entity';
import { roleTryAsync, toRoleResponseDto } from '../../../routes/roles/roles.utils';
import {
  RoleNameAlreadyExists,
  RoleNotFound,
  RolesInfrastructureError,
  SystemRoleDeletionForbidden,
} from '../../../routes/roles/roles.errors';
import { TypeOrmDataSource } from '../../platform/typeorm';
import { RolesRepository } from './repository';

export interface UserPermissions {
  readonly roleNames: string[];
  readonly permissions: Partial<Record<Resource, Permission[]>>;
}

interface CacheEntry {
  readonly permissions: UserPermissions;
  readonly expiresAt: number;
}

export interface RolesService {
  readonly findAll: () => Effect.Effect<RoleResponseDto[], RolesInfrastructureError>;
  readonly findById: (
    id: string,
  ) => Effect.Effect<RoleResponseDto, RoleNotFound | RolesInfrastructureError>;
  readonly create: (
    dto: CreateRoleDto,
  ) => Effect.Effect<
    RoleResponseDto,
    RoleNameAlreadyExists | RoleNotFound | RolesInfrastructureError
  >;
  readonly update: (
    id: string,
    dto: UpdateRoleDto,
  ) => Effect.Effect<
    RoleResponseDto,
    RoleNameAlreadyExists | RoleNotFound | RolesInfrastructureError
  >;
  readonly delete: (
    id: string,
  ) => Effect.Effect<
    void,
    RoleNotFound | RolesInfrastructureError | SystemRoleDeletionForbidden
  >;
  readonly getPermissionsForUser: (
    userId: string,
  ) => Effect.Effect<UserPermissions, RolesInfrastructureError>;
  readonly clearCacheForUser: (userId: string) => Effect.Effect<void>;
  readonly clearAllCache: () => Effect.Effect<void>;
  readonly seed: () => Effect.Effect<void, RolesInfrastructureError>;
}

export const RolesService = Context.GenericTag<RolesService>(
  '@librestock/effect/RolesService',
);

const getRoleOrFail = (
  repository: RolesRepository,
  id: string,
): Effect.Effect<RoleEntity, RoleNotFound | RolesInfrastructureError> =>
  Effect.flatMap(
    roleTryAsync('load role', () => repository.findById(id)),
    (role) =>
      role
        ? Effect.succeed(role)
        : Effect.fail(
            new RoleNotFound({
              id,
              message: `Role with ID ${id} not found`,
            }),
          ),
  );

const fetchPermissionsFromDb = (
  dataSource: DataSource,
  userId: string,
): Effect.Effect<UserPermissions, RolesInfrastructureError> =>
  roleTryAsync('load user permissions', async () => {
    const rows: { role_name: string; resource: string; permission: string }[] =
      await dataSource.query(
        `SELECT r.name AS role_name, rp.resource, rp.permission
         FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
         JOIN role_permissions rp ON rp.role_id = ur.role_id
         WHERE ur.user_id = $1`,
        [userId],
      );

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
  });

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

export const makeRolesService = Effect.gen(function* () {
  const repository = yield* RolesRepository;
  const dataSource = yield* TypeOrmDataSource;
  const cache = new Map<string, CacheEntry>();
  const cacheTtlMs = 60_000;

  const clearCacheForUser = (userId: string) =>
    Effect.sync(() => {
      cache.delete(userId);
    });

  const clearAllCache = () =>
    Effect.sync(() => {
      cache.clear();
    });

  const getPermissionsForUser = (userId: string) =>
    Effect.gen(function* () {
      const cached = cache.get(userId);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.permissions;
      }

      const permissions = yield* fetchPermissionsFromDb(dataSource, userId);
      cache.set(userId, {
        permissions,
        expiresAt: Date.now() + cacheTtlMs,
      });

      return permissions;
    });

  return {
    findAll: () =>
      Effect.map(
        roleTryAsync('list roles', () => repository.findAll()),
        (roles) => roles.map(toRoleResponseDto),
      ),
    findById: (id) => Effect.map(getRoleOrFail(repository, id), toRoleResponseDto),
    create: (dto) =>
      Effect.gen(function* () {
        const existing = yield* roleTryAsync('load role by name', () =>
          repository.findByName(dto.name),
        );
        if (existing) {
          return yield* Effect.fail(
            new RoleNameAlreadyExists({
              name: dto.name,
              message: `Role with name "${dto.name}" already exists`,
            }),
          );
        }

        const role = yield* roleTryAsync('create role', () =>
          repository.create({
            name: dto.name,
            description: dto.description ?? null,
            is_system: false,
          }),
        );

        yield* roleTryAsync('replace role permissions', () =>
          repository.replacePermissions(role.id, dto.permissions),
        );

        const created = yield* getRoleOrFail(repository, role.id);
        return toRoleResponseDto(created);
      }),
    update: (id, dto) =>
      Effect.gen(function* () {
        const role = yield* getRoleOrFail(repository, id);

        const nextName = dto.name;
        if (nextName && nextName !== role.name) {
          const existing = yield* roleTryAsync('load role by name', () =>
            repository.findByName(nextName),
          );
          if (existing) {
            return yield* Effect.fail(
              new RoleNameAlreadyExists({
                name: nextName,
                message: `Role with name "${nextName}" already exists`,
              }),
            );
          }
        }

        const updateData: Partial<RoleEntity> = {};
        if (dto.name !== undefined) updateData.name = dto.name;
        if (dto.description !== undefined) {
          updateData.description = dto.description ?? null;
        }

        if (Object.keys(updateData).length > 0) {
          yield* roleTryAsync('update role', () =>
            repository.update(id, updateData),
          );
        }

        if (dto.permissions !== undefined) {
          const permissions = dto.permissions;
          yield* roleTryAsync('replace role permissions', () =>
            repository.replacePermissions(id, permissions),
          );
          yield* clearAllCache();
        }

        const updated = yield* getRoleOrFail(repository, id);
        return toRoleResponseDto(updated);
      }),
    delete: (id) =>
      Effect.gen(function* () {
        const role = yield* getRoleOrFail(repository, id);
        if (role.is_system) {
          return yield* Effect.fail(
            new SystemRoleDeletionForbidden({
              id,
              message: 'System roles cannot be deleted',
            }),
          );
        }

        yield* roleTryAsync('delete role', () => repository.delete(id));
        yield* clearAllCache();
      }),
    getPermissionsForUser,
    clearCacheForUser,
    clearAllCache,
    seed: () =>
      Effect.forEach(seedDefinitions, (seed) =>
        Effect.gen(function* () {
          const existing = yield* roleTryAsync('load role by name', () =>
            repository.findByName(seed.name),
          );
          if (existing) {
            return;
          }

          const role = yield* roleTryAsync('create seed role', () =>
            repository.create({
              name: seed.name,
              description: seed.description,
              is_system: true,
            }),
          );

          yield* roleTryAsync('create seed role permissions', () =>
            repository.replacePermissions(role.id, seed.permissions),
          );
        }),
      ).pipe(Effect.asVoid),
  } satisfies RolesService;
});
