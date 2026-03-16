import { Effect } from 'effect';
import { In } from 'typeorm';
import { TypeOrmDataSource } from '../../platform/typeorm';
import { UserRoleEntity } from './entities/user-role.entity';
import { RoleEntity } from '../roles/entities/role.entity';
import { UsersInfrastructureError } from './users.errors';

const tryAsync = <A>(action: string, run: () => Promise<A>) =>
  Effect.tryPromise({
    try: run,
    catch: (cause) =>
      new UsersInfrastructureError({
        action,
        cause,
        message: `Failed to ${action}`,
      }),
  });

export class UsersRepository extends Effect.Service<UsersRepository>()(
  '@librestock/effect/UsersRepository',
  {
    effect: Effect.gen(function* () {
      const dataSource = yield* TypeOrmDataSource;
      const userRoleRepository = dataSource.getRepository(UserRoleEntity);

      const findRoleAssignments = (userIds: string[]) =>
        tryAsync('find role assignments', () =>
          userIds.length === 0
            ? Promise.resolve([])
            : userRoleRepository.find({
                where: { user_id: In(userIds) },
                relations: ['role'],
              }),
        );

      const findUserRoles = (userId: string) =>
        tryAsync('find user roles', () =>
          userRoleRepository.find({
            where: { user_id: userId },
            relations: ['role'],
          }),
        );

      const replaceUserRoles = (userId: string, roleIds: string[]) =>
        tryAsync('replace user roles', async () => {
          await userRoleRepository.delete({ user_id: userId });

          if (roleIds.length === 0) {
            return;
          }

          const entities = roleIds.map((roleId) =>
            userRoleRepository.create({ user_id: userId, role_id: roleId }),
          );

          await userRoleRepository.save(entities);
        });

      const hasAdminRole = (roleIds: string[]) =>
        tryAsync('check admin role', async () => {
          if (roleIds.length === 0) {
            return false;
          }

          const count = await dataSource
            .getRepository(RoleEntity)
            .createQueryBuilder('r')
            .where('r.id IN (:...roleIds)', { roleIds })
            .andWhere('LOWER(r.name) = LOWER(:name)', { name: 'Admin' })
            .getCount();

          return count > 0;
        });

      const syncBetterAuthRole = (userId: string, role: 'admin' | 'user') =>
        tryAsync('sync better auth role', async () => {
          await dataSource.query(`UPDATE "user" SET role = $1 WHERE id = $2`, [
            role,
            userId,
          ]);
        });

      const deleteUserRoles = (userId: string) =>
        tryAsync('delete user roles', () =>
          userRoleRepository.delete({ user_id: userId }),
        );

      return {
        findRoleAssignments,
        findUserRoles,
        replaceUserRoles,
        hasAdminRole,
        syncBetterAuthRole,
        deleteUserRoles,
      };
    }),
  },
) {}
