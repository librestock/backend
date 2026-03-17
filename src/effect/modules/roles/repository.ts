import { Effect } from 'effect';
import { TypeOrmDataSource } from '../../platform/typeorm';
import { RoleEntity } from './entities/role.entity';
import { RolePermissionEntity } from './entities/role-permission.entity';
import { RolesInfrastructureError } from './roles.errors';

const tryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new RolesInfrastructureError({
        action,
        cause,
        message: `Failed to ${action}`,
      }),
  });

export class RolesRepository extends Effect.Service<RolesRepository>()(
  '@librestock/effect/RolesRepository',
  {
    effect: Effect.gen(function* () {
      const dataSource = yield* TypeOrmDataSource;
      const roleRepo = dataSource.getRepository(RoleEntity);
      const permissionRepo = dataSource.getRepository(RolePermissionEntity);

      const findAll = () =>
        tryAsync('list roles', () =>
          roleRepo.find({ order: { name: 'ASC' } }),
        );

      const findById = (id: string) =>
        tryAsync('load role', () => roleRepo.findOne({ where: { id } }));

      const findByName = (name: string) =>
        tryAsync('load role by name', () =>
          roleRepo.findOne({ where: { name } }),
        );

      const create = (data: Partial<RoleEntity>) =>
        tryAsync('create role', async () =>
          roleRepo.save(roleRepo.create(data)),
        );

      const update = (id: string, data: Partial<RoleEntity>) =>
        tryAsync('update role', async () => {
          await roleRepo.update(id, data);
        });

      const remove = (id: string) =>
        tryAsync('delete role', async () => {
          await roleRepo.delete(id);
        });

      const replacePermissions = (
        roleId: string,
        permissions: { resource: string; permission: string }[],
      ) =>
        tryAsync('replace role permissions', async () => {
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
        });

      return {
        findAll,
        findById,
        findByName,
        create,
        update,
        delete: remove,
        replacePermissions,
      };
    }),
  },
) {}
