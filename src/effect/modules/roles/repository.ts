import { Context, Effect } from 'effect';
import { Repository } from 'typeorm';
import { TypeOrmDataSource } from '../../platform/typeorm';
import { RoleEntity } from '../../../routes/roles/entities/role.entity';
import { RolePermissionEntity } from '../../../routes/roles/entities/role-permission.entity';

export interface RolesRepository {
  readonly findAll: () => Promise<RoleEntity[]>;
  readonly findById: (id: string) => Promise<RoleEntity | null>;
  readonly findByName: (name: string) => Promise<RoleEntity | null>;
  readonly create: (data: Partial<RoleEntity>) => Promise<RoleEntity>;
  readonly update: (id: string, data: Partial<RoleEntity>) => Promise<void>;
  readonly delete: (id: string) => Promise<void>;
  readonly replacePermissions: (
    roleId: string,
    permissions: { resource: string; permission: string }[],
  ) => Promise<void>;
}

export const RolesRepository = Context.GenericTag<RolesRepository>(
  '@librestock/effect/RolesRepository',
);

const createRolesRepository = (
  roleRepo: Repository<RoleEntity>,
  permissionRepo: Repository<RolePermissionEntity>,
): RolesRepository => ({
  findAll: () => roleRepo.find({ order: { name: 'ASC' } }),
  findById: (id) => roleRepo.findOne({ where: { id } }),
  findByName: (name) => roleRepo.findOne({ where: { name } }),
  create: async (data) => roleRepo.save(roleRepo.create(data)),
  update: async (id, data) => {
    await roleRepo.update(id, data);
  },
  delete: async (id) => {
    await roleRepo.delete(id);
  },
  replacePermissions: async (roleId, permissions) => {
    await permissionRepo.delete({ role_id: roleId });

    if (permissions.length === 0) {
      return;
    }

    const entities = permissions.map((permission) =>
      permissionRepo.create({
        role_id: roleId,
        resource: permission.resource,
        permission: permission.permission,
      }),
    );

    await permissionRepo.save(entities);
  },
});

export const makeRolesRepository = Effect.gen(function* () {
  const dataSource = yield* TypeOrmDataSource;

  return createRolesRepository(
    dataSource.getRepository(RoleEntity),
    dataSource.getRepository(RolePermissionEntity),
  );
});
